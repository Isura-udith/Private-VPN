use serde::{Serialize, Serializer};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("WireGuard software is not installed or not found in standard paths")]
    WireguardNotInstalled,

    #[error("Administrative privileges are required for this action: {0}")]
    PermissionDenied(String),

    #[error("Invalid server configuration: {0}")]
    InvalidConfiguration(String),

    #[error("Server not found with ID: {0}")]
    ServerNotFound(String),

    #[error("Connection timed out after {0} seconds")]
    ConnectionTimeout(u64),

    #[error("VPN service error: {0}")]
    ServiceError(String),

    #[error("Network error: {0}")]
    NetworkError(String),

    #[error("Public IP verification failed: {0}")]
    IpVerificationFailed(String),

    #[error("Firewall rule error: {0}")]
    FirewallError(String),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Secure credential storage error: {0}")]
    CredentialError(String),

    #[error("System error: {0}")]
    SystemError(String),

    #[error("Operation already in progress: {0}")]
    StateConflict(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
