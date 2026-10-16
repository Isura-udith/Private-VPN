import { describe, it, expect } from 'vitest';
import { ConnectionState, ServerConfig, IpInfo } from '../types/vpn';
import { formatBytes, formatDuration, formatSpeed } from '../utils/formatters';
import { APP_CONFIG, INITIAL_SETTINGS } from '../constants';

describe('Private VPN Frontend State, Models & Utilities', () => {
  it('correctly models connection states and transitions', () => {
    const states: ConnectionState[] = [
      'disconnected',
      'connecting',
      'connected',
      'reconnecting',
      'disconnecting',
      'error',
    ];
    expect(states).toHaveLength(6);
    expect(states.includes('connected')).toBe(true);
    expect(states.includes('error')).toBe(true);
  });

  it('validates server configuration model', () => {
    const server: ServerConfig = {
      id: 'srv-us-1',
      name: 'US East Security Node',
      country: 'United States',
      city: 'New York',
      countryCode: 'US',
      endpoint: '198.51.100.25:51820',
      publicKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      allowedIps: '0.0.0.0/0, ::/0',
      dns: '1.1.1.1',
      isFavorite: true,
      lastUsed: null,
      isCustom: false,
      provider: 'Authorized Node',
    };

    expect(server.endpoint).toContain(':51820');
    expect(server.publicKey.length).toBe(44);
    expect(server.isFavorite).toBe(true);
  });

  it('validates IP verification model detecting address difference', () => {
    const preVpnIp: IpInfo = {
      originalIp: '203.0.113.50',
      currentIp: '203.0.113.50',
      isDifferent: false,
      country: 'United States',
      city: 'LocalCity',
      isp: 'Local ISP',
      verifiedAt: '2026-10-16T10:00:00Z',
      status: 'verified',
    };
    expect(preVpnIp.isDifferent).toBe(false);

    const postVpnIp: IpInfo = {
      originalIp: '203.0.113.50',
      currentIp: '198.51.100.99',
      isDifferent: true,
      country: 'Switzerland',
      city: 'Zurich',
      isp: 'VPN Data Center',
      verifiedAt: '2026-10-16T10:01:00Z',
      status: 'verified',
    };

    expect(postVpnIp.isDifferent).toBe(true);
    expect(postVpnIp.currentIp).not.toBe(preVpnIp.originalIp);
  });

  it('handles byte formatting calculation accurately using centralized utility', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
    expect(formatBytes(2684354560)).toBe('2.5 GB');
  });

  it('handles session duration formatting accurately using centralized utility', () => {
    expect(formatDuration(0)).toBe('0m 0s');
    expect(formatDuration(45)).toBe('0m 45s');
    expect(formatDuration(125)).toBe('2m 5s');
    expect(formatDuration(3665)).toBe('1h 1m 5s');
  });

  it('handles network speed formatting accurately', () => {
    expect(formatSpeed(1048576)).toBe('1 MB/s');
    expect(formatSpeed(5242880)).toBe('5 MB/s');
  });

  it('contains expected app constants and defaults', () => {
    expect(APP_CONFIG.name).toBe('Private VPN');
    expect(APP_CONFIG.pollingIntervalMs).toBe(2000);
    expect(INITIAL_SETTINGS.theme).toBe('dark');
  });
});
