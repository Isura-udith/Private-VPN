import React, { useState, useEffect } from 'react';
import {
  Moon,
  Sun,
  Shield,
  Clock,
  Download,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { AppSettings, ServerConfig } from '../types/vpn';
import { useVpn } from '../hooks/useVpn';

export interface SettingsProps {
  settings?: AppSettings;
  servers?: ServerConfig[];
  onUpdateSettings?: (newSettings: AppSettings) => Promise<void>;
  onClearHistory?: () => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = (props) => {
  const vpn = useVpn();

  const settings = props.settings ?? vpn.settings;
  const servers = props.servers ?? vpn.servers;
  const onUpdateSettings = props.onUpdateSettings ?? vpn.updateSettings;
  const onClearHistory = props.onClearHistory ?? vpn.clearSessionHistory;

  const [currentSettings, setCurrentSettings] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings]);

  const handleToggle = (key: keyof AppSettings) => {
    const updated = {
      ...currentSettings,
      [key]: !currentSettings[key],
    };
    setCurrentSettings(updated);
    onUpdateSettings(updated);
    showSavedBadge();
  };

  const handleNumberChange = (key: keyof AppSettings, val: number) => {
    const updated = {
      ...currentSettings,
      [key]: val,
    };
    setCurrentSettings(updated);
    onUpdateSettings(updated);
    showSavedBadge();
  };

  const handleStringChange = (key: keyof AppSettings, val: string) => {
    const updated = {
      ...currentSettings,
      [key]: val,
    };
    setCurrentSettings(updated);
    onUpdateSettings(updated);
    showSavedBadge();
  };

  const showSavedBadge = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleExportSettings = () => {
    // Non-sensitive settings only! Never include private keys!
    const exportable = {
      theme: currentSettings.theme,
      startWithWindows: currentSettings.startWithWindows,
      autoConnectOnStart: currentSettings.autoConnectOnStart,
      autoReconnect: currentSettings.autoReconnect,
      killSwitch: currentSettings.killSwitch,
      blockIpv6: currentSettings.blockIpv6,
      notifications: currentSettings.notifications,
      connectionTimeoutSeconds: currentSettings.connectionTimeoutSeconds,
      ipCheckEndpoint: currentSettings.ipCheckEndpoint,
      recordSessionHistory: currentSettings.recordSessionHistory,
      exportedAt: new Date().toISOString(),
      appName: 'Private VPN',
      version: '1.0.0',
    };

    const blob = new Blob([JSON.stringify(exportable, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `private-vpn-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Preferences & Settings</h2>
          <p className="text-xs text-slate-400">
            Configure application startup, networking parameters, and theme
          </p>
        </div>

        {isSaved && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-medium animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Settings Saved</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Appearance & Theme */}
        <div className="p-5 rounded-2xl bg-[#151D30] border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Appearance
            </h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Application Theme</div>
              <div className="text-[11px] text-slate-400">Select dark cybersecurity or standard mode</div>
            </div>

            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <button
                onClick={() => {
                  handleStringChange('theme', 'dark');
                  document.documentElement.classList.remove('light');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  currentSettings.theme === 'dark'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark Navy</span>
              </button>
              <button
                onClick={() => {
                  handleStringChange('theme', 'light');
                  document.documentElement.classList.add('light');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  currentSettings.theme === 'light'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
            </div>
          </div>
        </div>

        {/* Startup & Automation */}
        <div className="p-5 rounded-2xl bg-[#151D30] border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Startup & Automation
            </h3>
          </div>

          <div className="divide-y divide-slate-800/80">
            <div className="flex items-center justify-between py-3">
              <div>
                <div className="text-xs font-semibold text-white">Launch with Windows</div>
                <div className="text-[11px] text-slate-400">
                  Automatically start Private VPN on system boot
                </div>
              </div>
              <button
                onClick={() => handleToggle('startWithWindows')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  currentSettings.startWithWindows ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    currentSettings.startWithWindows ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <div className="text-xs font-semibold text-white">Auto-Connect on Launch</div>
                <div className="text-[11px] text-slate-400">
                  Instantly tunnel traffic when application begins
                </div>
              </div>
              <button
                onClick={() => handleToggle('autoConnectOnStart')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  currentSettings.autoConnectOnStart ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    currentSettings.autoConnectOnStart ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <div className="text-xs font-semibold text-white">Automatic Reconnection</div>
                <div className="text-[11px] text-slate-400">
                  Re-establish tunnel after sleep, Wi-Fi handover, or dropouts
                </div>
              </div>
              <button
                onClick={() => handleToggle('autoReconnect')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  currentSettings.autoReconnect ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    currentSettings.autoReconnect ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <div className="text-xs font-semibold text-white">Preferred Default Gateway</div>
                <div className="text-[11px] text-slate-400">
                  Default server used for automatic connection
                </div>
              </div>
              <select
                value={currentSettings.preferredServerId || ''}
                onChange={(e) => handleStringChange('preferredServerId', e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="">(None selected)</option>
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.country})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Network & Verification Tuning */}
        <div className="p-5 rounded-2xl bg-[#151D30] border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Network Tuning & IP Verification
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Connection Timeout (Seconds)
              </label>
              <input
                type="number"
                min={10}
                max={120}
                value={currentSettings.connectionTimeoutSeconds}
                onChange={(e) =>
                  handleNumberChange('connectionTimeoutSeconds', parseInt(e.target.value) || 30)
                }
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                IP Check API Endpoint
              </label>
              <input
                type="text"
                value={currentSettings.ipCheckEndpoint}
                onChange={(e) => handleStringChange('ipCheckEndpoint', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* Data & Backup */}
        <div className="p-5 rounded-2xl bg-[#151D30] border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Data, Privacy & Backups
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Export Settings Backup</div>
              <div className="text-[11px] text-slate-400">
                Exports preferences without secrets or private keys
              </div>
            </div>
            <button
              onClick={handleExportSettings}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/60 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <div>
              <div className="text-xs font-semibold text-white">Purge Local Session Logs</div>
              <div className="text-[11px] text-slate-400">
                Permanently delete all connection duration and timestamp records
              </div>
            </div>
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await onClearHistory();
                    setConfirmClear(false);
                    showSavedBadge();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                >
                  Confirm Delete
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Database</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
