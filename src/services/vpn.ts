import { invoke } from '@tauri-apps/api/core';
import {
  ConnectionState,
  ServerConfig,
  IpInfo,
  VpnStats,
  SecurityStatus,
  AppSettings,
  DiagnosticReport,
  ConnectionSession,
} from '../types/vpn';

export interface VpnStatusResponse {
  state: ConnectionState;
  currentServer: ServerConfig | null;
  activeTunnelName: string | null;
  errorMessage: string | null;
}

export const vpnService = {
  async getVpnStatus(): Promise<VpnStatusResponse> {
    return await invoke<VpnStatusResponse>('get_vpn_status');
  },

  async connect(serverId: string): Promise<VpnStatusResponse> {
    return await invoke<VpnStatusResponse>('connect_vpn', { serverId });
  },

  async disconnect(): Promise<VpnStatusResponse> {
    return await invoke<VpnStatusResponse>('disconnect_vpn');
  },

  async listServers(): Promise<ServerConfig[]> {
    return await invoke<ServerConfig[]>('list_servers');
  },

  async toggleFavorite(serverId: string): Promise<boolean> {
    return await invoke<boolean>('toggle_favorite_server', { serverId });
  },

  async getPublicIp(): Promise<IpInfo> {
    return await invoke<IpInfo>('get_public_ip');
  },

  async verifyConnection(): Promise<{ verified: boolean; ipInfo: IpInfo; message: string }> {
    return await invoke<{ verified: boolean; ipInfo: IpInfo; message: string }>('verify_vpn_connection');
  },

  async getStatistics(): Promise<VpnStats> {
    return await invoke<VpnStats>('get_statistics');
  },

  async getSecurityStatus(): Promise<SecurityStatus> {
    return await invoke<SecurityStatus>('get_security_status');
  },

  async toggleKillSwitch(enable: boolean): Promise<boolean> {
    return await invoke<boolean>('toggle_kill_switch', { enable });
  },

  async runDiagnostics(): Promise<DiagnosticReport> {
    return await invoke<DiagnosticReport>('run_diagnostics');
  },

  async getSettings(): Promise<AppSettings> {
    return await invoke<AppSettings>('get_settings');
  },

  async updateSettings(settings: AppSettings): Promise<AppSettings> {
    return await invoke<AppSettings>('update_settings', { settings });
  },

  async importConfiguration(content: string, name?: string): Promise<ServerConfig> {
    return await invoke<ServerConfig>('import_vpn_configuration', { content, name });
  },

  async deleteServer(serverId: string): Promise<boolean> {
    return await invoke<boolean>('delete_server', { serverId });
  },

  async getSessionHistory(): Promise<ConnectionSession[]> {
    return await invoke<ConnectionSession[]>('get_session_history');
  },

  async clearSessionHistory(): Promise<void> {
    return await invoke<void>('clear_session_history');
  },
};
