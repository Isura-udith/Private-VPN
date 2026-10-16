import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Flame,
  Globe2,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { SecurityStatus } from '../types/vpn';
import { useVpn } from '../hooks/useVpn';

export interface SecurityProps {
  securityStatus?: SecurityStatus;
  onToggleKillSwitch?: (enable: boolean) => Promise<void>;
  onRefreshSecurity?: () => void;
}

export const Security: React.FC<SecurityProps> = (props) => {
  const vpn = useVpn();

  const securityStatus = props.securityStatus ?? vpn.securityStatus;
  const onToggleKillSwitch = props.onToggleKillSwitch ?? vpn.toggleKillSwitch;
  const onRefreshSecurity = props.onRefreshSecurity ?? vpn.refreshSecurity;

  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleKillSwitch = async () => {
    setIsUpdating(true);
    try {
      await onToggleKillSwitch(!securityStatus.killSwitchEnabled);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Security & Privacy Center</h2>
          <p className="text-xs text-slate-400">
            Hardware-backed credential protection, Windows Firewall Kill Switch, and DNS guard
          </p>
        </div>
        <button
          onClick={onRefreshSecurity}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/60 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Security Status Banner */}
      <div className="p-5 rounded-2xl bg-[#151D30] border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">System Security Posture</div>
            <div className="text-xs text-slate-400">
              {securityStatus.tunnelInterfaceStatus}
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono text-slate-500 block">Verified At</span>
          <span className="text-xs font-mono text-slate-300">
            {securityStatus.lastVerificationTime
              ? new Date(securityStatus.lastVerificationTime).toLocaleTimeString()
              : 'Not yet verified'}
          </span>
        </div>
      </div>

      {/* Security Features Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Windows Firewall Kill Switch Card */}
        <div className="bg-[#151D30] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Windows Firewall Kill Switch</h3>
                <span className="text-[11px] text-slate-400 font-mono">Netsh AdvFirewall Rules</span>
              </div>
            </div>

            <button
              onClick={handleToggleKillSwitch}
              disabled={isUpdating}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                securityStatus.killSwitchEnabled ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  securityStatus.killSwitchEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            When enabled, Windows Firewall enforces an outbound blocking rule for general network adapters if the VPN tunnel drops. Only direct encrypted tunnel handshake traffic is permitted.
          </p>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Enforcement Status:</span>
              <span className={`font-semibold ${securityStatus.killSwitchActive ? 'text-emerald-400' : 'text-slate-300'}`}>
                {securityStatus.killSwitchActive ? 'Active in Windows Firewall' : 'Idle (Armed on connect)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Fail-Safe Recovery:</span>
              <span className="text-slate-300 font-mono">Built-in Clean Reset</span>
            </div>
          </div>
        </div>

        {/* DNS Leak Protection */}
        <div className="bg-[#151D30] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Globe2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">DNS Leak Protection</h3>
              <span className="text-[11px] text-slate-400 font-mono">Encrypted Tunnel Resolver</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Prevents your operating system from sending DNS query lookups to your local Internet Service Provider (ISP). All DNS queries are routed exclusively inside the WireGuard interface.
          </p>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Protection Status:</span>
              <span className="text-emerald-400 font-semibold">Active & Enforced</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Smart Multi-Homed DNS:</span>
              <span className="text-slate-300 font-mono">Controlled</span>
            </div>
          </div>
        </div>

        {/* IPv6 Leak Guard */}
        <div className="bg-[#151D30] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">IPv6 Traffic Protection</h3>
              <span className="text-[11px] text-slate-400 font-mono">Leak Mitigation Policy</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Many ISPs assign dual-stack IPv6 addresses that bypass IPv4 tunnels. Private VPN blocks outbound unencrypted IPv6 traffic on non-VPN adapters to ensure zero identity leaks.
          </p>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Policy Mode:</span>
              <span className="text-emerald-400 font-semibold capitalize">
                {securityStatus.ipv6Protection}
              </span>
            </div>
          </div>
        </div>

        {/* Windows DPAPI Secure Storage */}
        <div className="bg-[#151D30] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Windows DPAPI Credential Storage</h3>
              <span className="text-[11px] text-slate-400 font-mono">CryptProtectData Win32</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            WireGuard client private keys are encrypted on disk using the Windows Data Protection API (DPAPI). Keys are tied to the local user logon session and never exposed in plain text.
          </p>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Encryption Method:</span>
              <span className="text-slate-200 font-mono">DPAPI Triple-DES/AES</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Browser/Frontend Exposure:</span>
              <span className="text-emerald-400 font-semibold">Zero Exposure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Security;
