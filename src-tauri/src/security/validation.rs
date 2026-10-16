use crate::errors::{AppError, AppResult};
use regex::Regex;
use std::sync::LazyLock;

static B64_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[A-Za-z0-9+/]{43}=$").expect("valid b64 regex"));

static PRIV_KEY_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)(PrivateKey\s*=\s*)([A-Za-z0-9+/=]+)").expect("valid priv regex"));

static PSK_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)(PresharedKey\s*=\s*)([A-Za-z0-9+/=]+)").expect("valid psk regex"));

/// Validates that a string does not contain carriage return or newline characters (prevents INI injection)
pub fn validate_no_crlf(val: &str, field_name: &str) -> AppResult<()> {
    if val.contains('\r') || val.contains('\n') {
        return Err(AppError::InvalidConfiguration(format!(
            "{} contains illegal line break characters",
            field_name
        )));
    }
    Ok(())
}

/// Sanitizes and validates a tunnel interface name for Windows service & filesystem security
pub fn validate_tunnel_name(name: &str) -> AppResult<String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidConfiguration("Tunnel name cannot be empty".into()));
    }
    if trimmed.len() > 32 {
        return Err(AppError::InvalidConfiguration(
            "Tunnel name must be at most 32 characters".into(),
        ));
    }
    // Only allow alphanumeric, underscore, and hyphen (no path traversal dots or slashes)
    if !trimmed.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-') {
        return Err(AppError::InvalidConfiguration(
            "Tunnel name may only contain alphanumeric characters, hyphens, and underscores".into(),
        ));
    }
    Ok(trimmed.to_string())
}

/// Validates that an endpoint or API URL is a valid, secure HTTPS URL
pub fn validate_https_url(url: &str) -> AppResult<()> {
    let trimmed = url.trim();
    validate_no_crlf(trimmed, "URL")?;
    if !trimmed.starts_with("https://") {
        return Err(AppError::InvalidConfiguration(
            "API endpoint must use secure HTTPS protocol (https://)".into(),
        ));
    }
    if trimmed.contains(' ') || trimmed.contains('\t') {
        return Err(AppError::InvalidConfiguration(
            "URL cannot contain whitespace".into(),
        ));
    }
    Ok(())
}

/// Validates base64 32-byte curve25519 key (WireGuard keys are 44 characters base64 ending in '=')
pub fn validate_wireguard_key(key: &str) -> AppResult<()> {
    let trimmed = key.trim();
    validate_no_crlf(trimmed, "WireGuard key")?;
    if trimmed.len() != 44 {
        return Err(AppError::InvalidConfiguration(format!(
            "WireGuard key must be 44 characters long (got {})",
            trimmed.len()
        )));
    }

    if !B64_REGEX.is_match(trimmed) {
        return Err(AppError::InvalidConfiguration(
            "WireGuard key must be valid standard base64 format".into(),
        ));
    }

    Ok(())
}

/// Validates endpoint string (host:port or IP:port)
pub fn validate_endpoint(endpoint: &str) -> AppResult<(String, u16)> {
    let trimmed = endpoint.trim();
    validate_no_crlf(trimmed, "Endpoint")?;
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

    // Host should not contain command separators, quotes or control characters
    if host_str.chars().any(|c| c.is_control() || c == ';' || c == '&' || c == '|' || c == '"' || c == '\'' || c == '`') {
        return Err(AppError::InvalidConfiguration(
            "Endpoint host contains illegal characters".into(),
        ));
    }

    Ok((host_str.to_string(), port))
}

/// Validates allowed IPs format (e.g. 0.0.0.0/0, ::/0 or 10.0.0.2/32)
pub fn validate_allowed_ips(allowed_ips: &str) -> AppResult<()> {
    validate_no_crlf(allowed_ips, "AllowedIPs")?;
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
    let step1 = PRIV_KEY_REGEX.replace_all(text, "$1[REDACTED_PRIVATE_KEY]");
    let step2 = PSK_REGEX.replace_all(&step1, "$1[REDACTED_PRESHARED_KEY]");
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
        assert!(validate_endpoint("malicious.com;whoami:51820").is_err());
        assert!(validate_endpoint("bad\nhost:51820").is_err());
    }

    #[test]
    fn test_tunnel_name_validation() {
        assert!(validate_tunnel_name("PrivateVPNTunnel").is_ok());
        assert!(validate_tunnel_name("wg_tunnel-01").is_ok());
        assert!(validate_tunnel_name("../evil_tunnel").is_err());
        assert!(validate_tunnel_name("tunnel name with spaces").is_err());
        assert!(validate_tunnel_name("").is_err());
    }

    #[test]
    fn test_https_url_validation() {
        assert!(validate_https_url("https://api64.ipify.org?format=json").is_ok());
        assert!(validate_https_url("http://insecure.org").is_err());
        assert!(validate_https_url("file:///etc/passwd").is_err());
    }

    #[test]
    fn test_redaction() {
        let conf = "PrivateKey = aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=\nAddress = 10.0.0.2/32";
        let redacted = redact_sensitive_text(conf);
        assert!(!redacted.contains("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa="));
        assert!(redacted.contains("[REDACTED_PRIVATE_KEY]"));
    }
}
