use crate::network::ip_check::IpCheckResult;
use crate::storage::database::ServerRecord;
use crate::vpn::state::{ConnectionStatus, VpnManager};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VpnStatusResponse {
    pub state: ConnectionStatus,
    pub current_server: Option<ServerRecord>,
    pub active_tunnel_name: Option<String>,
    pub error_message: Option<String>,
}

#[tauri::command]
pub async fn get_vpn_status(manager: State<'_, Arc<VpnManager>>) -> Result<VpnStatusResponse, String> {
    let (state, server, tunnel, err) = manager.get_status();
    Ok(VpnStatusResponse {
        state,
        current_server: server,
        active_tunnel_name: tunnel,
        error_message: err,
    })
}

#[tauri::command]
pub async fn connect_vpn(
    server_id: String,
    manager: State<'_, Arc<VpnManager>>,
) -> Result<VpnStatusResponse, String> {
    manager.connect(&server_id).await.map_err(|e| e.to_string())?;
    let (state, server, tunnel, err) = manager.get_status();
    Ok(VpnStatusResponse {
        state,
        current_server: server,
        active_tunnel_name: tunnel,
        error_message: err,
    })
}

#[tauri::command]
pub async fn disconnect_vpn(manager: State<'_, Arc<VpnManager>>) -> Result<VpnStatusResponse, String> {
    manager.disconnect().await.map_err(|e| e.to_string())?;
    let (state, server, tunnel, err) = manager.get_status();
    Ok(VpnStatusResponse {
        state,
        current_server: server,
        active_tunnel_name: tunnel,
        error_message: err,
    })
}

#[tauri::command]
pub async fn get_public_ip(manager: State<'_, Arc<VpnManager>>) -> Result<IpCheckResult, String> {
    let endpoint = manager
        .db
        .get_settings()
        .map(|s| s.ip_check_endpoint)
        .ok();

    match manager.ip_checker.fetch_current_ip(endpoint.as_deref()).await {
        Ok((ip, country, city, isp)) => {
            let mut result = manager.ip_info.lock().unwrap().clone();
            result.current_ip = Some(ip);
            result.country = country;
            result.city = city;
            result.isp = isp;
            result.status = "verified".into();
            result.verified_at = Some(chrono::Utc::now().to_rfc3339());
            *manager.ip_info.lock().unwrap() = result.clone();
            Ok(result)
        }
        Err(e) => {
            let mut result = manager.ip_info.lock().unwrap().clone();
            result.status = "failed".into();
            result.error_message = Some(e.to_string());
            Ok(result)
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VerificationResponse {
    pub verified: bool,
    pub ip_info: IpCheckResult,
    pub message: String,
}

#[tauri::command]
pub async fn verify_vpn_connection(
    manager: State<'_, Arc<VpnManager>>,
) -> Result<VerificationResponse, String> {
    let endpoint = manager
        .db
        .get_settings()
        .map(|s| s.ip_check_endpoint)
        .ok();

    let check = manager.ip_checker.fetch_current_ip(endpoint.as_deref()).await;
    let mut ip_info = manager.ip_info.lock().unwrap().clone();

    match check {
        Ok((new_ip, country, city, isp)) => {
            let is_diff = match &ip_info.original_ip {
                Some(orig) => orig != &new_ip,
                None => false,
            };

            ip_info.current_ip = Some(new_ip);
            ip_info.country = country;
            ip_info.city = city;
            ip_info.isp = isp;
            ip_info.is_different = is_diff;
            ip_info.status = "verified".into();
            ip_info.verified_at = Some(chrono::Utc::now().to_rfc3339());
            *manager.ip_info.lock().unwrap() = ip_info.clone();

            let message = if is_diff {
                "VPN tunnel verified: Public IP address has successfully changed.".to_string()
            } else {
                "Public IP address is unchanged or server egress matches local address.".to_string()
            };

            Ok(VerificationResponse {
                verified: true,
                ip_info,
                message,
            })
        }
        Err(e) => {
            ip_info.status = "failed".into();
            ip_info.error_message = Some(e.to_string());
            Ok(VerificationResponse {
                verified: false,
                ip_info,
                message: format!("Verification failed: {}", e),
            })
        }
    }
}
