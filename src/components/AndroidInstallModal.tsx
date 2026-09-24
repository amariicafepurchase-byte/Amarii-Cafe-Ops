import React from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  Share,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
  Layers,
} from 'lucide-react';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  isInstallable,
  isInstalled,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-zinc-900 border-2 sm:border-4 border-zinc-700 w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-red-500 text-black p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-6 h-6 stroke-[2.5]" />
            <div>
              <h2 id="install-modal-title" className="text-base sm:text-lg font-black uppercase tracking-tight">
                Install Amarii Cafe Android App
              </h2>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-900 font-mono">
                Direct PWA Installation on Android & Vercel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-black hover:bg-black/20 font-black text-xl transition cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5 text-zinc-200">
          {isInstalled ? (
            <div className="bg-emerald-950/60 border-2 border-emerald-500 p-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-black text-emerald-300 uppercase text-sm">
                  App Already Installed!
                </h4>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Amarii Cafe Ops is running as a standalone Android application on this device with full offline caching and Firestore sync.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Direct Install Button if browser supports it */}
              {isInstallable && (
                <div className="bg-black border-2 border-red-500 p-4 text-center space-y-3">
                  <div className="inline-flex p-3 bg-red-500 text-black font-black">
                    <Download className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-white text-base">
                      1-Tap Android Install Ready
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Tap below to add Amarii Cafe Ops to your Android phone's App Drawer and Home Screen.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onInstall();
                      onClose();
                    }}
                    className="w-full py-3 bg-red-500 hover:bg-red-400 text-black font-black uppercase tracking-tight text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Install App on Android Now</span>
                  </button>
                </div>
              )}

              {/* Android Chrome / Vercel Step-by-Step Guide */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>How to Install on Android Chrome (e.g. on Vercel):</span>
                </h4>

                <div className="space-y-2.5 text-xs">
                  <div className="bg-zinc-950 border border-zinc-800 p-3 flex items-start gap-3">
                    <span className="w-6 h-6 bg-white text-black font-black flex items-center justify-center shrink-0 text-xs">
                      1
                    </span>
                    <div>
                      <span className="font-bold text-white uppercase">Open in Chrome or Edge:</span>
                      <p className="text-zinc-400 mt-0.5">
                        Open your hosted app URL (e.g., on Vercel or live server) in Google Chrome on your Android device.
                      </p>
                    </div>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 p-3 flex items-start gap-3">
                    <span className="w-6 h-6 bg-white text-black font-black flex items-center justify-center shrink-0 text-xs">
                      2
                    </span>
                    <div>
                      <span className="font-bold text-white uppercase">Tap Browser Menu (3 Dots):</span>
                      <p className="text-zinc-400 mt-0.5">
                        Tap the <strong className="text-white">⋮ (three dots)</strong> menu in the top-right corner of Chrome.
                      </p>
                    </div>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 p-3 flex items-start gap-3">
                    <span className="w-6 h-6 bg-red-500 text-black font-black flex items-center justify-center shrink-0 text-xs">
                      3
                    </span>
                    <div>
                      <span className="font-bold text-white uppercase">Tap "Install App" / "Add to Home screen":</span>
                      <p className="text-zinc-400 mt-0.5">
                        Select <strong className="text-red-400">"Install app"</strong> (or <strong className="text-red-400">"Add to Home screen"</strong>).
                      </p>
                    </div>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 p-3 flex items-start gap-3">
                    <span className="w-6 h-6 bg-white text-black font-black flex items-center justify-center shrink-0 text-xs">
                      4
                    </span>
                    <div>
                      <span className="font-bold text-white uppercase">Launch From Android App Drawer:</span>
                      <p className="text-zinc-400 mt-0.5">
                        The app icon will appear with your Android apps. It opens in full-screen standalone mode with station lock.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                <div className="bg-zinc-950 p-2.5 border border-zinc-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300 font-bold uppercase">Real-time Firebase Cloud Sync</span>
                </div>
                <div className="bg-zinc-950 p-2.5 border border-zinc-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-zinc-300 font-bold uppercase">Station-Isolated Views</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-zinc-950 p-4 border-t border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase text-xs tracking-tight transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
