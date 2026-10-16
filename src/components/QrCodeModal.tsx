import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Download,
  Copy,
  Check,
  Smartphone,
  Shield,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { ServerConfig } from '../types/vpn';
import { useVpn } from '../hooks/useVpn';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: ServerConfig | null;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ isOpen, onClose, server }) => {
  const vpn = useVpn();
  const [configContent, setConfigContent] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'conf'>('qr');

  useEffect(() => {
    if (!isOpen || !server) {
      setConfigContent('');
      setQrDataUrl('');
      setError(null);
      setCopied(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const loadConfigAndQr = async () => {
      try {
        const conf = await vpn.exportServerConfiguration(server.id);
        if (!isMounted) return;
        setConfigContent(conf);

        // Generate QR Code from WireGuard config text
        const dataUrl = await QRCode.toDataURL(conf, {
          errorCorrectionLevel: 'M',
          margin: 2,
          scale: 8,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });

        if (isMounted) {
          setQrDataUrl(dataUrl);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.toString() || 'Failed to generate WireGuard mobile export');
          setIsLoading(false);
        }
      }
    };

    loadConfigAndQr();

    return () => {
      isMounted = false;
    };
  }, [isOpen, server]);

  if (!isOpen || !server) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(configContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy config:', err);
    }
  };

  const handleDownload = () => {
    const filename = `${server.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.conf`;
    const blob = new Blob([configContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111827] border border-slate-700/80 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Mobile WireGuard Setup
              </h2>
              <p className="text-xs text-slate-400">
                {server.name} ({server.country})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-900/30 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 ${
              activeTab === 'qr'
                ? 'text-blue-400 border-blue-500 bg-slate-800/40'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Mobile QR Code
          </button>
          <button
            onClick={() => setActiveTab('conf')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 ${
              activeTab === 'conf'
                ? 'text-blue-400 border-blue-500 bg-slate-800/40'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Raw .conf File
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <span className="text-sm">Preparing encrypted WireGuard credentials...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-xs">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {!isLoading && !error && activeTab === 'qr' && (
            <div className="flex flex-col items-center space-y-4">
              {/* QR Code Container */}
              <div className="p-4 bg-white rounded-2xl shadow-xl shadow-black/40 flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="WireGuard Mobile QR Code"
                    className="w-56 h-56 object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-slate-500">
                    No QR code
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs">
                <div className="font-semibold text-slate-200 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  How to connect on iOS & Android:
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400 pl-1">
                  <li>
                    Open the official <strong className="text-slate-200">WireGuard</strong> app on your phone.
                  </li>
                  <li>
                    Tap <strong className="text-slate-200">+</strong> (Add tunnel) and choose{' '}
                    <strong className="text-blue-400">"Create from QR code"</strong>.
                  </li>
                  <li>Scan this screen and assign a name to instantly connect.</li>
                </ol>
              </div>

              {/* Security Hint */}
              <div className="w-full flex items-center gap-2 text-[11px] text-slate-500 px-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  This QR contains your client private key. Do not share screenshots publicly.
                </span>
              </div>
            </div>
          )}

          {!isLoading && !error && activeTab === 'conf' && (
            <div className="space-y-3">
              <div className="relative">
                <pre className="p-4 rounded-2xl bg-black/60 border border-slate-800 text-[12px] font-mono text-blue-200 overflow-x-auto whitespace-pre select-all max-h-64">
                  {configContent}
                </pre>
              </div>

              <div className="text-xs text-slate-400">
                You can import this standard configuration directly into any WireGuard client on Windows, macOS, Linux, or routers.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        {!isLoading && !error && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60 font-semibold text-xs transition"
            >
              <Download className="w-4 h-4" />
              Download .conf
            </button>

            <button
              onClick={handleCopy}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition border ${
                copied
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500/40 shadow-lg shadow-blue-600/20'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Config Text
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
