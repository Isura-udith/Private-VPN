use crate::network::{dns_check, routing};
use crate::security::validation::redact_sensitive_text;
use crate::vpn::state::{DiagnosticLogEntry, VpnManager};
use crate::vpn::wireguard::WireGuardIntegration;
use serde::Serialize;
use std::sync::Arc;
use tauri::State;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticReport {
    pub wireguard_installed: bool,
    pub wireguard_path: Option<String>,
    pub is_elevated: bool,
    pub tunnel_active: bool,
    pub default_gateway: Option<String>,
    pub active_dns_servers: Vec<String>,
    pub current_public_ip: Option<String>,
    pub reachability_check: bool,
    pub recent_logs: Vec<DiagnosticLogEntry>,
    pub warnings: Vec<String>,
}

#[tauri::command]
pub async fn run_diagnostics(manager: State<'_, Arc<VpnManager>>) -> Result<DiagnosticReport, String> {
    let wg_installed = manager.wg.is_installed();
    let wg_path = manager.wg.get_executable_path();
    let is_elevated = WireGuardIntegration::is_elevated();

    let tunnel_name = manager.active_tunnel_name.lock().unwrap().clone();
    let tunnel_active = match tunnel_name {
        Some(ref name) => manager.wg.is_tunnel_running(name),
        None => false,
    };

    let gateway = routing::get_default_gateway();
    let dns_servers = dns_check::get_active_dns_servers();
    let reachability = routing::check_network_reachability();
    let current_ip = manager.ip_info.lock().unwrap().current_ip.clone();

    let mut warnings = Vec::new();
    if !wg_installed {
        warnings.push("WireGuard for Windows is not installed. Tunnels cannot be created.".into());
    }
    if !is_elevated {
        warnings.push("Private VPN is running without Administrator privileges. Elevation is required to configure network interfaces.".into());
    }
    if gateway.is_none() {
        warnings.push("No active network default gateway detected.".into());
    }

    let logs = manager
        .logs
        .lock()
        .unwrap()
        .iter()
        .map(|entry| DiagnosticLogEntry {
            timestamp: entry.timestamp.clone(),
            level: entry.level.clone(),
            message: redact_sensitive_text(&entry.message),
        })
        .collect();

    Ok(DiagnosticReport {
        wireguard_installed: wg_installed,
        wireguard_path: wg_path,
        is_elevated,
        tunnel_active,
        default_gateway: gateway,
        active_dns_servers: dns_servers,
        current_public_ip: current_ip,
        reachability_check: reachability,
        recent_logs: logs,
        warnings,
    })
}
