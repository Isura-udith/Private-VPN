import { Star, Trash2, CheckCircle2 } from 'lucide-react';
import { ServerConfig } from '../types/vpn';

interface ServerCardProps {
  server: ServerConfig;
  isSelected: boolean;
  isConnected: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export const ServerCard: React.FC<ServerCardProps> = ({
  server,
  isSelected,
  isConnected,
  onSelect,
  onToggleFavorite,
  onDelete,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`group relative p-4 rounded-2xl border transition-all cursor-pointer select-none ${
        isSelected
          ? isConnected
            ? 'bg-emerald-950/20 border-emerald-500/40 shadow-md shadow-emerald-500/5'
            : 'bg-blue-950/20 border-blue-500/40 shadow-md shadow-blue-500/5'
          : 'bg-[#151D30] border-slate-800/80 hover:border-slate-700 hover:bg-[#1C2740]'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
              isSelected && isConnected
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-300 border border-slate-700/60'
            }`}
          >
            {server.countryCode || 'VPN'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white group-hover:text-blue-300 transition">
                {server.name}
              </span>
              {isSelected && isConnected && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  ACTIVE
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400">
              {server.city}, {server.country}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleFavorite}
            title={server.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800/60 transition"
          >
            <Star
              className={`w-4 h-4 ${
                server.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
              }`}
            />
          </button>

          {onDelete && server.isCustom && (
            <button
              onClick={onDelete}
              title="Delete server configuration"
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800/60 transition opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/60 text-[11px] text-slate-500 font-mono">
        <span className="truncate max-w-[160px]">{server.endpoint}</span>
        <span className="text-slate-400">{server.provider || 'WireGuard'}</span>
      </div>
    </div>
  );
};
