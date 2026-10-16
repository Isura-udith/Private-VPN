import React, { useState } from 'react';
import { ConnectButton } from '../components/ConnectButton';
import { IpAddressCard } from '../components/IpAddressCard';
import { StatisticsCard } from '../components/StatisticsCard';
import { SecurityStatusCard } from '../components/SecurityStatusCard';
import { QrCodeModal } from '../components/QrCodeModal';
import {
  ConnectionState,
  ServerConfig,
  IpInfo,
  VpnStats,
  SecurityStatus,
} from '../types/vpn';
import { useVpn } from '../hooks/useVpn';
import { Globe2, AlertTriangle, ArrowRight, QrCode } from 'lucide-react';

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
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

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

          <div className="flex items-center gap-2">
            {currentServer && (
              <button
                onClick={() => setIsQrModalOpen(true)}
                title="Generate Mobile WireGuard QR Code"
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Mobile QR</span>
              </button>
            )}

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
        </div>

        {/* Notice if current server is a Demo/Sample server */}
        {currentServer && (!currentServer.isCustom || currentServer.endpoint.startsWith('198.51.100.') || currentServer.name.includes('[Sample Demo]')) && (
          <div className="w-full max-w-md mb-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Sample template profile. Import a real .conf to route internet.</span>
            </div>
            {props.onNavigateToLocations && (
              <button
                onClick={props.onNavigateToLocations}
                className="text-[11px] font-bold underline text-amber-200 hover:text-white shrink-0 ml-2"
              >
                Import
              </button>
            )}
          </div>
        )}

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

      {/* WireGuard Mobile QR Code Modal */}
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        server={currentServer}
      />
    </div>
  );
};

export default Dashboard;
