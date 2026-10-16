use private_vpn_lib::security::validation::{
    redact_sensitive_text, validate_allowed_ips, validate_endpoint, validate_wireguard_key,
};
use private_vpn_lib::storage::database::{Database, ServerRecord, SessionRecord};
use private_vpn_lib::vpn::configuration::WireGuardConfig;

#[test]
fn test_database_server_crud_and_encryption() {
    let db = Database::new_in_memory().expect("in-memory db initialization");

    let server = ServerRecord {
        id: "srv-test-1".into(),
        name: "Zurich Secure Node".into(),
        country: "Switzerland".into(),
        city: "Zurich".into(),
        country_code: "CH".into(),
        endpoint: "198.51.100.10:51820".into(),
        public_key: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=".into(),
        allowed_ips: "0.0.0.0/0, ::/0".into(),
        address: Some("10.14.0.2/32".into()),
        dns: Some("1.1.1.1".into()),
        is_favorite: false,
        last_used: None,
        is_custom: true,
        provider: Some("Custom WireGuard".into()),
    };

    let client_private_key = "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=";
    let psk = "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=";

    // Save server with client private key and PSK encrypted via DPAPI
    db.save_server(&server, Some(client_private_key), Some(psk))
        .expect("should save server successfully");

    // Fetch server record
    let retrieved = db.get_server("srv-test-1").expect("should find server");
    assert_eq!(retrieved.name, "Zurich Secure Node");
    assert_eq!(retrieved.country, "Switzerland");
    assert_eq!(retrieved.endpoint, "198.51.100.10:51820");
    assert_eq!(retrieved.address, Some("10.14.0.2/32".into()));

    // Fetch and verify private key decryption
    let decrypted_key = db
        .get_server_private_key("srv-test-1")
        .expect("should retrieve private key")
        .expect("private key should exist");
    assert_eq!(decrypted_key, client_private_key);

    let decrypted_psk = db
        .get_server_preshared_key("srv-test-1")
        .expect("should retrieve PSK")
        .expect("PSK should exist");
    assert_eq!(decrypted_psk, psk);

    // Toggle favorite
    let is_fav = db.toggle_favorite("srv-test-1").expect("toggle favorite");
    assert!(is_fav);
    let updated = db.get_server("srv-test-1").expect("get server");
    assert!(updated.is_favorite);

    // Delete server
    let deleted = db.delete_server("srv-test-1").expect("delete server");
    assert!(deleted);
    assert!(db.get_server("srv-test-1").is_err());
}

#[test]
fn test_settings_persistence() {
    let db = Database::new_in_memory().expect("in-memory db");

    let initial = db.get_settings().expect("default settings");
    assert_eq!(initial.theme, "dark");
    assert!(!initial.kill_switch);

    let mut modified = initial.clone();
    modified.kill_switch = true;
    modified.connection_timeout_seconds = 45;
    modified.preferred_server_id = Some("srv-default".into());

    db.update_settings(&modified).expect("update settings");

    let loaded = db.get_settings().expect("reload settings");
    assert!(loaded.kill_switch);
    assert_eq!(loaded.connection_timeout_seconds, 45);
    assert_eq!(loaded.preferred_server_id, Some("srv-default".into()));
}

#[test]
fn test_session_history_logging_and_clearing() {
    let db = Database::new_in_memory().expect("in-memory db");

    let session = SessionRecord {
        id: "sess-1".into(),
        server_id: "srv-ch".into(),
        server_name: "Switzerland Tunnel".into(),
        start_time: "2026-10-16T12:00:00Z".into(),
        end_time: Some("2026-10-16T12:45:00Z".into()),
        bytes_uploaded: 1048576,
        bytes_downloaded: 5242880,
        duration_seconds: 2700,
        disconnected_reason: Some("Normal shutdown".into()),
    };

    db.add_session(&session).expect("add session");

    let sessions = db.list_sessions().expect("list sessions");
    assert_eq!(sessions.len(), 1);
    assert_eq!(sessions[0].server_name, "Switzerland Tunnel");
    assert_eq!(sessions[0].duration_seconds, 2700);

    db.clear_sessions().expect("clear sessions");
    let after_clear = db.list_sessions().expect("list sessions after clear");
    assert_eq!(after_clear.len(), 0);
}

