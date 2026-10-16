import React from 'react';
import { Globe, MapPin, Building2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { IpInfo } from '../types/vpn';

interface IpAddressCardProps {
  ipInfo: IpInfo;
  onRefresh: () => void;
  isLoading: boolean;
}

export const IpAddressCard: React.FC<IpAddressCardProps> = ({ ipInfo, onRefresh, isLoading }) => {
  return (
    <div className="bg-[#151D30] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Public IP Verification
          </h3>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Original IP */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <div className="text-[11px] text-slate-500 font-medium mb-1">Original Public IP</div>
          <div className="font-mono text-sm font-semibold text-slate-300">
            {ipInfo.originalIp || 'Not yet recorded'}
          </div>
        </div>

        {/* Current IP */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-500 font-medium">Active Public IP</span>
            {ipInfo.isDifferent ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                CHANGED
              </span>
            ) : ipInfo.currentIp ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                SAME
              </span>
            ) : null}
          </div>
          <div className="font-mono text-sm font-semibold text-white">
            {ipInfo.currentIp || 'Checking...'}
          </div>
        </div>
      </div>

      {/* Geolocation & ISP */}
      <div className="grid grid-cols-2 gap-3 text-xs text-slate-400 bg-slate-900/40 p-3 rounded-xl border border-slate-800/40">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">
            {ipInfo.city && ipInfo.country
              ? `${ipInfo.city}, ${ipInfo.country}`
              : ipInfo.country || 'Location hidden/unknown'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">{ipInfo.isp || 'ISP undisclosed'}</span>
        </div>
      </div>

      {/* Verification footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          {ipInfo.status === 'verified' ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Verified by HTTPS Endpoints</span>
            </>
          ) : ipInfo.status === 'failed' ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-400 font-medium">{ipInfo.errorMessage || 'Verification failed'}</span>
            </>
          ) : (
            <span>Verification pending</span>
          )}
        </div>
        {ipInfo.verifiedAt && (
          <span className="font-mono">{new Date(ipInfo.verifiedAt).toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  );
};
