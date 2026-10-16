use std::process::Command;
#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Retrieves list of currently active DNS server addresses on Windows
pub fn get_active_dns_servers() -> Vec<String> {
    let mut servers = Vec::new();

    #[cfg(windows)]
    {
        let mut cmd = Command::new("netsh");
        cmd.args(["interface", "ip", "show", "dns"]);
        cmd.creation_flags(CREATE_NO_WINDOW);

        if let Ok(output) = cmd.output() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let trimmed = line.trim();
                // Looking for lines like "DNS servers configured through DHCP:  192.168.1.1" or "Statically Configured DNS Servers:  1.1.1.1"
                if trimmed.contains(':') && (trimmed.contains("DNS servers") || trimmed.contains("Statically Configured")) {
                    if let Some(ip_part) = trimmed.split(':').nth(1) {
                        let ip = ip_part.trim();
                        if !ip.is_empty() && ip.chars().any(|c| c.is_ascii_digit()) && !servers.contains(&ip.to_string()) {
                            servers.push(ip.to_string());
                        }
                    }
                } else if !trimmed.is_empty() && trimmed.chars().all(|c| c.is_ascii_digit() || c == '.' || c == ':') {
                    if !servers.contains(&trimmed.to_string()) {
                        servers.push(trimmed.to_string());
                    }
                }
            }
        }
    }

    if servers.is_empty() {
        servers.push("System Default".into());
    }

    servers
}
