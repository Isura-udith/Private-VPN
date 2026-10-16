use crate::errors::{AppError, AppResult};
use crate::security::validation::{validate_allowed_ips, validate_endpoint, validate_wireguard_key};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq)]
pub struct WireGuardConfig {
    pub client_private_key: String,
    pub address: String,
    pub dns: Option<String>,
    pub peer_public_key: String,
    pub endpoint: String,
    pub allowed_ips: String,
    pub preshared_key: Option<String>,
}

impl WireGuardConfig {
    /// Parses a standard WireGuard .conf file
    pub fn parse(content: &str) -> AppResult<Self> {
        let mut current_section = String::new();
        let mut interface_map: HashMap<String, String> = HashMap::new();
        let mut peer_map: HashMap<String, String> = HashMap::new();

        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with(';') {
                continue;
            }

            if trimmed.starts_with('[') && trimmed.ends_with(']') {
                current_section = trimmed[1..trimmed.len() - 1].to_ascii_lowercase();
                continue;
            }

            if let Some((key, val)) = trimmed.split_once('=') {
                let k = key.trim().to_ascii_lowercase();
                let v = val.trim().to_string();

                match current_section.as_str() {
                    "interface" => {
                        interface_map.insert(k, v);
                    }
                    "peer" => {
                        peer_map.insert(k, v);
                    }
                    _ => {}
                }
            }
        }

        let client_private_key = interface_map
            .get("privatekey")
            .ok_or_else(|| AppError::InvalidConfiguration("Missing PrivateKey in [Interface]".into()))?
            .clone();

        validate_wireguard_key(&client_private_key)?;

        let address = interface_map
            .get("address")
            .cloned()
            .unwrap_or_else(|| "10.0.0.2/32".into());

        let dns = interface_map.get("dns").cloned();

        let peer_public_key = peer_map
            .get("publickey")
            .ok_or_else(|| AppError::InvalidConfiguration("Missing PublicKey in [Peer]".into()))?
            .clone();

        validate_wireguard_key(&peer_public_key)?;

        let endpoint = peer_map
            .get("endpoint")
            .ok_or_else(|| AppError::InvalidConfiguration("Missing Endpoint in [Peer]".into()))?
            .clone();

        validate_endpoint(&endpoint)?;

        let allowed_ips = peer_map
            .get("allowedips")
            .cloned()
            .unwrap_or_else(|| "0.0.0.0/0, ::/0".into());

        validate_allowed_ips(&allowed_ips)?;

        let preshared_key = peer_map.get("presharedkey").cloned();
        if let Some(ref psk) = preshared_key {
            validate_wireguard_key(psk)?;
        }

        Ok(WireGuardConfig {
            client_private_key,
            address,
            dns,
            peer_public_key,
            endpoint,
            allowed_ips,
            preshared_key,
        })
    }

    /// Serializes configuration into valid WireGuard INI format
    pub fn to_conf_content(&self) -> String {
        let mut out = String::new();
        out.push_str("[Interface]\n");
        out.push_str(&format!("PrivateKey = {}\n", self.client_private_key));
        out.push_str(&format!("Address = {}\n", self.address));
        if let Some(ref dns) = self.dns {
            out.push_str(&format!("DNS = {}\n", dns));
        }

        out.push_str("\n[Peer]\n");
        out.push_str(&format!("PublicKey = {}\n", self.peer_public_key));
        out.push_str(&format!("Endpoint = {}\n", self.endpoint));
        out.push_str(&format!("AllowedIPs = {}\n", self.allowed_ips));
        if let Some(ref psk) = self.preshared_key {
            out.push_str(&format!("PresharedKey = {}\n", psk));
        }

        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_valid_wireguard_conf() {
        let conf_str = "
[Interface]
PrivateKey = AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
Address = 10.14.0.2/16
DNS = 1.1.1.1

[Peer]
PublicKey = BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=
Endpoint = 198.51.100.1:51820
AllowedIPs = 0.0.0.0/0
";
        let parsed = WireGuardConfig::parse(conf_str).expect("Should parse successfully");
        assert_eq!(parsed.client_private_key, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
        assert_eq!(parsed.peer_public_key, "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=");
        assert_eq!(parsed.endpoint, "198.51.100.1:51820");
        assert_eq!(parsed.dns, Some("1.1.1.1".into()));
    }
}
