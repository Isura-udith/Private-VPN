import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
import { vpnService } from '../services/vpn';
import {
  APP_CONFIG,
  INITIAL_IP_INFO,
  INITIAL_STATS,
  INITIAL_SECURITY_STATUS,
  INITIAL_SETTINGS,
} from '../constants';

export interface VpnContextType {
  // States
  connectionState: ConnectionState;
  currentServer: ServerConfig | null;
  servers: ServerConfig[];
  errorMessage: string | null;
  ipInfo: IpInfo;
  isVerifyingIp: boolean;
  stats: VpnStats;
  securityStatus: SecurityStatus;
  settings: AppSettings;
  diagnosticReport: DiagnosticReport | null;
  isLoadingDiagnostics: boolean;
  sessions: ConnectionSession[];

  // Mutators & Actions
  setCurrentServer: (server: ServerConfig | null) => void;
  setErrorMessage: (msg: string | null) => void;
  toggleConnection: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshIp: () => Promise<void>;
  fetchServers: () => Promise<void>;
  toggleFavorite: (serverId: string) => Promise<void>;
  importConfiguration: (content: string, name?: string) => Promise<ServerConfig>;
  deleteServer: (serverId: string) => Promise<void>;
  toggleKillSwitch: (enable: boolean) => Promise<void>;
  updateSettings: (newSettings: AppSettings) => Promise<void>;
  refreshSecurity: () => Promise<void>;
  refreshDiagnostics: () => Promise<void>;
  clearSessionHistory: () => Promise<void>;
}

const VpnContext = createContext<VpnContextType | undefined>(undefined);

