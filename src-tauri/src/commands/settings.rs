use crate::security::firewall;
use crate::storage::database::AppSettingsModel;
use crate::vpn::state::VpnManager;
use serde::Serialize;
use std::sync::Arc;
use tauri::State;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecurityStatusResponse {
    pub kill_switch_enabled: bool,
    pub kill_switch_active: bool,
    pub dns_protection: bool,
    pub ipv6_protection: String, // "blocked", "routed", "disabled"
    pub tunnel_interface_status: String,
    pub last_verification_time: Option<String>,
    pub warnings: Vec<String>,
}

#[tauri::command]
pub async fn get_settings(manager: State<'_, Arc<VpnManager>>) -> Result<AppSettingsModel, String> {
    manager.db.get_settings().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_settings(
    settings: AppSettingsModel,
    manager: State<'_, Arc<VpnManager>>,
) -> Result<AppSettingsModel, String> {
    crate::security::validation::validate_https_url(&settings.ip_check_endpoint)
        .map_err(|e| e.to_string())?;

    manager.db.update_settings(&settings).map_err(|e| e.to_string())?;

    // If kill switch was changed while not connected or connected, sync firewall rule
    if settings.kill_switch {
        let server = manager.current_server.lock().unwrap().clone();
        if let Some(s) = server
            && let Ok((host, port)) = crate::security::validation::validate_endpoint(&s.endpoint)
        {
            let _ = firewall::enable_kill_switch(Some(&host), Some(port));
        }
    } else {
        let _ = firewall::disable_kill_switch();
    }

    let _ = firewall::set_ipv6_protection(settings.block_ipv6);

    Ok(settings)
}

#[tauri::command]
pub async fn get_security_status(
    manager: State<'_, Arc<VpnManager>>,
) -> Result<SecurityStatusResponse, String> {
    let settings = manager.db.get_settings().unwrap_or_default();
    let kill_active = firewall::is_kill_switch_active();
    let (_state, server, tunnel, _) = manager.get_status();

    let tunnel_status = match (&tunnel, &server) {
        (Some(t), Some(s)) => format!("Active tunnel: {} ({})", t, s.name),
        _ => "No active tunnel".into(),
    };

    let ipv6_status = if settings.block_ipv6 {
        "blocked".into()
    } else {
        "disabled".into()
    };

    let mut warnings = Vec::new();
    if !settings.kill_switch {
        warnings.push("Kill switch is disabled: Unprotected traffic may leak if tunnel drops.".into());
    }
    if !settings.block_ipv6 {
        warnings.push("IPv6 leak protection is inactive.".into());
    }

    let last_verified = manager.ip_info.lock().unwrap().verified_at.clone();

    Ok(SecurityStatusResponse {
        kill_switch_enabled: settings.kill_switch,
        kill_switch_active: kill_active,
        dns_protection: true,
        ipv6_protection: ipv6_status,
        tunnel_interface_status: tunnel_status,
        last_verification_time: last_verified,
        warnings,
    })
}

#[tauri::command]
pub async fn toggle_kill_switch(
    enable: bool,
    manager: State<'_, Arc<VpnManager>>,
) -> Result<bool, String> {
    let mut settings = manager.db.get_settings().map_err(|e| e.to_string())?;
    settings.kill_switch = enable;
    manager.db.update_settings(&settings).map_err(|e| e.to_string())?;

    if enable {
        let server = manager.current_server.lock().unwrap().clone();
        if let Some(s) = server {
            if let Ok((host, port)) = crate::security::validation::validate_endpoint(&s.endpoint) {
                firewall::enable_kill_switch(Some(&host), Some(port)).map_err(|e| e.to_string())?;
            } else {
                firewall::enable_kill_switch(None, None).map_err(|e| e.to_string())?;
            }
        } else {
            firewall::enable_kill_switch(None, None).map_err(|e| e.to_string())?;
        }
    } else {
        firewall::disable_kill_switch().map_err(|e| e.to_string())?;
    }

    Ok(enable)
}
