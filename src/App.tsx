import React, { useState, useEffect, useCallback } from 'react';
import { AppHeader } from './components/AppHeader';
import { Sidebar, TabType } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Locations } from './pages/Locations';
import { Security } from './pages/Security';
import { Statistics } from './pages/Statistics';
import { Diagnostics } from './pages/Diagnostics';
import { Settings } from './pages/Settings';
import {
  ConnectionState,
  ServerConfig,
  IpInfo,
  VpnStats,
  SecurityStatus,
  AppSettings,
  DiagnosticReport,
  ConnectionSession,
} from './types/vpn';
import { vpnService } from './services/vpn';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [currentServer, setCurrentServer] = useState<ServerConfig | null>(null);
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [ipInfo, setIpInfo] = useState<IpInfo>({
    originalIp: null,
    currentIp: null,
    isDifferent: false,
    country: null,
    city: null,
    isp: null,
    verifiedAt: null,
    status: 'unverified',
  });
  const [isVerifyingIp, setIsVerifyingIp] = useState(false);

  const [stats, setStats] = useState<VpnStats>({
    uploadSpeed: 0,
    downloadSpeed: 0,
    totalUploaded: 0,
    totalDownloaded: 0,
    sessionDurationSecs: 0,
    connectionHealth: 'disconnected',
    lastHandshake: null,
  });

  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    killSwitchEnabled: false,
    killSwitchActive: false,
    dnsProtection: true,
    ipv6Protection: 'blocked',
    tunnelInterfaceStatus: 'No active tunnel',
    lastVerificationTime: null,
    warnings: [],
  });

  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    startWithWindows: false,
    autoConnectOnStart: false,
    preferredServerId: null,
    autoReconnect: true,
    killSwitch: false,
    blockIpv6: true,
    notifications: true,
    connectionTimeoutSeconds: 30,
    ipCheckEndpoint: 'https://api64.ipify.org?format=json',
    recordSessionHistory: true,
  });

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
        } catch (e) {
          // ignore polling error
        }
      }
      refreshStatus();
    }, 2000);

    return () => clearInterval(timer);
  }, [connectionState, refreshStatus]);

  // Toggle connection
  const handleToggleConnection = async () => {
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
  const handleToggleFavorite = async (serverId: string) => {
    try {
      await vpnService.toggleFavorite(serverId);
      fetchServers();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  // Import configuration
  const handleImportConfig = async (content: string, name?: string) => {
    const newServer = await vpnService.importConfiguration(content, name);
    await fetchServers();
    setCurrentServer(newServer);
    setCurrentTab('dashboard');
  };

  // Delete server
  const handleDeleteServer = async (serverId: string) => {
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
  const handleToggleKillSwitch = async (enable: boolean) => {
    try {
      await vpnService.toggleKillSwitch(enable);
      refreshSecurity();
    } catch (err: any) {
      setErrorMessage(err?.toString() || 'Failed to update firewall rule');
    }
  };

  // Update settings
  const handleUpdateSettings = async (newSettings: AppSettings) => {
    try {
      const updated = await vpnService.updateSettings(newSettings);
      setSettings(updated);
      refreshSecurity();
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  // Clear history
  const handleClearHistory = async () => {
    try {
      await vpnService.clearSessionHistory();
      setSessions([]);
    } catch (err) {
      console.error('Failed to clear sessions:', err);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0B0F19] text-white overflow-hidden">
      <AppHeader
        connectionState={connectionState}
        onRefreshIp={refreshIp}
        isVerifying={isVerifyingIp}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

        <main className="flex-1 overflow-y-auto bg-[#0F172A]/40">
          {currentTab === 'dashboard' && (
            <Dashboard
              connectionState={connectionState}
              currentServer={currentServer}
              ipInfo={ipInfo}
              stats={stats}
              securityStatus={securityStatus}
              errorMessage={errorMessage}
              onToggleConnection={handleToggleConnection}
              onRefreshIp={refreshIp}
              isVerifyingIp={isVerifyingIp}
              onNavigateToLocations={() => setCurrentTab('locations')}
              onNavigateToSecurity={() => setCurrentTab('security')}
              onNavigateToDiagnostics={() => setCurrentTab('diagnostics')}
            />
          )}

          {currentTab === 'locations' && (
            <Locations
              servers={servers}
              selectedServer={currentServer}
              isConnected={connectionState === 'connected'}
              onSelectServer={(srv) => {
                setCurrentServer(srv);
                setCurrentTab('dashboard');
              }}
              onToggleFavorite={handleToggleFavorite}
              onImportConfig={handleImportConfig}
              onDeleteServer={handleDeleteServer}
            />
          )}

          {currentTab === 'security' && (
            <Security
              securityStatus={securityStatus}
              onToggleKillSwitch={handleToggleKillSwitch}
              onRefreshSecurity={refreshSecurity}
            />
          )}

          {currentTab === 'statistics' && (
            <Statistics
              stats={stats}
              sessions={sessions}
              onClearHistory={handleClearHistory}
            />
          )}

          {currentTab === 'diagnostics' && (
            <Diagnostics
              report={diagnosticReport}
              isLoading={isLoadingDiagnostics}
              onRefreshDiagnostics={refreshDiagnostics}
            />
          )}

          {currentTab === 'settings' && (
            <Settings
              settings={settings}
              servers={servers}
              onUpdateSettings={handleUpdateSettings}
              onClearHistory={handleClearHistory}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
