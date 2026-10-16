import { AppSettings, IpInfo, SecurityStatus, VpnStats } from '../types/vpn';

export const APP_CONFIG = {
  name: 'Private VPN',
  version: '1.0.0',
  engine: 'WireGuard NT',
  pollingIntervalMs: 2000,
  defaultIpEndpoint: 'https://api64.ipify.org?format=json',
  defaultTimeoutSeconds: 30,
} as const;

export const INITIAL_IP_INFO: IpInfo = {
  originalIp: null,
  currentIp: null,
  isDifferent: false,
  country: null,
  city: null,
  isp: null,
  verifiedAt: null,
  status: 'unverified',
};

export const INITIAL_STATS: VpnStats = {
  uploadSpeed: 0,
  downloadSpeed: 0,
  totalUploaded: 0,
  totalDownloaded: 0,
  sessionDurationSecs: 0,
  connectionHealth: 'disconnected',
  lastHandshake: null,
};

export const INITIAL_SECURITY_STATUS: SecurityStatus = {
  killSwitchEnabled: false,
  killSwitchActive: false,
  dnsProtection: true,
  ipv6Protection: 'blocked',
  tunnelInterfaceStatus: 'No active tunnel',
  lastVerificationTime: null,
  warnings: [],
};

export const INITIAL_SETTINGS: AppSettings = {
  theme: 'dark',
  startWithWindows: false,
  autoConnectOnStart: false,
  preferredServerId: null,
  autoReconnect: true,
  killSwitch: false,
  blockIpv6: true,
  notifications: true,
  connectionTimeoutSeconds: 30,
  ipCheckEndpoint: APP_CONFIG.defaultIpEndpoint,
  recordSessionHistory: true,
};
