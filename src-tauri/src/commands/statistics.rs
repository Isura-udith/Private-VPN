use crate::storage::database::SessionRecord;
use crate::vpn::state::VpnManager;
use crate::vpn::statistics::VpnStats;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn get_statistics(manager: State<'_, Arc<VpnManager>>) -> Result<VpnStats, String> {
    let tunnel = manager.active_tunnel_name.lock().unwrap().clone();
    if let Some(ref name) = tunnel
        && let Some((rx, tx)) = manager.wg.query_tunnel_traffic(name)
    {
        manager.stats.lock().unwrap().update_traffic(rx, tx);
    }
    Ok(manager.stats.lock().unwrap().get_current_stats())
}

#[tauri::command]
pub async fn get_session_history(
    manager: State<'_, Arc<VpnManager>>,
) -> Result<Vec<SessionRecord>, String> {
    manager.db.list_sessions().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_session_history(manager: State<'_, Arc<VpnManager>>) -> Result<(), String> {
    manager.db.clear_sessions().map_err(|e| e.to_string())
}
