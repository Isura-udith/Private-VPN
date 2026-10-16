import React from 'react';
import {
  LayoutDashboard,
  Globe2,
  ShieldCheck,
  BarChart3,
  Terminal,
  Settings,
} from 'lucide-react';

export type TabType = 'dashboard' | 'locations' | 'security' | 'statistics' | 'diagnostics' | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'locations', label: 'Locations', icon: Globe2 },
    { id: 'security', label: 'Security Center', icon: ShieldCheck },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    { id: 'diagnostics', label: 'Diagnostics', icon: Terminal },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <aside className="w-56 border-r border-slate-800 bg-[#0B0F19] p-3 flex flex-col justify-between shrink-0 select-none">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-500 space-y-1">
        <div className="flex items-center justify-between font-mono">
          <span>Engine</span>
          <span className="text-slate-400 font-semibold">WireGuard NT</span>
        </div>
        <div className="flex items-center justify-between font-mono">
          <span>Version</span>
          <span className="text-slate-400">1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