export const VpnProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [currentServer, setCurrentServer] = useState<ServerConfig | null>(null);
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [ipInfo, setIpInfo] = useState<IpInfo>(INITIAL_IP_INFO);
  const [isVerifyingIp, setIsVerifyingIp] = useState(false);

  const [stats, setStats] = useState<VpnStats>(INITIAL_STATS);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>(INITIAL_SECURITY_STATUS);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  const [diagnosticReport, setDiagnosticReport] = useState<DiagnosticReport | null>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);
  const [sessions, setSessions] = useState<ConnectionSession[]>([]);

  // Refresh status from Rust backend
  const refreshStatus = useCallback(async () => {
    try {
      const res = await vpnService.getVpnStatus();
      setConnectionState(res.state);
      if (res.currentServer) {
        setCurrentServer(res.currentServer);
      }
      if (res.errorMessage) {
        setErrorMessage(res.errorMessage);
      }
    } catch (err: any) {
      console.error('Failed to get status:', err);
    }
  }, []);

  // Fetch servers catalog
  const fetchServers = useCallback(async () => {
    try {
      const list = await vpnService.listServers();
      setServers(list);
      if (!currentServer && list.length > 0) {
        setCurrentServer(list[0]);
      }
    } catch (err) {
      console.error('Failed to list servers:', err);
    }
  }, [currentServer]);

  // Fetch IP information
  const refreshIp = useCallback(async () => {
    setIsVerifyingIp(true);
    try {
      const info = await vpnService.getPublicIp();
      setIpInfo(info);
    } catch (err: any) {
      setIpInfo((prev) => ({
        ...prev,
        status: 'failed',
        errorMessage: err?.toString() || 'Failed to query IP',
      }));
    } finally {
      setIsVerifyingIp(false);
    }
  }, []);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const s = await vpnService.getSettings();
      setSettings(s);
      if (s.theme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  // Fetch security status
  const refreshSecurity = useCallback(async () => {
    try {
      const sec = await vpnService.getSecurityStatus();
      setSecurityStatus(sec);
    } catch (err) {
      console.error('Failed to get security status:', err);
    }
  }, []);

  // Run diagnostics
  const refreshDiagnostics = useCallback(async () => {
    setIsLoadingDiagnostics(true);
    try {
      const diag = await vpnService.runDiagnostics();
      setDiagnosticReport(diag);
    } catch (err) {
      console.error('Failed to run diagnostics:', err);
    } finally {
      setIsLoadingDiagnostics(false);
    }
  }, []);

  // Fetch session history
  const fetchSessions = useCallback(async () => {
    try {
      const hist = await vpnService.getSessionHistory();
      setSessions(hist);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshStatus();
    fetchServers();
    refreshIp();
    fetchSettings();
    refreshSecurity();
    refreshDiagnostics();
    fetchSessions();
  }, [refreshStatus, fetchServers, refreshIp, fetchSettings, refreshSecurity, refreshDiagnostics, fetchSessions]);

  // Periodic polling for statistics and state
  useEffect(() => {
    const timer = setInterval(async () => {
      if (connectionState === 'connected') {
        try {
          const s = await vpnService.getStatistics();
          setStats(s);
        } catch {
          // ignore polling error
        }
      }
      refreshStatus();
    }, APP_CONFIG.pollingIntervalMs);

    return () => clearInterval(timer);
  }, [connectionState, refreshStatus]);

  // Toggle connection
  const toggleConnection = async () => {
    setErrorMessage(null);
    if (connectionState === 'connected') {
      try {
        setConnectionState('disconnecting');
        const res = await vpnService.disconnect();
        setConnectionState(res.state);
        refreshIp();
        refreshSecurity();
        fetchSessions();
      } catch (err: any) {
        setErrorMessage(err?.toString() || 'Failed to disconnect');
        setConnectionState('error');
      }
    } else {
      if (!currentServer) {
        setErrorMessage('Please select or import a WireGuard server first.');
        return;
      }
      try {
        setConnectionState('connecting');
        const res = await vpnService.connect(currentServer.id);
        setConnectionState(res.state);
        setCurrentServer(res.currentServer);
        refreshIp();
        refreshSecurity();
        fetchSessions();
      } catch (err: any) {
        setErrorMessage(err?.toString() || 'Connection failed');
        setConnectionState('error');
      }
    }
  };

  // Toggle favorite server
  const toggleFavorite = async (serverId: string) => {
    try {
      await vpnService.toggleFavorite(serverId);
      fetchServers();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  // Import configuration
  const importConfiguration = async (content: string, name?: string) => {
    const newServer = await vpnService.importConfiguration(content, name);
    await fetchServers();
    setCurrentServer(newServer);
    return newServer;
  };

  // Delete server
  const deleteServer = async (serverId: string) => {
    try {
      await vpnService.deleteServer(serverId);
      if (currentServer?.id === serverId) {
        setCurrentServer(null);
      }
      fetchServers();
    } catch (err) {
      console.error('Failed to delete server:', err);
    }
  };

  // Toggle kill switch
  const toggleKillSwitch = async (enable: boolean) => {
    try {
      await vpnService.toggleKillSwitch(enable);
      refreshSecurity();
    } catch (err: any) {
      setErrorMessage(err?.toString() || 'Failed to update firewall rule');
    }
  };

  // Update settings
  const updateSettings = async (newSettings: AppSettings) => {
    try {
      const updated = await vpnService.updateSettings(newSettings);
      setSettings(updated);
      refreshSecurity();
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  // Clear history
  const clearSessionHistory = async () => {
    try {
      await vpnService.clearSessionHistory();
      setSessions([]);
    } catch (err) {
      console.error('Failed to clear sessions:', err);
    }
  };

  return (
    <VpnContext.Provider
      value={{
        connectionState,
        currentServer,
        servers,
        errorMessage,
        ipInfo,
        isVerifyingIp,
        stats,
        securityStatus,
        settings,
        diagnosticReport,
        isLoadingDiagnostics,
        sessions,
        setCurrentServer,
        setErrorMessage,
        toggleConnection,
        refreshStatus,
        refreshIp,
        fetchServers,
        toggleFavorite,
        importConfiguration,
        deleteServer,
        toggleKillSwitch,
        updateSettings,
        refreshSecurity,
        refreshDiagnostics,
        clearSessionHistory,
      }}
    >
      {children}
    </VpnContext.Provider>
  );
};

export const useVpnContext = (): VpnContextType => {
  const context = useContext(VpnContext);
  if (!context) {
    throw new Error('useVpnContext must be used within a VpnProvider');
  }
  return context;
};
