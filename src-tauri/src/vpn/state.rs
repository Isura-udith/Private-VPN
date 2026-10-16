use crate::errors::{AppError, AppResult};
use crate::network::ip_check::{IpCheckResult, IpChecker};
use crate::security::firewall;
use crate::storage::database::{Database, ServerRecord, SessionRecord};
use crate::vpn::configuration::WireGuardConfig;
use crate::vpn::statistics::StatsTracker;
use crate::vpn::wireguard::WireGuardIntegration;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::Duration;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ConnectionStatus {
    Disconnected,
    Connecting,
    Connected,
    Reconnecting,
    Disconnecting,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticLogEntry {
    pub timestamp: String,
    pub level: String, // "info", "warn", "error"
    pub message: String,
}

pub struct VpnManager {
    pub state: Mutex<ConnectionStatus>,
    pub current_server: Mutex<Option<ServerRecord>>,
    pub active_tunnel_name: Mutex<Option<String>>,
    pub ip_info: Mutex<IpCheckResult>,
    pub stats: Mutex<StatsTracker>,
    pub last_error: Mutex<Option<String>>,
    pub logs: Mutex<Vec<DiagnosticLogEntry>>,
    pub wg: WireGuardIntegration,
    pub ip_checker: IpChecker,
    pub db: Database,
}

impl VpnManager {
    pub fn new(db: Database) -> Self {
        Self {
            state: Mutex::new(ConnectionStatus::Disconnected),
            current_server: Mutex::new(None),
            active_tunnel_name: Mutex::new(None),
            ip_info: Mutex::new(IpCheckResult::default()),
            stats: Mutex::new(StatsTracker::new()),
            last_error: Mutex::new(None),
            logs: Mutex::new(Vec::new()),
            wg: WireGuardIntegration::new(),
            ip_checker: IpChecker::new(),
            db,
        }
    }

    pub fn add_log(&self, level: &str, message: &str) {
        let entry = DiagnosticLogEntry {
            timestamp: Utc::now().to_rfc3339(),
            level: level.to_string(),
            message: message.to_string(),
        };
        let mut logs = self.logs.lock().unwrap();
        logs.push(entry);
        if logs.len() > 100 {
            logs.remove(0);
        }
    }

    pub fn get_status(&self) -> (ConnectionStatus, Option<ServerRecord>, Option<String>, Option<String>) {
        let state = self.state.lock().unwrap().clone();
        let server = self.current_server.lock().unwrap().clone();
        let tunnel = self.active_tunnel_name.lock().unwrap().clone();
        let err = self.last_error.lock().unwrap().clone();
        (state, server, tunnel, err)
    }

    /// Primary VPN connection procedure with full verification lifecycle
    pub async fn connect(&self, server_id: &str) -> AppResult<()> {
        // 1. Guard against state conflict / duplicate transitions
        {
            let mut state = self.state.lock().unwrap();
            match *state {
                ConnectionStatus::Connecting => {
                    return Err(AppError::StateConflict("Connection attempt already in progress".into()))
                }
                ConnectionStatus::Connected => {
                    return Err(AppError::StateConflict("VPN is already connected. Disconnect first.".into()))
                }
                ConnectionStatus::Disconnecting => {
                    return Err(AppError::StateConflict("VPN is currently disconnecting. Please wait.".into()))
                }
                _ => {
                    *state = ConnectionStatus::Connecting;
                }
            }
        }
        *self.last_error.lock().unwrap() = None;

        self.add_log("info", &format!("Initiating connection sequence for server: {}", server_id));

        // 2. Fetch server and validate
        let server = match self.db.get_server(server_id) {
            Ok(s) => s,
            Err(e) => {
                *self.state.lock().unwrap() = ConnectionStatus::Error;
                *self.last_error.lock().unwrap() = Some(e.to_string());
                self.add_log("error", &format!("Server fetch failed: {}", e));
                return Err(e);
            }
        };

        // 3. Verify WireGuard installation
        if !self.wg.is_installed() {
            *self.state.lock().unwrap() = ConnectionStatus::Error;
            let msg = "Official WireGuard for Windows is not installed. Please install it using 'winget install WireGuard.WireGuard' or from wireguard.com.".to_string();
            *self.last_error.lock().unwrap() = Some(msg.clone());
            self.add_log("error", &msg);
            return Err(AppError::WireguardNotInstalled);
        }

        // 4. Verify Administrative privileges
        if !WireGuardIntegration::is_elevated() {
            *self.state.lock().unwrap() = ConnectionStatus::Error;
            let msg = "Windows Administrator privileges are required to configure the VPN network tunnel. Please restart Private VPN as Administrator.".to_string();
            *self.last_error.lock().unwrap() = Some(msg.clone());
            self.add_log("error", &msg);
            return Err(AppError::PermissionDenied(msg));
        }

        // 5. Retrieve client private key (from DPAPI storage)
        let private_key = match self.db.get_server_private_key(server_id) {
            Ok(Some(k)) => k,
            _ => {
                *self.state.lock().unwrap() = ConnectionStatus::Error;
                let msg = "No private key is configured for this server. Please import a complete WireGuard configuration.".to_string();
                *self.last_error.lock().unwrap() = Some(msg.clone());
                self.add_log("error", &msg);
                return Err(AppError::InvalidConfiguration(msg));
            }
        };

        // Guard against connecting to demo/placeholder templates which cannot route real internet
        if crate::security::validation::is_demo_or_placeholder_endpoint(&server.endpoint, Some(&private_key)) {
            *self.state.lock().unwrap() = ConnectionStatus::Error;
            let msg = format!(
                "\"{}\" is an inactive sample demo profile ({}). Connecting to it will not route internet. Please go to Locations and click 'Import WireGuard Config' to add your real WireGuard profile.",
                server.name, server.endpoint
            );
            *self.last_error.lock().unwrap() = Some(msg.clone());
            self.add_log("error", &msg);
            return Err(AppError::InvalidConfiguration(msg));
        }

        // 6. Record pre-connection public IP
        self.add_log("info", "Querying pre-connection public IP address...");
        let pre_ip_result = self.ip_checker.fetch_current_ip(None).await;
        let original_ip = match pre_ip_result {
            Ok((ip, _, _, _)) => {
                self.add_log("info", &format!("Original public IP captured: {}", ip));
                Some(ip)
            }
            Err(e) => {
                self.add_log("warn", &format!("Could not capture original IP: {}", e));
                None
            }
        };

        // 7. Assemble WireGuard config
        let preshared_key = self.db.get_server_preshared_key(server_id).unwrap_or(None);
        let address = server.address.clone().unwrap_or_else(|| "10.14.0.2/32".into());
        let wg_config = WireGuardConfig {
            client_private_key: private_key,
            address,
            dns: server.dns.clone(),
            peer_public_key: server.public_key.clone(),
            endpoint: server.endpoint.clone(),
            allowed_ips: server.allowed_ips.clone(),
            preshared_key,
        };

        let tunnel_name = "PrivateVPNTunnel";

        // 8. Establish tunnel
        self.add_log("info", "Installing and activating WireGuard tunnel service...");
        if let Err(e) = self.wg.connect_tunnel(tunnel_name, &wg_config) {
            *self.state.lock().unwrap() = ConnectionStatus::Error;
            *self.last_error.lock().unwrap() = Some(e.to_string());
            self.add_log("error", &format!("Tunnel service activation failed: {}", e));
            return Err(e);
        }

        // 9. Wait for tunnel to come online (with timeout)
        let mut tunnel_ready = false;
        for _ in 0..15 {
            tokio::time::sleep(Duration::from_millis(500)).await;
            if self.wg.is_tunnel_running(tunnel_name) {
                tunnel_ready = true;
                break;
            }
        }

        if !tunnel_ready {
            let _ = self.wg.disconnect_tunnel(tunnel_name);
            let _ = firewall::emergency_reset_firewall();
            *self.state.lock().unwrap() = ConnectionStatus::Error;
            let msg = "WireGuard tunnel service failed to enter running state within timeout".to_string();
            *self.last_error.lock().unwrap() = Some(msg.clone());
            self.add_log("error", &msg);
            return Err(AppError::ConnectionTimeout(8));
        }

        // 10. Optional Kill switch activation if enabled in settings
        let settings = self.db.get_settings().unwrap_or_default();
        if settings.kill_switch
            && let Ok((host, port)) = crate::security::validation::validate_endpoint(&server.endpoint)
        {
            let _ = firewall::enable_kill_switch(Some(&host), Some(port));
            self.add_log("info", "Windows Firewall Kill Switch activated.");
        }

        if settings.block_ipv6 {
            let _ = firewall::set_ipv6_protection(true);
        }

        // 11. Verify new public IP address with automatic handshake fail-safe
        self.add_log("info", "Verifying tunnel connectivity and public IP...");
        let mut verified = false;
        let mut post_ip_result = Err(AppError::IpVerificationFailed("Pending".into()));
        let mut ip_info = IpCheckResult {
            original_ip: original_ip.clone(),
            ..Default::default()
        };

        // Perform up to 3 verification attempts
        for attempt in 1..=3 {
            tokio::time::sleep(Duration::from_millis(1500)).await;
            post_ip_result = self.ip_checker.fetch_current_ip(None).await;
            if post_ip_result.is_ok() {
                verified = true;
                break;
            }
            self.add_log("warn", &format!("Handshake/IP check attempt {}/3 in progress...", attempt));
        }

        match post_ip_result {
            Ok((new_ip, country, city, isp)) => {
                let is_diff = match (&original_ip, &new_ip) {
                    (Some(orig), new) => orig != new,
                    _ => false,
                };
                ip_info.current_ip = Some(new_ip.clone());
                ip_info.is_different = is_diff;
                ip_info.country = country;
                ip_info.city = city;
                ip_info.isp = isp;
                ip_info.status = "verified".into();
                ip_info.verified_at = Some(Utc::now().to_rfc3339());
                self.add_log("info", &format!("IP verification successful. New IP: {}", new_ip));
            }
            Err(e) => {
                // If IP verification failed, check whether WireGuard received any bytes
                let traffic = self.wg.query_tunnel_traffic(tunnel_name);
                let rx_bytes = traffic.map(|(rx, _)| rx).unwrap_or(0);

                if !verified && rx_bytes == 0 {
                    // FAIL-SAFE ACTIVATED: Server did not respond to handshake. Disconnect tunnel to prevent blackholing user internet.
                    self.add_log("error", "Remote WireGuard endpoint did not respond to handshake. Triggering auto-disconnect fail-safe to restore internet access.");
                    let _ = self.wg.disconnect_tunnel(tunnel_name);
                    let _ = firewall::emergency_reset_firewall();
                    *self.state.lock().unwrap() = ConnectionStatus::Error;
                    let msg = format!(
                        "Connection failed: WireGuard server at {} did not respond to the handshake. Tunnel was disconnected automatically to keep your internet working. Check your server address and credentials.",
                        server.endpoint
                    );
                    *self.last_error.lock().unwrap() = Some(msg.clone());
                    return Err(AppError::ServiceError(msg));
                }

                ip_info.status = "unverified".into();
                ip_info.error_message = Some(e.to_string());
                self.add_log("warn", &format!("IP verification inconclusive: {}", e));
            }
        }

        *self.ip_info.lock().unwrap() = ip_info;
        *self.current_server.lock().unwrap() = Some(server.clone());
        *self.active_tunnel_name.lock().unwrap() = Some(tunnel_name.to_string());
        self.stats.lock().unwrap().start_session();
        *self.state.lock().unwrap() = ConnectionStatus::Connected;

        let _ = self.db.update_server_last_used(server_id);
        self.add_log("info", "VPN tunnel fully active and secured.");

        Ok(())
    }

    /// Safe disconnect sequence with resource and firewall cleanup
    pub async fn disconnect(&self) -> AppResult<()> {
        {
            let mut state = self.state.lock().unwrap();
            match *state {
                ConnectionStatus::Disconnected => return Ok(()),
                ConnectionStatus::Disconnecting => return Ok(()),
                _ => {
                    *state = ConnectionStatus::Disconnecting;
                }
            }
        }

        self.add_log("info", "Initiating graceful VPN disconnect...");

        // 1. Reset firewall / kill switch rules so internet is restored
        let _ = firewall::emergency_reset_firewall();
        self.add_log("info", "Firewall rules restored.");

        // 2. Disconnect tunnel service
        let tunnel_name = self.active_tunnel_name.lock().unwrap().clone();
        if let Some(ref name) = tunnel_name {
            let _ = self.wg.disconnect_tunnel(name);
            self.add_log("info", "WireGuard tunnel service stopped and removed.");
        }

        let server = self.current_server.lock().unwrap().clone();
        let (stats, start_time_utc) = {
            let tracker = self.stats.lock().unwrap();
            let s = tracker.get_current_stats();
            let start = tracker
                .get_session_start_utc()
                .unwrap_or_else(|| Utc::now() - chrono::Duration::seconds(s.session_duration_secs as i64))
                .to_rfc3339();
            (s, start)
        };
        let settings = self.db.get_settings().unwrap_or_default();

        if settings.record_session_history
            && let Some(s) = server
        {
            let session = SessionRecord {
                id: Uuid::new_v4().to_string(),
                server_id: s.id,
                server_name: s.name,
                start_time: start_time_utc,
                end_time: Some(Utc::now().to_rfc3339()),
                bytes_uploaded: stats.total_uploaded,
                bytes_downloaded: stats.total_downloaded,
                duration_seconds: stats.session_duration_secs,
                disconnected_reason: Some("User requested disconnect".into()),
            };
            let _ = self.db.add_session(&session);
        }

        // 4. Reset state
        self.stats.lock().unwrap().stop_session();
        *self.current_server.lock().unwrap() = None;
        *self.active_tunnel_name.lock().unwrap() = None;
        *self.state.lock().unwrap() = ConnectionStatus::Disconnected;
        self.add_log("info", "Disconnected.");

        Ok(())
    }
}
