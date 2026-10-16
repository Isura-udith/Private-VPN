pub mod commands;
pub mod errors;
pub mod network;
pub mod security;
pub mod storage;
pub mod vpn;

use commands::connection::{
    connect_vpn, disconnect_vpn, get_public_ip, get_vpn_status, verify_vpn_connection,
};
use commands::diagnostics::run_diagnostics;
use commands::servers::{
    delete_server, import_vpn_configuration, list_servers, toggle_favorite_server,
};
use commands::settings::{get_security_status, get_settings, toggle_kill_switch, update_settings};
use commands::statistics::{clear_session_history, get_session_history, get_statistics};
use std::path::PathBuf;
use std::sync::Arc;
use storage::database::Database;
use tauri::Manager;
use vpn::state::VpnManager;

fn get_db_path() -> PathBuf {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        PathBuf::from(local_app_data)
            .join("PrivateVPN")
            .join("private_vpn.db")
    } else {
        std::env::temp_dir()
            .join("PrivateVPN")
            .join("private_vpn.db")
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let db_path = get_db_path();
            let db = Database::new(db_path).unwrap_or_else(|_| {
                Database::new_in_memory().expect("In-memory SQLite fallback failed")
            });

            let vpn_manager = Arc::new(VpnManager::new(db));
            app.manage(vpn_manager);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_vpn_status,
            connect_vpn,
            disconnect_vpn,
            list_servers,
            toggle_favorite_server,
            get_public_ip,
            verify_vpn_connection,
            get_statistics,
            get_security_status,
            toggle_kill_switch,
            run_diagnostics,
            get_settings,
            update_settings,
            import_vpn_configuration,
            delete_server,
            get_session_history,
            clear_session_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running Private VPN application");
}
