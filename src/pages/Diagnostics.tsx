import React, { useState } from 'react';
import {
  Terminal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { DiagnosticReport } from '../types/vpn';

interface DiagnosticsProps {
  report: DiagnosticReport | null;
  isLoading: boolean;
  onRefreshDiagnostics: () => void;
}

export const Diagnostics: React.FC<DiagnosticsProps> = ({
  report,
  isLoading,
  onRefreshDiagnostics,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!report) return;
    const text = JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">System & Network Diagnostics</h2>
          <p className="text-xs text-slate-400">
            Hardware driver health, routing table inspection, and sanitized event logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            disabled={!report}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/60 transition disabled:opacity-50"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Report'}</span>
          </button>

          <button
            onClick={onRefreshDiagnostics}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Run Diagnostics</span>
          </button>
        </div>
      </div>

      {report ? (
        <>
          {/* Diagnostic Checks Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* WireGuard Engine */}
            <div className="p-4 rounded-2xl bg-[#151D30] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">WireGuard for Windows</span>
                {report.wireguardInstalled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-400 truncate">
                {report.wireguardPath || 'Not found in PATH or standard paths'}
              </div>
              {!report.wireguardInstalled && (
                <div className="text-[11px] text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  Run in terminal: <code className="font-mono font-bold">winget install WireGuard.WireGuard</code>
                </div>
              )}
            </div>

            {/* Elevated Permissions */}
            <div className="p-4 rounded-2xl bg-[#151D30] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Windows Permissions</span>
                {report.isElevated ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                {report.isElevated
                  ? 'Administrator Token Active'
                  : 'Unelevated (Admin required for tunnels)'}
              </div>
            </div>

            {/* Tunnel Service State */}
            <div className="p-4 rounded-2xl bg-[#151D30] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">WireGuard Service</span>
                {report.tunnelActive ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className="text-xs font-mono text-slate-500">STOPPED</span>
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                {report.tunnelActive ? 'WireGuardNT Adapter Running' : 'No active tunnel service'}
              </div>
            </div>

            {/* Default Route / Gateway */}
            <div className="p-4 rounded-2xl bg-[#151D30] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Default Gateway</span>
                {report.defaultGateway ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                {report.defaultGateway || 'No default route detected'}
              </div>
            </div>

            {/* Active DNS Servers */}
            <div className="p-4 rounded-2xl bg-[#151D30] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Configured DNS</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-[11px] font-mono text-slate-400 truncate">
                {report.activeDnsServers.join(', ')}
              </div>
            </div>

            {/* Network Reachability */}
            <div className="p-4 rounded-2xl bg-[#151D30] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Internet Connectivity</span>
                {report.reachabilityCheck ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                {report.currentPublicIp ? `Public IP: ${report.currentPublicIp}` : 'Query pending'}
              </div>
            </div>
          </div>

          {/* Active Warnings */}
          {report.warnings.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-amber-300 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Diagnostic Advisories</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {report.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Sanitized Live Event Log Console */}
          <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-5 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Redacted System Diagnostics Console
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Private Keys Stripped
              </span>
            </div>

            <div className="h-56 overflow-y-auto font-mono text-[11px] space-y-1.5 p-3 rounded-xl bg-slate-950/80 border border-slate-900 text-slate-300">
              {report.recentLogs.length > 0 ? (
                report.recentLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-600 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`font-semibold shrink-0 uppercase text-[10px] px-1 py-0.2 rounded ${
                        log.level === 'error'
                          ? 'bg-red-500/20 text-red-400'
                          : log.level === 'warn'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-slate-300 break-all">{log.message}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-600 italic">No diagnostic events recorded yet.</div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="p-12 text-center text-slate-500 text-xs">
          Loading diagnostic report...
        </div>
      )}
    </div>
  );
};
