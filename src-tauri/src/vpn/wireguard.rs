use crate::errors::{AppError, AppResult};
use crate::vpn::configuration::WireGuardConfig;
use std::path::PathBuf;
use std::process::Command;
#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub struct WireGuardIntegration {
    executable_path: Option<PathBuf>,
}

impl WireGuardIntegration {
    pub fn new() -> Self {
        let exe = Self::locate_executable();
        Self { executable_path: exe }
    }

    /// Locates official WireGuard for Windows executable
    pub fn locate_executable() -> Option<PathBuf> {
        let candidates = [
            PathBuf::from(r"C:\Program Files\WireGuard\wireguard.exe"),
            PathBuf::from(r"C:\Program Files (x86)\WireGuard\wireguard.exe"),
        ];

        for path in &candidates {
            if path.exists() {
                return Some(path.clone());
            }
        }

        // Check PATH
        #[cfg(windows)]
        {
            let mut cmd = Command::new("where.exe");
            cmd.arg("wireguard");
            cmd.creation_flags(CREATE_NO_WINDOW);

            if let Ok(output) = cmd.output() {
                if output.status.success() {
                    let text = String::from_utf8_lossy(&output.stdout);
                    if let Some(first_line) = text.lines().next() {
                        let trimmed = first_line.trim();
                        if !trimmed.is_empty() {
                            let p = PathBuf::from(trimmed);
                            if p.exists() {
                                return Some(p);
                            }
                        }
                    }
                }
            }
        }

        None
    }

    /// Checks if WireGuard for Windows is installed
    pub fn is_installed(&self) -> bool {
        self.executable_path.is_some()
    }

    pub fn get_executable_path(&self) -> Option<String> {
        self.executable_path
            .as_ref()
            .map(|p| p.to_string_lossy().to_string())
    }

    /// Verifies if current process has Administrator permissions on Windows
    pub fn is_elevated() -> bool {
        #[cfg(windows)]
        {
            let mut cmd = Command::new("net");
            cmd.args(["session"]);
            cmd.creation_flags(CREATE_NO_WINDOW);

            match cmd.output() {
                Ok(output) => output.status.success(),
                Err(_) => false,
            }
        }
        #[cfg(not(windows))]
        {
            true
        }
    }

    /// Connects by installing the WireGuard tunnel service
    pub fn connect_tunnel(&self, tunnel_name: &str, config: &WireGuardConfig) -> AppResult<()> {
        let exe = self.executable_path.as_ref().ok_or(AppError::WireguardNotInstalled)?;

        if !Self::is_elevated() {
            return Err(AppError::PermissionDenied(
                "Windows Administrator privileges are required to create and manage the WireGuard VPN tunnel adapter. Please run Private VPN as Administrator.".into(),
            ));
        }

        // 1. Clean up any lingering previous tunnel service with the same name first
        let _ = self.disconnect_tunnel(tunnel_name);
        std::thread::sleep(std::time::Duration::from_millis(300));

        // 2. Ensure tunnels directory exists in LocalAppData
        let mut tunnel_dir = dirs_fallback_local_data();
        tunnel_dir.push("PrivateVPN");
        tunnel_dir.push("tunnels");
        let _ = std::fs::create_dir_all(&tunnel_dir);

        let conf_file_path = tunnel_dir.join(format!("{}.conf", tunnel_name));
        let conf_content = config.to_conf_content();

        // Write configuration file
        std::fs::write(&conf_file_path, conf_content).map_err(|e| {
            AppError::SystemError(format!("Failed to write tunnel configuration file: {}", e))
        })?;

        // 3. Run WireGuard install tunnel service
        #[cfg(windows)]
        {
            let mut cmd = Command::new(exe);
            cmd.args(["/installtunnelservice", &conf_file_path.to_string_lossy()]);
            cmd.creation_flags(CREATE_NO_WINDOW);

            let output = cmd.output().map_err(|e| {
                AppError::ServiceError(format!("Failed to execute wireguard.exe: {}", e))
            })?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(AppError::ServiceError(format!(
                    "Failed to start WireGuard tunnel service: {}",
                    stderr.trim()
                )));
            }
        }

        #[cfg(not(windows))]
        {
            let _ = (exe, conf_file_path);
        }

