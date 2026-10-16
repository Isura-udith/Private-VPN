import React, { useState } from 'react';
import { ServerCard } from '../components/ServerCard';
import { ServerConfig } from '../types/vpn';
import {
  Search,
  Plus,
  Star,
  Globe2,
  FileText,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface LocationsProps {
  servers: ServerConfig[];
  selectedServer: ServerConfig | null;
  isConnected: boolean;
  onSelectServer: (server: ServerConfig) => void;
  onToggleFavorite: (serverId: string) => void;
  onImportConfig: (content: string, name?: string) => Promise<void>;
  onDeleteServer: (serverId: string) => Promise<void>;
}

export const Locations: React.FC<LocationsProps> = ({
  servers,
  selectedServer,
  isConnected,
  onSelectServer,
  onToggleFavorite,
  onImportConfig,
  onDeleteServer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'custom'>('all');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importName, setImportName] = useState('');
  const [importContent, setImportContent] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredServers = servers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.endpoint.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'favorites') return s.isFavorite;
    if (filterType === 'custom') return s.isCustom;
    return true;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!importName) {
      setImportName(file.name.replace(/\.conf$/i, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportContent(text);
    };
    reader.readAsText(file);
  };

  const handleSubmitImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importContent.trim()) {
      setImportError('Please paste or upload a valid WireGuard configuration (.conf)');
      return;
    }

    setIsSubmitting(true);
    setImportError(null);

    try {
      await onImportConfig(importContent, importName.trim() || undefined);
      setIsImportModalOpen(false);
      setImportContent('');
      setImportName('');
    } catch (err: any) {
      setImportError(err?.toString() || 'Failed to import WireGuard configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto overflow-y-auto">
      {/* Header with Title and Import Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">VPN Server Gateways</h2>
          <p className="text-xs text-slate-400">
            Select an authorized WireGuard server endpoint or import custom configs
          </p>
        </div>

        <button
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Import WireGuard Config</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by server name, city, country, or endpoint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#151D30] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center p-1 rounded-xl bg-[#151D30] border border-slate-800 text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterType === 'all'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({servers.length})
          </button>
          <button
            onClick={() => setFilterType('favorites')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              filterType === 'favorites'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Star className="w-3 h-3 fill-current" />
            Favorites
          </button>
          <button
            onClick={() => setFilterType('custom')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterType === 'custom'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {/* Server Grid */}
      {filteredServers.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {filteredServers.map((server) => {
            const isSelected = selectedServer?.id === server.id;
            return (
              <ServerCard
                key={server.id}
                server={server}
                isSelected={isSelected}
                isConnected={isConnected && isSelected}
                onSelect={() => onSelectServer(server)}
                onToggleFavorite={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(server.id);
                }}
                onDelete={
                  server.isCustom
                    ? (e) => {
                        e.stopPropagation();
                        onDeleteServer(server.id);
                      }
                    : undefined
                }
              />
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-[#151D30]/60 border border-slate-800 flex flex-col items-center justify-center">
          <Globe2 className="w-10 h-10 text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-300 mb-1">No Servers Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4">
            No WireGuard servers match your filter. Import your legitimate WireGuard .conf file to get started.
          </p>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>Import Server Configuration</span>
          </button>
        </div>
      )}

      {/* Import Configuration Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Import WireGuard Configuration</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {importError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitImport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Server Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Private US Gateway"
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#151D30] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Configuration Content (.conf)
                  </label>
                  <label className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer">
                    <Upload className="w-3 h-3" />
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept=".conf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <textarea
                  rows={8}
                  placeholder={`[Interface]\nPrivateKey = ...\nAddress = 10.0.0.2/32\nDNS = 1.1.1.1\n\n[Peer]\nPublicKey = ...\nEndpoint = vpn.example.com:51820\nAllowedIPs = 0.0.0.0/0`}
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  className="w-full p-3 font-mono text-xs rounded-xl bg-[#151D30] border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Importing...' : 'Validate & Save'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
