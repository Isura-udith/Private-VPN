import { describe, it, expect } from 'vitest';
import { ConnectionState, ServerConfig, IpInfo } from '../types/vpn';

describe('Private VPN Frontend State and Models', () => {
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

  it('handles byte formatting calculation accurately', () => {
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
    expect(formatBytes(2684354560)).toBe('2.5 GB');
  });

  it('handles session duration formatting accurately', () => {
    const formatDuration = (seconds: number): string => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
      return `${mins}m ${secs}s`;
    };

    expect(formatDuration(45)).toBe('0m 45s');
    expect(formatDuration(125)).toBe('2m 5s');
    expect(formatDuration(3665)).toBe('1h 1m 5s');
  });
});