        Ok(())
    }

    /// Disconnects by uninstalling the WireGuard tunnel service
    pub fn disconnect_tunnel(&self, tunnel_name: &str) -> AppResult<()> {
        let exe = self.executable_path.as_ref().ok_or(AppError::WireguardNotInstalled)?;

        #[cfg(windows)]
        {
            let mut cmd = Command::new(exe);
            cmd.args(["/uninstalltunnelservice", tunnel_name]);
            cmd.creation_flags(CREATE_NO_WINDOW);

            let output = cmd.output().map_err(|e| {
                AppError::ServiceError(format!("Failed to execute wireguard.exe uninstall: {}", e))
            })?;

            // Also remove temporary conf file if present
            let mut tunnel_dir = dirs_fallback_local_data();
            tunnel_dir.push("PrivateVPN");
            tunnel_dir.push("tunnels");
            let conf_file_path = tunnel_dir.join(format!("{}.conf", tunnel_name));
            if conf_file_path.exists() {
                let _ = std::fs::remove_file(&conf_file_path);
            }

            if !output.status.success() {
                // If it wasn't running, it's not fatal
                let stderr = String::from_utf8_lossy(&output.stderr);
                if !stderr.contains("not found") && !stderr.contains("does not exist") {
                    return Err(AppError::ServiceError(format!(
                        "WireGuard disconnect encountered: {}",
                        stderr.trim()
                    )));
                }
            }
        }

        #[cfg(not(windows))]
        {
            let _ = (exe, tunnel_name);
        }

        Ok(())
    }

    /// Checks if the tunnel service is actively running in Windows Service Control Manager
    pub fn is_tunnel_running(&self, tunnel_name: &str) -> bool {
        #[cfg(windows)]
        {
            let service_name = format!("WireGuardTunnel${}", tunnel_name);
            let mut cmd = Command::new("sc");
            cmd.args(["query", &service_name]);
            cmd.creation_flags(CREATE_NO_WINDOW);

            if let Ok(output) = cmd.output() {
                let text = String::from_utf8_lossy(&output.stdout);
                return text.contains("STATE") && text.contains("RUNNING");
            }
            false
        }
        #[cfg(not(windows))]
        {
            let _ = tunnel_name;
            false
        }
    }

    /// Queries live transfer statistics (rx_bytes, tx_bytes) from WireGuard or network adapter
    pub fn query_tunnel_traffic(&self, tunnel_name: &str) -> Option<(u64, u64)> {
        // Try wg.exe show <tunnel_name> transfer
        let mut wg_candidates = vec![
            PathBuf::from(r"C:\Program Files\WireGuard\wg.exe"),
            PathBuf::from(r"C:\Program Files (x86)\WireGuard\wg.exe"),
        ];
        if let Some(ref p) = self.executable_path {
            if let Some(parent) = p.parent() {
                wg_candidates.push(parent.join("wg.exe"));
            }
        }

        #[cfg(windows)]
        {
            for wg_path in wg_candidates {
                if wg_path.exists() {
                    let mut cmd = Command::new(&wg_path);
                    cmd.args(["show", tunnel_name, "transfer"]);
                    cmd.creation_flags(CREATE_NO_WINDOW);
                    if let Ok(output) = cmd.output() {
                        if output.status.success() {
                            let stdout = String::from_utf8_lossy(&output.stdout);
                            for line in stdout.lines() {
                                let parts: Vec<&str> = line.split_whitespace().collect();
                                if parts.len() >= 3 {
                                    if let (Ok(rx), Ok(tx)) = (parts[1].parse::<u64>(), parts[2].parse::<u64>()) {
                                        return Some((rx, tx));
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Fallback: netsh interface ipv4 show subinterfaces "<tunnel_name>"
            let mut cmd = Command::new("netsh");
            cmd.args(["interface", "ipv4", "show", "subinterfaces", tunnel_name]);
            cmd.creation_flags(CREATE_NO_WINDOW);
            if let Ok(output) = cmd.output() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 5 {
                        if let (Ok(bytes_in), Ok(bytes_out)) = (parts[2].parse::<u64>(), parts[3].parse::<u64>()) {
                            return Some((bytes_in, bytes_out));
                        }
                    }
                }
            }
        }

        #[cfg(not(windows))]
        {
            let _ = tunnel_name;
        }

        None
    }
}

fn dirs_fallback_local_data() -> PathBuf {
    if let Ok(val) = std::env::var("LOCALAPPDATA") {
        PathBuf::from(val)
    } else {
        std::env::temp_dir()
    }
}
