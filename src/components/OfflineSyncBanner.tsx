import React from 'react';
import { WifiOff, RefreshCw, CheckCircle, CloudUpload } from 'lucide-react';
import { useOnlineStatus, getQueuedSubmissions } from '../utils/offlineSync';

interface OfflineSyncBannerProps {
  pendingCount?: number;
  isSyncing?: boolean;
  onManualSync?: () => void;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({
  pendingCount: propPendingCount,
  isSyncing = false,
  onManualSync,
}) => {
  const isOnline = useOnlineStatus();
  const queueLength = propPendingCount ?? getQueuedSubmissions().length;

  if (isOnline && queueLength === 0 && !isSyncing) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full transition-all duration-300 animate-in slide-in-from-top-1"
    >
      {!isOnline ? (
        <div className="bg-amber-600 text-white px-3 sm:px-4 py-2 text-xs font-semibold shadow-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
            <span>
              <strong>Offline Mode Active:</strong> Café connection is low or disconnected. You can continue filling checklists uninterrupted — your responses are safely cached and will auto-sync to cloud when online.
            </span>
          </div>
          {queueLength > 0 && (
            <span className="bg-amber-800 text-amber-100 text-[10px] font-bold px-2 py-0.5 rounded shrink-0 font-mono">
              {queueLength} {queueLength === 1 ? 'submission' : 'submissions'} pending sync
            </span>
          )}
        </div>
      ) : isSyncing ? (
        <div className="bg-purple-700 text-white px-3 sm:px-4 py-1.5 text-xs font-semibold shadow-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
            <span>
              <strong>Connection Restored:</strong> Auto-syncing {queueLength} offline checklist submission(s) to Cloud...
            </span>
          </div>
        </div>
      ) : queueLength > 0 ? (
        <div className="bg-emerald-700 text-white px-3 sm:px-4 py-1.5 text-xs font-semibold shadow-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-4 h-4 shrink-0" />
            <span>
              Connection active. {queueLength} offline submission(s) ready to sync.
            </span>
          </div>
          {onManualSync && (
            <button
              type="button"
              onClick={onManualSync}
              className="px-2.5 py-0.5 bg-emerald-900 hover:bg-emerald-950 text-white text-[11px] font-bold rounded transition cursor-pointer"
            >
              Sync Now
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};
