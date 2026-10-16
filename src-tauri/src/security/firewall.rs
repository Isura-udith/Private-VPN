use crate::errors::{AppError, AppResult};
use std::process::Command;
#[cfg(windows)]
use std::os::windows::process::CommandExt;

const RULE_PREFIX: &str = "PrivateVPN-KillSwitch";
const BLOCK_ALL_RULE: &str = "PrivateVPN-KillSwitch-BlockAll";
const ALLOW_LOCAL_RULE: &str = "PrivateVPN-KillSwitch-AllowLocal";
const ALLOW_ENDPOINT_RULE: &str = "PrivateVPN-KillSwitch-AllowEndpoint";
const ALLOW_DNS_RULE: &str = "PrivateVPN-KillSwitch-AllowDNS";
const ALLOW_DNS_TCP_RULE: &str = "PrivateVPN-KillSwitch-AllowDNSTCP";
const BLOCK_IPV6_RULE: &str = "PrivateVPN-KillSwitch-BlockIPv6";

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Executes a netsh command safely
fn run_netsh(args: &[&str]) -> AppResult<String> {
    let mut cmd = Command::new("netsh");
    cmd.args(args);

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().map_err(|e| {
        AppError::FirewallError(format!("Failed to execute netsh: {}", e))
    })?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        return Err(AppError::FirewallError(format!(
            "netsh failed with exit code {}: {}",
            output.status.code().unwrap_or(-1),
            stderr.trim()
        )));
    }

    Ok(stdout)
}

/// Resolves a hostname or IP to a valid IP string for Windows Firewall
fn resolve_endpoint_ip(host_or_ip: &str, port: u16) -> Option<String> {
    use std::net::ToSocketAddrs;
    if host_or_ip.parse::<std::net::IpAddr>().is_ok() {
        return Some(host_or_ip.to_string());
    }
    let addr_str = format!("{}:{}", host_or_ip, port);
    if let Ok(mut addrs) = addr_str.to_socket_addrs() {
        if let Some(addr) = addrs.next() {
            return Some(addr.ip().to_string());
        }
    }
    None
}

/// Checks if the killswitch block rule is currently active in Windows Firewall
pub fn is_kill_switch_active() -> bool {
    #[cfg(windows)]
    {
        let mut cmd = Command::new("netsh");
        cmd.args(["advfirewall", "firewall", "show", "rule", &format!("name={}", BLOCK_ALL_RULE)]);
        cmd.creation_flags(CREATE_NO_WINDOW);

        if let Ok(output) = cmd.output() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            return stdout.contains(BLOCK_ALL_RULE) && stdout.contains("Enabled:  Yes");
        }
        false
    }
    #[cfg(not(windows))]
    {
        false
    }
}

