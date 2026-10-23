import React from 'react';
import { Sparkles, RefreshCw, X, ArrowUpCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface PWAUpdateBannerProps {
  needRefresh: boolean;
  isUpdating: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export const PWAUpdateBanner: React.FC<PWAUpdateBannerProps> = ({
  needRefresh,
  isUpdating,
  onUpdate,
  onDismiss,
}) => {
  const { isLightMode } = useTheme();

  if (!needRefresh) return null;

  return (
    <div
      id="pwa-new-version-update-banner"
      role="alert"
      aria-live="assertive"
      className="fixed top-2 sm:top-4 inset-x-2 sm:inset-x-auto sm:right-6 sm:max-w-md z-[120] animate-in slide-in-from-top duration-300 select-none"
    >
      <div
        className={`p-3.5 sm:p-4 rounded-xl border-2 sm:border-4 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-white transition-all ${
          isLightMode
            ? 'bg-zinc-950/95 border-purple-500 shadow-purple-950/20'
            : 'bg-[#151f18]/95 border-purple-400 shadow-purple-900/40'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-md animate-pulse">
            <Sparkles className="w-5 h-5 stroke-[2.5]" />
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black uppercase tracking-tight text-purple-300">
                ✨ New Version Available
              </span>
              <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-200 border border-purple-400/40 text-[9px] font-bold uppercase rounded-xs">
                VERCEL BUILD
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 font-medium line-clamp-1">
              Tap Update Now to reload latest features instantly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            id="pwa-update-now-action-btn"
            onClick={onUpdate}
            disabled={isUpdating}
            className={`px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              isUpdating ? 'opacity-80 cursor-wait' : ''
            }`}
            title="Reload page to load latest deployment"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <ArrowUpCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Update Now</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 text-zinc-400 hover:text-white transition rounded cursor-pointer"
            aria-label="Dismiss update banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