#[test]
fn test_wireguard_conf_parsing_and_serialization() {
    let raw_conf = r#"
[Interface]
PrivateKey = AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
Address = 10.14.0.2/32
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=
Endpoint = 203.0.113.195:51820
AllowedIPs = 0.0.0.0/0, ::/0
"#;

    let parsed = WireGuardConfig::parse(raw_conf).expect("parse conf");
    assert_eq!(parsed.client_private_key, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
    assert_eq!(parsed.peer_public_key, "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=");
    assert_eq!(parsed.endpoint, "203.0.113.195:51820");

    let serialized = parsed.to_conf_content();
    assert!(serialized.contains("PrivateKey = AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="));
    assert!(serialized.contains("Endpoint = 203.0.113.195:51820"));
    assert!(serialized.contains("AllowedIPs = 0.0.0.0/0, ::/0"));

    // Ensure redacting strips the sensitive key
    let redacted = redact_sensitive_text(&serialized);
    assert!(!redacted.contains("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="));
    assert!(redacted.contains("[REDACTED_PRIVATE_KEY]"));
}

#[test]
fn test_invalid_configurations_rejected() {
    // Missing PrivateKey
    assert!(WireGuardConfig::parse("[Interface]\nAddress = 10.0.0.2/32\n[Peer]\nPublicKey = AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=\nEndpoint = 1.2.3.4:51820").is_err());

    // Bad key length
    assert!(validate_wireguard_key("shortKey").is_err());

    // Bad endpoint (missing port)
    assert!(validate_endpoint("192.168.1.1").is_err());

    // Bad AllowedIPs (not CIDR)
    assert!(validate_allowed_ips("192.168.1.1").is_err());

    // CRLF injection attempts
    assert!(validate_endpoint("vpn.com\r\nInjected:51820").is_err());
    assert!(validate_allowed_ips("0.0.0.0/0\nPostUp = cmd").is_err());
}

#[test]
fn test_default_servers_seeded_on_init() {
    let db = Database::new_in_memory().expect("in-memory db");
    let servers = db.list_servers().expect("servers should be listed");
    assert!(servers.len() >= 3);
    assert!(servers.iter().any(|s| s.country == "United States"));
    assert!(servers.iter().any(|s| s.country == "Germany"));
    assert!(servers.iter().any(|s| s.country == "Switzerland"));
}

#[test]
fn test_parse_and_export_server_configuration() {
    let conf_data = r#"
[Interface]
PrivateKey = AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
Address = 10.14.0.5/32
DNS = 9.9.9.9

[Peer]
PublicKey = BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=
Endpoint = 198.51.100.88:51820
AllowedIPs = 0.0.0.0/0
"#;

    let parsed = WireGuardConfig::parse(conf_data).expect("Must parse valid config");
    assert_eq!(parsed.address, "10.14.0.5/32");
    assert_eq!(parsed.endpoint, "198.51.100.88:51820");

    let db = Database::new_in_memory().expect("in-memory db");
    let server = ServerRecord {
        id: "srv-export-test".into(),
        name: "Test Export Node".into(),
        country: "Japan".into(),
        city: "Tokyo".into(),
        country_code: "JP".into(),
        endpoint: parsed.endpoint.clone(),
        public_key: parsed.peer_public_key.clone(),
        allowed_ips: parsed.allowed_ips.clone(),
        address: Some(parsed.address.clone()),
        dns: parsed.dns.clone(),
        is_favorite: false,
        last_used: None,
        is_custom: true,
        provider: Some("Test".into()),
    };

    db.save_server(&server, Some(&parsed.client_private_key), None)
        .expect("Saved server");

    let retrieved_key = db.get_server_private_key(&server.id).expect("Key fetch");
    assert_eq!(
        retrieved_key,
        Some("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=".into())
    );

    let exported = WireGuardConfig {
        client_private_key: retrieved_key.unwrap(),
        address: server.address.unwrap(),
        dns: server.dns,
        peer_public_key: server.public_key,
        endpoint: server.endpoint,
        allowed_ips: server.allowed_ips,
        preshared_key: None,
    }
    .to_conf_content();

    assert!(exported.contains("[Interface]"));
    assert!(exported.contains("PrivateKey = AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="));
    assert!(exported.contains("Endpoint = 198.51.100.88:51820"));
}