/// Enables the Windows Firewall Kill Switch
/// Blocks all outbound traffic except local network, DNS port 53, and authorized VPN endpoint traffic
pub fn enable_kill_switch(remote_endpoint_ip: Option<&str>, remote_port: Option<u16>) -> AppResult<()> {
    #[cfg(windows)]
    {
        // 1. Clean up any existing rules first to avoid duplication
        let _ = disable_kill_switch();

        // 2. Allow local loopback and private subnets so local device communication is preserved
        run_netsh(&[
            "advfirewall",
            "firewall",
            "add",
            "rule",
            &format!("name={}", ALLOW_LOCAL_RULE),
            "dir=out",
            "action=allow",
            "remoteip=127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16",
            "enable=yes",
        ])?;

        // 3. Allow DNS resolution (port 53 UDP & TCP) so domain names and verification endpoints resolve
        run_netsh(&[
            "advfirewall",
            "firewall",
            "add",
            "rule",
            &format!("name={}", ALLOW_DNS_RULE),
            "dir=out",
            "action=allow",
            "protocol=UDP",
            "remoteport=53",
            "enable=yes",
        ])?;

        run_netsh(&[
            "advfirewall",
            "firewall",
            "add",
            "rule",
            &format!("name={}", ALLOW_DNS_TCP_RULE),
            "dir=out",
            "action=allow",
            "protocol=TCP",
            "remoteport=53",
            "enable=yes",
        ])?;

        // 4. Allow outbound handshake traffic to the specific VPN server endpoint
        if let Some(port) = remote_port {
            let port_str = port.to_string();
            let resolved = remote_endpoint_ip.and_then(|h| resolve_endpoint_ip(h, port));

            if let Some(ref ip) = resolved {
                run_netsh(&[
                    "advfirewall",
                    "firewall",
                    "add",
                    "rule",
                    &format!("name={}", ALLOW_ENDPOINT_RULE),
                    "dir=out",
                    "action=allow",
                    "protocol=UDP",
                    &format!("remoteport={}", port_str),
                    &format!("remoteip={}", ip),
                    "enable=yes",
                ])?;
            } else {
                run_netsh(&[
                    "advfirewall",
                    "firewall",
                    "add",
                    "rule",
                    &format!("name={}", ALLOW_ENDPOINT_RULE),
                    "dir=out",
                    "action=allow",
                    "protocol=UDP",
                    &format!("remoteport={}", port_str),
                    "enable=yes",
                ])?;
            }
        }

        // 5. Block general outbound internet traffic
        run_netsh(&[
            "advfirewall",
            "firewall",
            "add",
            "rule",
            &format!("name={}", BLOCK_ALL_RULE),
            "dir=out",
            "action=block",
            "enable=yes",
        ])?;

        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = (remote_endpoint_ip, remote_port);
        Ok(())
    }
}

/// Disables the Windows Firewall Kill Switch safely
pub fn disable_kill_switch() -> AppResult<()> {
    #[cfg(windows)]
    {
        // Delete block all rule
        let _ = run_netsh(&[
            "advfirewall",
            "firewall",
            "delete",
            "rule",
            &format!("name={}", BLOCK_ALL_RULE),
        ]);

        // Delete allow local rule
        let _ = run_netsh(&[
            "advfirewall",
            "firewall",
            "delete",
            "rule",
            &format!("name={}", ALLOW_LOCAL_RULE),
        ]);

        // Delete DNS rules
        let _ = run_netsh(&[
            "advfirewall",
            "firewall",
            "delete",
            "rule",
            &format!("name={}", ALLOW_DNS_RULE),
        ]);

        let _ = run_netsh(&[
            "advfirewall",
            "firewall",
            "delete",
            "rule",
            &format!("name={}", ALLOW_DNS_TCP_RULE),
        ]);

        // Delete endpoint rule
        let _ = run_netsh(&[
            "advfirewall",
            "firewall",
            "delete",
            "rule",
            &format!("name={}", ALLOW_ENDPOINT_RULE),
        ]);

        Ok(())
    }
    #[cfg(not(windows))]
    {
        Ok(())
    }
}

/// Enforces IPv6 leak protection by blocking outbound IPv6 if configured
pub fn set_ipv6_protection(block: bool) -> AppResult<()> {
    #[cfg(windows)]
    {
        // First remove any existing rule
        let _ = run_netsh(&[
            "advfirewall",
            "firewall",
            "delete",
            "rule",
            &format!("name={}", BLOCK_IPV6_RULE),
        ]);

        if block {
            run_netsh(&[
                "advfirewall",
                "firewall",
                "add",
                "rule",
                &format!("name={}", BLOCK_IPV6_RULE),
                "dir=out",
                "action=block",
                "protocol=IPv6",
                "enable=yes",
            ])?;
        }

        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = block;
        Ok(())
    }
}

/// Emergency reset function - removes all PrivateVPN rules to guarantee user connectivity recovery
pub fn emergency_reset_firewall() -> AppResult<()> {
    #[cfg(windows)]
    {
        let _ = disable_kill_switch();
        let _ = set_ipv6_protection(false);

        // Delete anything matching the prefix
        let _ = run_netsh(&[
            "advfirewall",
            "firewall",
            "delete",
            "rule",
            &format!("name={}", RULE_PREFIX),
        ]);

        Ok(())
    }
    #[cfg(not(windows))]
    {
        Ok(())
    }
}
