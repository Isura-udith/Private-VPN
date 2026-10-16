use crate::errors::{AppError, AppResult};
use regex::Regex;

/// Validates base64 32-byte curve25519 key (WireGuard keys are 44 characters base64 ending in '=')
pub fn validate_wireguard_key(key: &str) -> AppResult<()> {
    let trimmed = key.trim();
    if trimmed.len() != 44 {
        return Err(AppError::InvalidConfiguration(format!(
            "WireGuard key must be 44 characters long (got {})",
            trimmed.len()
        )));
    }

    let b64_regex = Regex::new(r"^[A-Za-z0-9+/]{43}=$").unwrap();
    if !b64_regex.is_match(trimmed) {
        return Err(AppError::InvalidConfiguration(
            "WireGuard key must be valid standard base64 format".into(),
        ));
    }

    Ok(())
}

/// Validates endpoint string (host:port or IP:port)
pub fn validate_endpoint(endpoint: &str) -> AppResult<(String, u16)> {
    let trimmed = endpoint.trim();
    let parts: Vec<&str> = trimmed.rsplitn(2, ':').collect();
    if parts.len() != 2 {
        return Err(AppError::InvalidConfiguration(
            "Endpoint must be in format host:port".into(),
        ));
    }

    let port_str = parts[0];
    let host_str = parts[1];

    let port: u16 = port_str.parse().map_err(|_| {
        AppError::InvalidConfiguration(format!("Invalid port number: {}", port_str))
    })?;

    if port == 0 {
        return Err(AppError::InvalidConfiguration(
            "Port number cannot be 0".into(),
        ));
    }

    if host_str.is_empty() {
        return Err(AppError::InvalidConfiguration(
            "Endpoint host cannot be empty".into(),
        ));
    }

    Ok((host_str.to_string(), port))
}

/// Validates allowed IPs format (e.g. 0.0.0.0/0, ::/0 or 10.0.0.2/32)
pub fn validate_allowed_ips(allowed_ips: &str) -> AppResult<()> {
    let items = allowed_ips.split(',');
    for item in items {
        let trimmed = item.trim();
        if trimmed.is_empty() {
            continue;
        }
        if !trimmed.contains('/') {
            return Err(AppError::InvalidConfiguration(format!(
                "AllowedIPs must be in CIDR notation (e.g. 0.0.0.0/0), got: {}",
                trimmed
            )));
        }
    }
    Ok(())
}

/// Redacts sensitive keys (PrivateKey, PresharedKey) from configuration text or logs
pub fn redact_sensitive_text(text: &str) -> String {
    let priv_re = Regex::new(r"(?i)(PrivateKey\s*=\s*)([A-Za-z0-9+/=]+)").unwrap();
    let psk_re = Regex::new(r"(?i)(PresharedKey\s*=\s*)([A-Za-z0-9+/=]+)").unwrap();

    let step1 = priv_re.replace_all(text, "$1[REDACTED_PRIVATE_KEY]");
    let step2 = psk_re.replace_all(&step1, "$1[REDACTED_PRESHARED_KEY]");
    step2.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_key() {
        let key = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
        assert_eq!(key.len(), 44);
        assert!(validate_wireguard_key(key).is_ok());
    }

    #[test]
    fn test_invalid_key_length() {
        assert!(validate_wireguard_key("short").is_err());
    }

    #[test]
    fn test_endpoint_validation() {
        assert!(validate_endpoint("vpn.example.com:51820").is_ok());
        assert!(validate_endpoint("192.168.1.1:51820").is_ok());
        assert!(validate_endpoint("invalid_endpoint").is_err());
    }

    #[test]
    fn test_redaction() {
        let conf = "PrivateKey = aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=\nAddress = 10.0.0.2/32";
        let redacted = redact_sensitive_text(conf);
        assert!(!redacted.contains("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa="));
        assert!(redacted.contains("[REDACTED_PRIVATE_KEY]"));
    }
}
