use crate::errors::{AppError, AppResult};
use crate::security::credentials::{protect_secret, unprotect_secret};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerRecord {
    pub id: String,
    pub name: String,
    pub country: String,
    pub city: String,
    pub country_code: String,
    pub endpoint: String,
    pub public_key: String,
    pub allowed_ips: String,
    pub dns: Option<String>,
    pub is_favorite: bool,
    pub last_used: Option<String>,
    pub is_custom: bool,
    pub provider: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsModel {
    pub theme: String,
    pub start_with_windows: bool,
    pub auto_connect_on_start: bool,
    pub preferred_server_id: Option<String>,
    pub auto_reconnect: bool,
    pub kill_switch: bool,
    pub block_ipv6: bool,
    pub notifications: bool,
    pub connection_timeout_seconds: u64,
    pub ip_check_endpoint: String,
    pub record_session_history: bool,
}

impl Default for AppSettingsModel {
    fn default() -> Self {
        Self {
            theme: "dark".into(),
            start_with_windows: false,
            auto_connect_on_start: false,
            preferred_server_id: None,
            auto_reconnect: true,
            kill_switch: false,
            block_ipv6: true,
            notifications: true,
            connection_timeout_seconds: 30,
            ip_check_endpoint: "https://api64.ipify.org?format=json".into(),
            record_session_history: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionRecord {
    pub id: String,
    pub server_id: String,
    pub server_name: String,
    pub start_time: String,
    pub end_time: Option<String>,
    pub bytes_uploaded: u64,
    pub bytes_downloaded: u64,
    pub duration_seconds: u64,
    pub disconnected_reason: Option<String>,
}

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(db_path: PathBuf) -> AppResult<Self> {
        if let Some(parent) = db_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        let conn = Connection::open(&db_path)
            .map_err(|e| AppError::DatabaseError(format!("Failed to open SQLite database: {}", e)))?;

        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    pub fn new_in_memory() -> AppResult<Self> {
        let conn = Connection::open_in_memory()
            .map_err(|e| AppError::DatabaseError(format!("Failed to open in-memory SQLite: {}", e)))?;

        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> AppResult<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                theme TEXT NOT NULL DEFAULT 'dark',
                start_with_windows INTEGER NOT NULL DEFAULT 0,
                auto_connect_on_start INTEGER NOT NULL DEFAULT 0,
                preferred_server_id TEXT,
                auto_reconnect INTEGER NOT NULL DEFAULT 1,
                kill_switch INTEGER NOT NULL DEFAULT 0,
                block_ipv6 INTEGER NOT NULL DEFAULT 1,
                notifications INTEGER NOT NULL DEFAULT 1,
                connection_timeout_seconds INTEGER NOT NULL DEFAULT 30,
                ip_check_endpoint TEXT NOT NULL DEFAULT 'https://api64.ipify.org?format=json',
                record_session_history INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS saved_servers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                country TEXT NOT NULL,
                city TEXT NOT NULL,
                country_code TEXT NOT NULL,
                endpoint TEXT NOT NULL,
                public_key TEXT NOT NULL,
                allowed_ips TEXT NOT NULL,
                dns TEXT,
                encrypted_private_key BLOB,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                last_used TEXT,
                is_custom INTEGER NOT NULL DEFAULT 0,
                provider TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS connection_sessions (
                id TEXT PRIMARY KEY,
                server_id TEXT NOT NULL,
                server_name TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT,
                bytes_uploaded INTEGER NOT NULL DEFAULT 0,
                bytes_downloaded INTEGER NOT NULL DEFAULT 0,
                duration_seconds INTEGER NOT NULL DEFAULT 0,
                disconnected_reason TEXT
            );
            ",
        )
        .map_err(|e| AppError::DatabaseError(format!("Database schema initialization error: {}", e)))?;

        // Initialize default settings if row 1 doesn't exist
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM app_settings WHERE id = 1", [], |r| r.get(0))
            .unwrap_or(0);

        if count == 0 {
            conn.execute(
                "INSERT INTO app_settings (id) VALUES (1)",
                [],
            )
            .map_err(|e| AppError::DatabaseError(format!("Failed to insert default settings: {}", e)))?;
        }

        Ok(())
    }

    pub fn get_settings(&self) -> AppResult<AppSettingsModel> {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            "SELECT theme, start_with_windows, auto_connect_on_start, preferred_server_id,
                    auto_reconnect, kill_switch, block_ipv6, notifications,
                    connection_timeout_seconds, ip_check_endpoint, record_session_history
             FROM app_settings WHERE id = 1",
            [],
            |r| {
                Ok(AppSettingsModel {
                    theme: r.get(0)?,
                    start_with_windows: r.get::<_, i32>(1)? != 0,
                    auto_connect_on_start: r.get::<_, i32>(2)? != 0,
                    preferred_server_id: r.get(3)?,
                    auto_reconnect: r.get::<_, i32>(4)? != 0,
                    kill_switch: r.get::<_, i32>(5)? != 0,
                    block_ipv6: r.get::<_, i32>(6)? != 0,
                    notifications: r.get::<_, i32>(7)? != 0,
                    connection_timeout_seconds: r.get(8)?,
                    ip_check_endpoint: r.get(9)?,
                    record_session_history: r.get::<_, i32>(10)? != 0,
                })
            },
        )
        .map_err(|e| AppError::DatabaseError(format!("Failed to query settings: {}", e)))
    }

    pub fn update_settings(&self, settings: &AppSettingsModel) -> AppResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE app_settings SET
                theme = ?1,
                start_with_windows = ?2,
                auto_connect_on_start = ?3,
                preferred_server_id = ?4,
                auto_reconnect = ?5,
                kill_switch = ?6,
                block_ipv6 = ?7,
                notifications = ?8,
                connection_timeout_seconds = ?9,
                ip_check_endpoint = ?10,
                record_session_history = ?11
             WHERE id = 1",
            params![
                settings.theme,
                if settings.start_with_windows { 1 } else { 0 },
                if settings.auto_connect_on_start { 1 } else { 0 },
                settings.preferred_server_id,
                if settings.auto_reconnect { 1 } else { 0 },
                if settings.kill_switch { 1 } else { 0 },
                if settings.block_ipv6 { 1 } else { 0 },
                if settings.notifications { 1 } else { 0 },
                settings.connection_timeout_seconds,
                settings.ip_check_endpoint,
                if settings.record_session_history { 1 } else { 0 },
            ],
        )
        .map_err(|e| AppError::DatabaseError(format!("Failed to update settings: {}", e)))?;

        Ok(())
    }

    pub fn list_servers(&self) -> AppResult<Vec<ServerRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare(
                "SELECT id, name, country, city, country_code, endpoint, public_key,
                        allowed_ips, dns, is_favorite, last_used, is_custom, provider
                 FROM saved_servers ORDER BY is_favorite DESC, name ASC",
            )
            .map_err(|e| AppError::DatabaseError(format!("Failed to prepare server query: {}", e)))?;

        let rows = stmt
            .query_map([], |r| {
                Ok(ServerRecord {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    country: r.get(2)?,
                    city: r.get(3)?,
                    country_code: r.get(4)?,
                    endpoint: r.get(5)?,
                    public_key: r.get(6)?,
                    allowed_ips: r.get(7)?,
                    dns: r.get(8)?,
                    is_favorite: r.get::<_, i32>(9)? != 0,
                    last_used: r.get(10)?,
                    is_custom: r.get::<_, i32>(11)? != 0,
                    provider: r.get(12)?,
                })
            })
            .map_err(|e| AppError::DatabaseError(format!("Failed to query servers: {}", e)))?;

        let mut servers = Vec::new();
        for row in rows {
            if let Ok(server) = row {
                servers.push(server);
            }
        }
        Ok(servers)
    }

    pub fn get_server(&self, server_id: &str) -> AppResult<ServerRecord> {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            "SELECT id, name, country, city, country_code, endpoint, public_key,
                    allowed_ips, dns, is_favorite, last_used, is_custom, provider
             FROM saved_servers WHERE id = ?1",
            [server_id],
            |r| {
                Ok(ServerRecord {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    country: r.get(2)?,
                    city: r.get(3)?,
                    country_code: r.get(4)?,
                    endpoint: r.get(5)?,
                    public_key: r.get(6)?,
                    allowed_ips: r.get(7)?,
                    dns: r.get(8)?,
                    is_favorite: r.get::<_, i32>(9)? != 0,
                    last_used: r.get(10)?,
                    is_custom: r.get::<_, i32>(11)? != 0,
                    provider: r.get(12)?,
                })
            },
        )
        .map_err(|_| AppError::ServerNotFound(server_id.to_string()))
    }

    pub fn get_server_private_key(&self, server_id: &str) -> AppResult<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let encrypted_blob: Option<Vec<u8>> = conn
            .query_row(
                "SELECT encrypted_private_key FROM saved_servers WHERE id = ?1",
                [server_id],
                |r| r.get(0),
            )
            .map_err(|_| AppError::ServerNotFound(server_id.to_string()))?;

        if let Some(blob) = encrypted_blob {
            let key = unprotect_secret(&blob)?;
            Ok(Some(key))
        } else {
            Ok(None)
        }
    }

    pub fn save_server(
        &self,
        server: &ServerRecord,
        plaintext_private_key: Option<&str>,
    ) -> AppResult<()> {
        let encrypted_key = match plaintext_private_key {
            Some(key) => Some(protect_secret(key)?),
            None => None,
        };

        let now = chrono::Utc::now().to_rfc3339();
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "INSERT INTO saved_servers
                (id, name, country, city, country_code, endpoint, public_key, allowed_ips,
                 dns, encrypted_private_key, is_favorite, last_used, is_custom, provider, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                country = excluded.country,
                city = excluded.city,
                country_code = excluded.country_code,
                endpoint = excluded.endpoint,
                public_key = excluded.public_key,
                allowed_ips = excluded.allowed_ips,
                dns = excluded.dns,
                encrypted_private_key = COALESCE(excluded.encrypted_private_key, saved_servers.encrypted_private_key),
                is_custom = excluded.is_custom,
                provider = excluded.provider",
            params![
                server.id,
                server.name,
                server.country,
                server.city,
                server.country_code,
                server.endpoint,
                server.public_key,
                server.allowed_ips,
                server.dns,
                encrypted_key,
                if server.is_favorite { 1 } else { 0 },
                server.last_used,
                if server.is_custom { 1 } else { 0 },
                server.provider,
                now,
            ],
        )
        .map_err(|e| AppError::DatabaseError(format!("Failed to save server: {}", e)))?;

        Ok(())
    }

    pub fn toggle_favorite(&self, server_id: &str) -> AppResult<bool> {
        let conn = self.conn.lock().unwrap();
        let current_fav: i32 = conn
            .query_row(
                "SELECT is_favorite FROM saved_servers WHERE id = ?1",
                [server_id],
                |r| r.get(0),
            )
            .map_err(|_| AppError::ServerNotFound(server_id.to_string()))?;

        let new_fav = if current_fav == 0 { 1 } else { 0 };
        conn.execute(
            "UPDATE saved_servers SET is_favorite = ?1 WHERE id = ?2",
            params![new_fav, server_id],
        )
        .map_err(|e| AppError::DatabaseError(format!("Failed to toggle favorite: {}", e)))?;

        Ok(new_fav == 1)
    }

    pub fn update_server_last_used(&self, server_id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE saved_servers SET last_used = ?1 WHERE id = ?2",
            params![now, server_id],
        )
        .map_err(|e| AppError::DatabaseError(format!("Failed to update last used: {}", e)))?;
        Ok(())
    }

    pub fn delete_server(&self, server_id: &str) -> AppResult<bool> {
        let conn = self.conn.lock().unwrap();
        let affected = conn
            .execute("DELETE FROM saved_servers WHERE id = ?1", [server_id])
            .map_err(|e| AppError::DatabaseError(format!("Failed to delete server: {}", e)))?;
        Ok(affected > 0)
    }

    pub fn add_session(&self, session: &SessionRecord) -> AppResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO connection_sessions
                (id, server_id, server_name, start_time, end_time, bytes_uploaded, bytes_downloaded, duration_seconds, disconnected_reason)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                session.id,
                session.server_id,
                session.server_name,
                session.start_time,
                session.end_time,
                session.bytes_uploaded,
                session.bytes_downloaded,
                session.duration_seconds,
                session.disconnected_reason,
            ],
        )
        .map_err(|e| AppError::DatabaseError(format!("Failed to record connection session: {}", e)))?;
        Ok(())
    }

    pub fn list_sessions(&self) -> AppResult<Vec<SessionRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare(
                "SELECT id, server_id, server_name, start_time, end_time, bytes_uploaded, bytes_downloaded, duration_seconds, disconnected_reason
                 FROM connection_sessions ORDER BY start_time DESC LIMIT 50",
            )
            .map_err(|e| AppError::DatabaseError(format!("Failed to prepare session query: {}", e)))?;

        let rows = stmt
            .query_map([], |r| {
                Ok(SessionRecord {
                    id: r.get(0)?,
                    server_id: r.get(1)?,
                    server_name: r.get(2)?,
                    start_time: r.get(3)?,
                    end_time: r.get(4)?,
                    bytes_uploaded: r.get(5)?,
                    bytes_downloaded: r.get(6)?,
                    duration_seconds: r.get(7)?,
                    disconnected_reason: r.get(8)?,
                })
            })
            .map_err(|e| AppError::DatabaseError(format!("Failed to query sessions: {}", e)))?;

        let mut sessions = Vec::new();
        for row in rows {
            if let Ok(sess) = row {
                sessions.push(sess);
            }
        }
        Ok(sessions)
    }

    pub fn clear_sessions(&self) -> AppResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM connection_sessions", [])
            .map_err(|e| AppError::DatabaseError(format!("Failed to clear sessions: {}", e)))?;
        Ok(())
    }
}
