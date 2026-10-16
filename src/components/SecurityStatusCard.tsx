import { ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { SecurityStatus } from '../types/vpn';

interface SecurityStatusCardProps {
  securityStatus: SecurityStatus;
  onOpenSecurity: () => void;
}

export const SecurityStatusCard: React.FC<SecurityStatusCardProps> = ({
  securityStatus,
  onOpenSecurity,
}) => {
  return (
    <div className="bg-[#151D30] border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Security Status
          </h3>
        </div>
        <button
          onClick={onOpenSecurity}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
        >
          <span>Configure</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <div className="text-[11px] text-slate-500 font-medium mb-1">Kill Switch</div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                securityStatus.killSwitchActive
                  ? 'bg-emerald-400 animate-pulse'
                  : securityStatus.killSwitchEnabled
                  ? 'bg-blue-400'
                  : 'bg-slate-600'
              }`}
            />
            <span className="text-xs font-bold text-slate-200">
              {securityStatus.killSwitchActive
                ? 'Enforcing'
                : securityStatus.killSwitchEnabled
                ? 'Armed'
                : 'Disabled'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <div className="text-[11px] text-slate-500 font-medium mb-1">DNS Leak Guard</div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-bold text-slate-200">Active</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <div className="text-[11px] text-slate-500 font-medium mb-1">IPv6 Handling</div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                securityStatus.ipv6Protection === 'blocked'
                  ? 'bg-emerald-400'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-xs font-bold text-slate-200 capitalize">
              {securityStatus.ipv6Protection}
            </span>
          </div>
        </div>
      </div>

      {securityStatus.warnings.length > 0 && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="text-[11px] leading-tight">{securityStatus.warnings[0]}</span>
        </div>
      )}
    </div>
  );
};
