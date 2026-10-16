import React from 'react';
import { ArrowDown, ArrowUp, Clock, Activity } from 'lucide-react';
import { VpnStats } from '../types/vpn';

interface StatisticsCardProps {
  stats: VpnStats;
}

export const StatisticsCard: React.FC<StatisticsCardProps> = ({ stats }) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSec: number): string => {
    return `${formatBytes(bytesPerSec)}/s`;
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-[#151D30] border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Tunnel Statistics
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-mono">{formatDuration(stats.sessionDurationSecs)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Download */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-medium mb-1">
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Download</span>
          </div>
          <div className="font-mono text-base font-bold text-white mb-0.5">
            {formatSpeed(stats.downloadSpeed)}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Total: {formatBytes(stats.totalDownloaded)}
          </div>
        </div>

        {/* Upload */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-medium mb-1">
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Upload</span>
          </div>
          <div className="font-mono text-base font-bold text-white mb-0.5">
            {formatSpeed(stats.uploadSpeed)}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Total: {formatBytes(stats.totalUploaded)}
          </div>
        </div>
      </div>
    </div>
  );
};
