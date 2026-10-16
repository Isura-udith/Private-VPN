use std::process::Command;
#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Returns current default gateway on Windows
pub fn get_default_gateway() -> Option<String> {
    #[cfg(windows)]
    {
        let mut cmd = Command::new("route");
        cmd.args(["print", "0.0.0.0"]);
        cmd.creation_flags(CREATE_NO_WINDOW);

        if let Ok(output) = cmd.output() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                // Route print row for 0.0.0.0: Network Destination, Netmask, Gateway, Interface, Metric
                if parts.len() >= 3 && parts[0] == "0.0.0.0" && parts[1] == "0.0.0.0" {
                    return Some(parts[2].to_string());
                }
            }
        }
    }
    None
}

/// Checks if basic network reachability exists by checking if a gateway is configured
pub fn check_network_reachability() -> bool {
    get_default_gateway().is_some()
}
