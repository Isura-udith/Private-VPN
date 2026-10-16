use crate::storage::database::ServerRecord;
use crate::vpn::configuration::WireGuardConfig;
use crate::vpn::state::{ConnectionStatus, VpnManager};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedConfigPreview {
    pub endpoint: String,
    pub peer_public_key: String,
    pub address: String,
    pub allowed_ips: String,
    pub dns: Option<String>,
    pub has_preshared_key: bool,
}

#[tauri::command]
pub async fn list_servers(manager: State<'_, Arc<VpnManager>>) -> Result<Vec<ServerRecord>, String> {
    manager.db.list_servers().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_favorite_server(
    server_id: String,
    manager: State<'_, Arc<VpnManager>>,
) -> Result<bool, String> {
    manager.db.toggle_favorite(&server_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn parse_vpn_configuration(content: String) -> Result<ParsedConfigPreview, String> {
    let parsed = WireGuardConfig::parse(&content).map_err(|e| e.to_string())?;
    Ok(ParsedConfigPreview {
        endpoint: parsed.endpoint,
        peer_public_key: parsed.peer_public_key,
        address: parsed.address,
        allowed_ips: parsed.allowed_ips,
        dns: parsed.dns,
        has_preshared_key: parsed.preshared_key.is_some(),
    })
}

#[tauri::command]
pub async fn import_vpn_configuration(
    content: String,
    name: Option<String>,
    manager: State<'_, Arc<VpnManager>>,
) -> Result<ServerRecord, String> {
    let parsed = WireGuardConfig::parse(&content).map_err(|e| e.to_string())?;

    let server_id = format!("srv-{}", Uuid::new_v4().to_string().chars().take(8).collect::<String>());
    let display_name = match name {
        Some(n) => {
            let trimmed = n.trim();
            if trimmed.is_empty() {
                format!("Imported Server ({})", parsed.endpoint)
            } else {
                trimmed.chars().take(64).filter(|c| !c.is_control()).collect()
            }
        }
        None => format!("Imported Server ({})", parsed.endpoint),
    };

    // Try extracting host / IP for country/city hints
    let host_part = parsed.endpoint.split(':').next().unwrap_or("WireGuard");

    let server = ServerRecord {
        id: server_id,
        name: display_name,
        country: "Custom".into(),
        city: host_part.into(),
        country_code: "US".into(),
        endpoint: parsed.endpoint.clone(),
        public_key: parsed.peer_public_key.clone(),
        allowed_ips: parsed.allowed_ips.clone(),
        address: Some(parsed.address.clone()),
        dns: parsed.dns.clone(),
        is_favorite: false,
        last_used: None,
        is_custom: true,
        provider: Some("Custom WireGuard".into()),
    };

    manager
        .db
        .save_server(
            &server,
            Some(&parsed.client_private_key),
            parsed.preshared_key.as_deref(),
        )
        .map_err(|e| e.to_string())?;

    manager.add_log("info", &format!("Imported new server configuration: {}", server.name));

    Ok(server)
}

#[tauri::command]
pub async fn export_server_configuration(
    server_id: String,
    manager: State<'_, Arc<VpnManager>>,
) -> Result<String, String> {
    let server = manager.db.get_server(&server_id).map_err(|e| e.to_string())?;

    let private_key = manager
        .db
        .get_server_private_key(&server_id)
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| {
            // Standard fallback client private key for pre-seeded demonstration nodes
            "yAng54hmRAbaElEGKPungM9ffzxBpWmbTXZw8FSJBEg=".to_string()
        });

    let preshared_key = manager
        .db
        .get_server_preshared_key(&server_id)
        .unwrap_or(None);

    let config = WireGuardConfig {
        client_private_key: private_key,
        address: server.address.unwrap_or_else(|| "10.14.0.2/32".into()),
        dns: server.dns.or_else(|| Some("1.1.1.1".into())),
        peer_public_key: server.public_key,
        endpoint: server.endpoint,
        allowed_ips: if server.allowed_ips.trim().is_empty() {
            "0.0.0.0/0, ::/0".into()
        } else {
            server.allowed_ips
        },
        preshared_key,
    };

    Ok(config.to_conf_content())
}

#[tauri::command]
pub async fn delete_server(
    server_id: String,
    manager: State<'_, Arc<VpnManager>>,
) -> Result<bool, String> {
    let (state, current_server, _, _) = manager.get_status();
    if let Some(ref s) = current_server
        && s.id == server_id
        && (state == ConnectionStatus::Connected
            || state == ConnectionStatus::Connecting
            || state == ConnectionStatus::Disconnecting)
    {
        return Err("Cannot delete server while it is actively in use or connecting. Please disconnect first.".into());
    }
    manager.db.delete_server(&server_id).map_err(|e| e.to_string())
}
