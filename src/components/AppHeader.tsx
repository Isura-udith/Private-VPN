import { Shield, ShieldAlert, Activity } from 'lucide-react';
import { ConnectionState } from '../types/vpn';

interface AppHeaderProps {
  connectionState: ConnectionState;
  onRefreshIp: () => void;
  isVerifying: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  connectionState,
  onRefreshIp,
  isVerifying,
}) => {
  const getStatusBadge = () => {
    switch (connectionState) {
      case 'connected':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            PROTECTED
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            CONNECTING
          </div>
        );
      case 'reconnecting':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            RECONNECTING
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full text-xs font-medium">
            <ShieldAlert className="w-3.5 h-3.5" />
            CONNECTION ERROR
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 text-slate-400 rounded-full text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            UNPROTECTED
          </div>
        );
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur flex items-center justify-between px-6 select-none">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-white">Private VPN</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Desktop
            </span>
          </div>
          <p className="text-xs text-slate-400">WireGuard Encrypted Tunneling</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {getStatusBadge()}
        <button
          onClick={onRefreshIp}
          disabled={isVerifying}
          title="Verify IP & Network Status"
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition disabled:opacity-50"
        >
          <Activity className={`w-4 h-4 ${isVerifying ? 'animate-spin text-blue-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};
