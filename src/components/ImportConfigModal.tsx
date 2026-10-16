import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Server,
  Shield,
  KeyRound,
} from 'lucide-react';
import { useVpn } from '../hooks/useVpn';
import { ParsedConfigPreview } from '../types/vpn';

interface ImportConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ImportConfigModal: React.FC<ImportConfigModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const vpn = useVpn();
  const [content, setContent] = useState<string>('');
  const [serverName, setServerName] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedConfigPreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setContent('');
      setServerName('');
      setValidationError(null);
      setPreview(null);
      setIsSubmitting(false);
      setIsDragging(false);
    }
  }, [isOpen]);

  // Debounced live validation
  useEffect(() => {
    const trimmed = content.trim();
    if (!trimmed) {
      setPreview(null);
      setValidationError(null);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    const handler = setTimeout(async () => {
      try {
        const parsed = await vpn.parseConfiguration(trimmed);
        setPreview(parsed);
        setValidationError(null);

        // If serverName is still blank, auto-populate from endpoint
        if (!serverName) {
          const host = parsed.endpoint.split(':')[0] || 'WireGuard Node';
          setServerName(`Custom (${host})`);
        }
      } catch (err: any) {
        setPreview(null);
        setValidationError(err?.toString() || 'Invalid WireGuard configuration syntax');
      } finally {
        setIsValidating(false);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [content]);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    if (!serverName) {
      setServerName(file.name.replace(/\.conf$/i, ''));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text || '');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview || !content.trim()) return;

    setIsSubmitting(true);
    setValidationError(null);

    try {
      await vpn.importConfiguration(content, serverName.trim() || undefined);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setValidationError(err?.toString() || 'Failed to import server profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111827] border border-slate-700/80 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import WireGuard Configuration</h2>
              <p className="text-xs text-slate-400">Upload or paste a standard .conf file</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleImportSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Drag & Drop Box */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-2xl p-5 text-center transition flex flex-col items-center justify-center gap-2 ${
              isDragging
                ? 'border-blue-400 bg-blue-950/20'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-xs text-slate-300">
              Drag and drop your <strong className="text-white">.conf</strong> file here, or{' '}
              <label className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer underline underline-offset-2">
                browse files
                <input
                  type="file"
                  accept=".conf,.txt"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </label>
            </div>
            <div className="text-[11px] text-slate-500">Supports standard WireGuard client profiles</div>
          </div>

          {/* Configuration Paste Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                WireGuard Configuration Text
              </label>
              {isValidating && (
                <span className="flex items-center gap-1 text-[11px] text-blue-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Validating...
                </span>
              )}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="[Interface]&#10;PrivateKey = ...&#10;Address = 10.14.0.2/32&#10;&#10;[Peer]&#10;PublicKey = ...&#10;Endpoint = 198.51.100.1:51820&#10;AllowedIPs = 0.0.0.0/0"
              rows={5}
              className="w-full px-4 py-3 bg-black/50 border border-slate-800 rounded-2xl text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40"
            />
          </div>

          {/* Live Validation Feedback */}
          {validationError && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-red-200">Validation Error:</span>
                {validationError}
              </div>
            </div>
          )}

          {preview && (
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Valid WireGuard Profile Verified
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-500 font-medium">Endpoint</div>
                  <div className="font-mono font-semibold text-slate-200 truncate">
                    {preview.endpoint}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-500 font-medium">Client Address</div>
                  <div className="font-mono font-semibold text-slate-200 truncate">
                    {preview.address}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-500 font-medium">Allowed IPs</div>
                  <div className="font-mono font-semibold text-slate-200 truncate">
                    {preview.allowedIps}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-500 font-medium">Preshared Key</div>
                  <div className="font-mono font-semibold text-slate-200 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    {preview.hasPresharedKey ? 'Configured' : 'None'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Display Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-400" />
              Server Profile Name
            </label>
            <input
              type="text"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder="e.g. My Custom WireGuard Gateway"
              maxLength={64}
              className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40"
            />
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Private keys are protected using Windows DPAPI encryption before saving.</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!preview || isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-semibold transition shadow-lg shadow-blue-600/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Server...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import Profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
