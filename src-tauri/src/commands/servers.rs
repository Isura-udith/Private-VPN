use crate::storage::database::ServerRecord;
use crate::vpn::configuration::WireGuardConfig;
use crate::vpn::state::VpnManager;
use std::sync::Arc;
use tauri::State;
use uuid::Uuid;

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
pub async fn import_vpn_configuration(
    content: String,
    name: Option<String>,
    manager: State<'_, Arc<VpnManager>>,
) -> Result<ServerRecord, String> {
    let parsed = WireGuardConfig::parse(&content).map_err(|e| e.to_string())?;

    let server_id = format!("srv-{}", Uuid::new_v4().to_string().chars().take(8).collect::<String>());
    let display_name = name.unwrap_or_else(|| format!("Imported Server ({})", &parsed.endpoint));

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
pub async fn delete_server(
    server_id: String,
    manager: State<'_, Arc<VpnManager>>,
) -> Result<bool, String> {
    manager.db.delete_server(&server_id).map_err(|e| e.to_string())
}
