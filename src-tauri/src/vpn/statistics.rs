use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VpnStats {
    pub upload_speed: u64, // bytes/sec
    pub download_speed: u64, // bytes/sec
    pub total_uploaded: u64, // bytes
    pub total_downloaded: u64, // bytes
    pub session_duration_secs: u64,
    pub connection_health: String, // "optimal", "moderate", "degraded", "disconnected"
    pub last_handshake: Option<String>,
}

impl Default for VpnStats {
    fn default() -> Self {
        Self {
            upload_speed: 0,
            download_speed: 0,
            total_uploaded: 0,
            total_downloaded: 0,
            session_duration_secs: 0,
            connection_health: "disconnected".into(),
            last_handshake: None,
        }
    }
}

pub struct StatsTracker {
    start_time: Option<Instant>,
    last_sample_time: Instant,
    last_rx_bytes: u64,
    last_tx_bytes: u64,
    total_rx_bytes: u64,
    total_tx_bytes: u64,
    rx_speed: u64,
    tx_speed: u64,
}

impl StatsTracker {
    pub fn new() -> Self {
        Self {
            start_time: None,
            last_sample_time: Instant::now(),
            last_rx_bytes: 0,
            last_tx_bytes: 0,
            total_rx_bytes: 0,
            total_tx_bytes: 0,
            rx_speed: 0,
            tx_speed: 0,
        }
    }

    pub fn start_session(&mut self) {
        self.start_time = Some(Instant::now());
        self.last_sample_time = Instant::now();
        self.last_rx_bytes = 0;
        self.last_tx_bytes = 0;
        self.total_rx_bytes = 0;
        self.total_tx_bytes = 0;
        self.rx_speed = 0;
        self.tx_speed = 0;
    }

    pub fn stop_session(&mut self) {
        self.start_time = None;
        self.rx_speed = 0;
        self.tx_speed = 0;
    }

    pub fn update_traffic(&mut self, current_rx: u64, current_tx: u64) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_sample_time).as_secs_f64();

        if elapsed >= 0.5 {
            if current_rx >= self.last_rx_bytes {
                let rx_diff = current_rx - self.last_rx_bytes;
                self.rx_speed = (rx_diff as f64 / elapsed) as u64;
            }
            if current_tx >= self.last_tx_bytes {
                let tx_diff = current_tx - self.last_tx_bytes;
                self.tx_speed = (tx_diff as f64 / elapsed) as u64;
            }

            self.last_rx_bytes = current_rx;
            self.last_tx_bytes = current_tx;
            self.total_rx_bytes = current_rx;
            self.total_tx_bytes = current_tx;
            self.last_sample_time = now;
        }
    }

    pub fn get_current_stats(&self) -> VpnStats {
        let (duration, health) = match self.start_time {
            Some(t) => (t.elapsed().as_secs(), "optimal".to_string()),
            None => (0, "disconnected".to_string()),
        };

        VpnStats {
            upload_speed: self.tx_speed,
            download_speed: self.rx_speed,
            total_uploaded: self.total_tx_bytes,
            total_downloaded: self.total_rx_bytes,
            session_duration_secs: duration,
            connection_health: health,
            last_handshake: if self.start_time.is_some() {
                Some("Just now".into())
            } else {
                None
            },
        }
    }
}
