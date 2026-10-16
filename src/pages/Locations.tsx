import React, { useState } from 'react';
import { ServerCard } from '../components/ServerCard';
import { ServerConfig } from '../types/vpn';
import { useVpn } from '../hooks/useVpn';
import { Search, Plus, Star, Globe2, AlertTriangle } from 'lucide-react';
import { ImportConfigModal } from '../components/ImportConfigModal';
import { QrCodeModal } from '../components/QrCodeModal';

export interface LocationsProps {
  servers?: ServerConfig[];
  selectedServer?: ServerConfig | null;
  isConnected?: boolean;
  onSelectServer?: (server: ServerConfig) => void;
  onToggleFavorite?: (serverId: string) => void;
  onImportConfig?: (content: string, name?: string) => Promise<any>;
  onDeleteServer?: (serverId: string) => Promise<void>;
}

export const Locations: React.FC<LocationsProps> = (props) => {
  const vpn = useVpn();

  const servers = props.servers ?? vpn.servers;
  const selectedServer = props.selectedServer !== undefined ? props.selectedServer : vpn.currentServer;
  const isConnected = props.isConnected !== undefined ? props.isConnected : vpn.connectionState === 'connected';
  const onSelectServer = props.onSelectServer;
  const onToggleFavorite = props.onToggleFavorite ?? vpn.toggleFavorite;
  const onDeleteServer = props.onDeleteServer ?? vpn.deleteServer;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'custom'>('all');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedServerForQr, setSelectedServerForQr] = useState<ServerConfig | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSelectServer = (server: ServerConfig) => {
    vpn.setCurrentServer(server);
    if (onSelectServer) {
      onSelectServer(server);
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    setActionError(null);
    try {
      await onDeleteServer(serverId);
    } catch (err: any) {
      setActionError(err?.toString() || 'Failed to delete server');
    }
  };

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

      {actionError && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-between text-xs text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800"
          >
            Dismiss
          </button>
        </div>
      )}

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
                onSelect={() => handleSelectServer(server)}
                onToggleFavorite={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(server.id);
                }}
                onShowQr={(e) => {
                  e.stopPropagation();
                  setSelectedServerForQr(server);
                }}
                onDelete={
                  server.isCustom
                    ? (e) => {
                        e.stopPropagation();
                        handleDeleteServer(server.id);
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

      {/* WireGuard .conf Enhanced Import Modal */}
      <ImportConfigModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* WireGuard Mobile QR Code Modal */}
      <QrCodeModal
        isOpen={!!selectedServerForQr}
        onClose={() => setSelectedServerForQr(null)}
        server={selectedServerForQr}
      />
    </div>
  );
};

export default Locations;
