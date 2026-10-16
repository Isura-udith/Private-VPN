use crate::errors::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IpCheckResult {
    pub original_ip: Option<String>,
    pub current_ip: Option<String>,
    pub is_different: bool,
    pub country: Option<String>,
    pub city: Option<String>,
    pub isp: Option<String>,
    pub verified_at: Option<String>,
    pub status: String, // "unverified", "verifying", "verified", "failed"
    pub error_message: Option<String>,
}

impl Default for IpCheckResult {
    fn default() -> Self {
        Self {
            original_ip: None,
            current_ip: None,
            is_different: false,
            country: None,
            city: None,
            isp: None,
            verified_at: None,
            status: "unverified".into(),
            error_message: None,
        }
    }
}

#[derive(Deserialize)]
struct IpWhoIsResponse {
    ip: Option<String>,
    country: Option<String>,
    city: Option<String>,
    connection: Option<IpWhoIsConnection>,
}

#[derive(Deserialize)]
struct IpWhoIsConnection {
    isp: Option<String>,
}

#[derive(Deserialize)]
struct IpifyResponse {
    ip: Option<String>,
}

pub struct IpChecker {
    client: reqwest::Client,
}

impl IpChecker {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(7))
            .user_agent("PrivateVPN-Client/1.0")
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        Self { client }
    }

    /// Fetches public IP and basic geolocation information
    pub async fn fetch_current_ip(&self, custom_endpoint: Option<&str>) -> AppResult<(String, Option<String>, Option<String>, Option<String>)> {
        // Try custom or primary endpoint: ipwho.is (gives IP, country, city, ISP)
        let primary_url = custom_endpoint.unwrap_or("https://ipwho.is/");

        if let Ok(resp) = self.client.get(primary_url).send().await {
            if resp.status().is_success() {
                // Try parsing as ipwho.is structure
                if let Ok(info) = resp.json::<IpWhoIsResponse>().await {
                    if let Some(ip) = info.ip {
                        if ip.parse::<IpAddr>().is_ok() {
                            let isp = info.connection.and_then(|c| c.isp);
                            return Ok((ip, info.country, info.city, isp));
                        }
                    }
                }
            }
        }

        // Fallback 1: api64.ipify.org (supports IPv4 & IPv6)
        if let Ok(resp) = self.client.get("https://api64.ipify.org?format=json").send().await {
            if let Ok(data) = resp.json::<IpifyResponse>().await {
                if let Some(ip) = data.ip {
                    if ip.parse::<IpAddr>().is_ok() {
                        return Ok((ip, None, None, None));
                    }
                }
            }
        }

        // Fallback 2: icanhazip.com (plain text)
        if let Ok(resp) = self.client.get("https://icanhazip.com").send().await {
            if let Ok(text) = resp.text().await {
                let trimmed = text.trim();
                if trimmed.parse::<IpAddr>().is_ok() {
                    return Ok((trimmed.to_string(), None, None, None));
                }
            }
        }

        Err(AppError::IpVerificationFailed(
            "Could not reach trusted IP check endpoints. Check network connectivity.".into(),
        ))
    }
}
