export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnecting'
  | 'error';

export interface ServerConfig {
  id: string;
  name: string;
  country: string;
  city: string;
  countryCode: string;
  endpoint: string;
  publicKey: string;
  allowedIps: string;
  dns?: string;
  isFavorite?: boolean;
  lastUsed?: string | null;
  isCustom?: boolean;
  provider?: string;
}

export interface IpInfo {
  originalIp: string | null;
  currentIp: string | null;
  isDifferent: boolean;
  country: string | null;
  city: string | null;
  isp: string | null;
  verifiedAt: string | null;
  status: 'unverified' | 'verifying' | 'verified' | 'failed';
  errorMessage?: string | null;
}

export interface VpnStats {
  uploadSpeed: number; // bytes per second
  downloadSpeed: number; // bytes per second
  totalUploaded: number; // total bytes
  totalDownloaded: number; // total bytes
  sessionDurationSecs: number;
  connectionHealth: 'optimal' | 'moderate' | 'degraded' | 'disconnected';
  lastHandshake: string | null;
}

export interface SecurityStatus {
  killSwitchEnabled: boolean;
  killSwitchActive: boolean;
  dnsProtection: boolean;
  ipv6Protection: 'blocked' | 'routed' | 'disabled';
  tunnelInterfaceStatus: string;
  lastVerificationTime: string | null;
  warnings: string[];
}

export interface AppSettings {
  theme: 'dark' | 'light';
  startWithWindows: boolean;
  autoConnectOnStart: boolean;
  preferredServerId: string | null;
  autoReconnect: boolean;
  killSwitch: boolean;
  blockIpv6: boolean;
  notifications: boolean;
  connectionTimeoutSeconds: number;
  ipCheckEndpoint: string;
  recordSessionHistory: boolean;
}

export interface DiagnosticLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface DiagnosticReport {
  wireguardInstalled: boolean;
  wireguardPath: string | null;
  isElevated: boolean;
  tunnelActive: boolean;
  defaultGateway: string | null;
  activeDnsServers: string[];
  currentPublicIp: string | null;
  reachabilityCheck: boolean;
  recentLogs: DiagnosticLog[];
  warnings: string[];
}

export interface ConnectionSession {
  id: string;
  serverId: string;
  serverName: string;
  startTime: string;
  endTime: string | null;
  bytesUploaded: number;
  bytesDownloaded: number;
  durationSeconds: number;
  disconnectedReason: string | null;
}
