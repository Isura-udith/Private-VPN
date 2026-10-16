import React from 'react';
import { ConnectButton } from '../components/ConnectButton';
import { IpAddressCard } from '../components/IpAddressCard';
import { StatisticsCard } from '../components/StatisticsCard';
import { SecurityStatusCard } from '../components/SecurityStatusCard';
import {
  ConnectionState,
  ServerConfig,
  IpInfo,
  VpnStats,
  SecurityStatus,
} from '../types/vpn';
import { useVpn } from '../hooks/useVpn';
import { Globe2, AlertTriangle, ArrowRight } from 'lucide-react';

export interface DashboardProps {
  connectionState?: ConnectionState;
  currentServer?: ServerConfig | null;
  ipInfo?: IpInfo;
  stats?: VpnStats;
  securityStatus?: SecurityStatus;
  errorMessage?: string | null;
  onToggleConnection?: () => void;
  onRefreshIp?: () => void;
  isVerifyingIp?: boolean;
  onNavigateToLocations?: () => void;
  onNavigateToSecurity?: () => void;
  onNavigateToDiagnostics?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = (props) => {
  const vpn = useVpn();

  const connectionState = props.connectionState ?? vpn.connectionState;
  const currentServer = props.currentServer !== undefined ? props.currentServer : vpn.currentServer;
  const ipInfo = props.ipInfo ?? vpn.ipInfo;
  const stats = props.stats ?? vpn.stats;
  const securityStatus = props.securityStatus ?? vpn.securityStatus;
  const errorMessage = props.errorMessage !== undefined ? props.errorMessage : vpn.errorMessage;
  const onToggleConnection = props.onToggleConnection ?? vpn.toggleConnection;
  const onRefreshIp = props.onRefreshIp ?? vpn.refreshIp;
  const isVerifyingIp = props.isVerifyingIp ?? vpn.isVerifyingIp;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto overflow-y-auto">
      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-bold text-red-200 mb-0.5">Connection Alert</div>
            <div>{errorMessage}</div>
          </div>
          {props.onNavigateToDiagnostics && (
            <button
              onClick={props.onNavigateToDiagnostics}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 transition shrink-0"
            >
              Diagnostics
            </button>
          )}
        </div>
      )}

      {/* Main Connection Section */}
      <div className="bg-[#151D30] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-linear-to-b from-blue-600/5 via-transparent to-transparent pointer-events-none" />

        {/* Server Selector Bar */}
        <div className="w-full max-w-md flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Globe2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Selected Gateway</div>
              <div className="text-xs font-bold text-white truncate max-w-50">
                {currentServer ? currentServer.name : 'No server configured'}
              </div>
            </div>
          </div>

          {props.onNavigateToLocations && (
            <button
              onClick={props.onNavigateToLocations}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition"
            >
              <span>Change</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Main Connect Button */}
        <ConnectButton
          state={connectionState}
          onToggle={onToggleConnection}
          disabled={!currentServer && connectionState === 'disconnected'}
        />

        {/* Helper prompt if no server */}
        {!currentServer && connectionState === 'disconnected' && (
          <div className="text-xs text-amber-400/90 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20 flex items-center gap-2 mt-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Please import or select a WireGuard server to connect.</span>
          </div>
        )}
      </div>

      {/* Real IP Verification Card */}
      <IpAddressCard
        ipInfo={ipInfo}
        onRefresh={onRefreshIp}
        isLoading={isVerifyingIp}
      />

      {/* Statistics and Security Row */}
      <div className="grid grid-cols-2 gap-6">
        <StatisticsCard stats={stats} />
        <SecurityStatusCard
          securityStatus={securityStatus}
          onOpenSecurity={props.onNavigateToSecurity || (() => {})}
        />
      </div>
    </div>
  );
};

export default Dashboard;
