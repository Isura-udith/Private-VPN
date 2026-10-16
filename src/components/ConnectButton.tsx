import { Power, Loader2, AlertTriangle } from 'lucide-react';
import { ConnectionState } from '../types/vpn';

interface ConnectButtonProps {
  state: ConnectionState;
  onToggle: () => void;
  disabled?: boolean;
}

export const ConnectButton: React.FC<ConnectButtonProps> = ({ state, onToggle, disabled }) => {
  const isTransitioning = state === 'connecting' || state === 'disconnecting' || state === 'reconnecting';
  const isConnected = state === 'connected';

  const getButtonStyles = () => {
    switch (state) {
      case 'connected':
        return {
          ring: 'border-emerald-500/40 bg-emerald-500/10 shadow-lg shadow-emerald-500/20',
          btn: 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/40',
          pulse: 'animate-pulse-ring bg-emerald-500/20',
        };
      case 'connecting':
      case 'reconnecting':
        return {
          ring: 'border-cyan-500/40 bg-cyan-500/10 shadow-lg shadow-cyan-500/20',
          btn: 'bg-cyan-500 text-slate-950 shadow-cyan-500/40',
          pulse: 'animate-spin bg-cyan-500/20',
        };
      case 'disconnecting':
        return {
          ring: 'border-amber-500/40 bg-amber-500/10 shadow-lg shadow-amber-500/20',
          btn: 'bg-amber-500 text-slate-950 shadow-amber-500/40',
          pulse: 'animate-pulse bg-amber-500/20',
        };
      case 'error':
        return {
          ring: 'border-red-500/40 bg-red-500/10 shadow-lg shadow-red-500/20',
          btn: 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/40',
          pulse: '',
        };
      default:
        return {
          ring: 'border-slate-700/60 bg-slate-800/20 hover:border-blue-500/40 hover:bg-blue-500/5',
          btn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30',
          pulse: '',
        };
    }
  };

  const styles = getButtonStyles();

  return (
    <div className="flex flex-col items-center justify-center my-4">
      <div className="relative flex items-center justify-center">
        {/* Ambient pulse ring */}
        <div
          className={`absolute w-36 h-36 rounded-full transition-all duration-700 pointer-events-none ${styles.pulse}`}
        />

        {/* Outer frame */}
        <div
          className={`w-32 h-32 rounded-full border-2 flex items-center justify-center p-2 transition-all duration-500 ${styles.ring}`}
        >
          {/* Main click button */}
          <button
            onClick={onToggle}
            disabled={disabled || isTransitioning}
            className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-300 transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${styles.btn}`}
          >
            {isTransitioning ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : isConnected ? (
              <Power className="w-8 h-8" />
            ) : state === 'error' ? (
              <AlertTriangle className="w-8 h-8" />
            ) : (
              <Power className="w-8 h-8" />
            )}
            <span className="text-[10px] font-black uppercase tracking-wider mt-1">
              {isTransitioning
                ? state === 'disconnecting'
                  ? 'Halting'
                  : 'Starting'
                : isConnected
                ? 'Disconnect'
                : state === 'error'
                ? 'Retry'
                : 'Connect'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
