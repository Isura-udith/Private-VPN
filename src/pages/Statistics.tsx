import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  Clock,
  History as HistoryIcon,
  Trash2,
  Server,
} from 'lucide-react';
import { VpnStats, ConnectionSession } from '../types/vpn';

interface StatisticsProps {
  stats: VpnStats;
  sessions: ConnectionSession[];
  onClearHistory: () => Promise<void>;
}

export const Statistics: React.FC<StatisticsProps> = ({ stats, sessions, onClearHistory }) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Tunnel Statistics & History</h2>
          <p className="text-xs text-slate-400">
            Real-time throughput metrics and historical session records
          </p>
        </div>

        {sessions.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Live Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#151D30] border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Session Time</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {formatDuration(stats.sessionDurationSecs)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#151D30] border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
            <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
            <span>Current Download</span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400">
            {formatBytes(stats.downloadSpeed)}/s
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#151D30] border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
            <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
            <span>Current Upload</span>
          </div>
          <div className="text-xl font-bold font-mono text-blue-400">
            {formatBytes(stats.uploadSpeed)}/s
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#151D30] border border-slate-800">
          <div className="text-xs text-slate-400 font-medium mb-1">Total Transferred</div>
          <div className="text-xl font-bold font-mono text-white">
            {formatBytes(stats.totalDownloaded + stats.totalUploaded)}
          </div>
        </div>
      </div>

      {/* Session History Table */}
      <div className="bg-[#151D30] border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <HistoryIcon className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Recent Connection History
          </h3>
        </div>

        {sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                  <th className="pb-3 pl-2">Gateway Server</th>
                  <th className="pb-3">Connected Time</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Data Exchanged</th>
                  <th className="pb-3 pr-2">Termination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 pl-2 flex items-center gap-2 font-sans font-semibold text-white">
                      <Server className="w-3.5 h-3.5 text-slate-500" />
                      <span>{sess.serverName}</span>
                    </td>
                    <td className="py-3 text-slate-400">
                      {new Date(sess.startTime).toLocaleString()}
                    </td>
                    <td className="py-3">{formatDuration(sess.durationSeconds)}</td>
                    <td className="py-3">
                      {formatBytes(sess.bytesDownloaded + sess.bytesUploaded)}
                    </td>
                    <td className="py-3 pr-2 text-slate-400 font-sans">
                      {sess.disconnectedReason || 'Graceful exit'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            No previous connection sessions recorded yet.
          </div>
        )}
      </div>
    </div>
  );
};
