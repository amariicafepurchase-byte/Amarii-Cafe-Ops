import React from 'react';
import { Sparkles, RefreshCw, X, ArrowUpCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface PWAUpdateBannerProps {
  hasNewUpdate?: boolean;
  needRefresh?: boolean;
  isUpdating: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export const PWAUpdateBanner: React.FC<PWAUpdateBannerProps> = ({
  hasNewUpdate,
  needRefresh,
  isUpdating,
  onUpdate,
  onDismiss,
}) => {
  const { isLightMode } = useTheme();

  const isVisible = Boolean(hasNewUpdate || needRefresh);
  if (!isVisible) return null;

  return (
    <div
      id="pwa-new-version-update-banner"
      role="alert"
      aria-live="assertive"
      className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-6 sm:max-w-lg z-[9999] animate-in slide-in-from-top-4 duration-300 select-none shadow-2xl"
    >
      <div
        className={`p-4 rounded-2xl border-2 sm:border-3 shadow-2xl backdrop-blur-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 text-white transition-all ${
          isLightMode
            ? 'bg-zinc-950/95 border-emerald-500 shadow-emerald-950/30'
            : 'bg-[#111c15]/95 border-emerald-400 shadow-emerald-950/60'
        }`}
      >
        {/* Left icon & text */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-zinc-950 shrink-0 shadow-lg shadow-emerald-500/20 animate-pulse mt-0.5 sm:mt-0">
            <Sparkles className="w-5 h-5 stroke-[2.5]" />
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black uppercase tracking-tight text-white leading-tight">
                ✨ Found New Update! A new version of Amarii Café Ops is ready.
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-300 font-medium">
              Clicking will refresh to the latest version immediately.
            </p>
          </div>
        </div>

        {/* Right buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
          <button
            type="button"
            id="pwa-update-now-action-btn"
            onClick={onUpdate}
            disabled={isUpdating}
            className={`flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 text-xs sm:text-sm font-black uppercase tracking-wide rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
              isUpdating ? 'opacity-80 cursor-wait' : ''
            }`}
            title="Reload to load latest deployment"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-zinc-950 stroke-[2.5]" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <ArrowUpCircle className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
                <span>Update Now (अभी अपडेट करें)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="p-2 text-zinc-400 hover:text-white transition rounded-lg hover:bg-zinc-800/60 cursor-pointer shrink-0"
            aria-label="Dismiss update banner"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
