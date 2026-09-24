import React from 'react';
import { X, Calendar, Trash2, RotateCcw } from 'lucide-react';
import { ShiftRecord } from '../types';

interface ShiftHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ShiftRecord[];
  onRestore: (record: ShiftRecord) => void;
  onClearHistory: () => void;
}

export const ShiftHistoryModal: React.FC<ShiftHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onRestore,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200 overflow-hidden">
      <div className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col bg-zinc-950 text-zinc-100 border-t-4 sm:border-4 border-white shadow-2xl overflow-hidden rounded-t-2xl sm:rounded-none">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b-2 sm:border-b-4 border-white flex items-center justify-between bg-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white text-black">
              <Calendar className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-white">
                SHIFT HISTORY & LOGS
              </h2>
              <p className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider">
                Restore previous Amarii Cafe shifts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-zinc-800 hover:bg-white hover:text-black text-white transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* List of past shifts */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-zinc-950 modal-scroll-area">
          {history.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold uppercase tracking-wider text-zinc-500 bg-zinc-900/50 border border-dashed border-zinc-800">
              No previous shifts recorded yet. Whenever you analyze an Amarii Cafe task list, it is safely logged here.
            </div>
          ) : (
            history.map((rec) => {
              const dateStr = new Date(rec.timestamp).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              const pct = rec.totalTasks > 0 ? Math.round((rec.completedTasks / rec.totalTasks) * 100) : 0;

              return (
                <div
                  key={rec.id}
                  className="p-3.5 border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-white transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black uppercase tracking-wider text-white">
                        {rec.label}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">{dateStr}</span>
                    </div>
                    <p className="text-xs text-zinc-400 font-medium line-clamp-1">{rec.result.summary}</p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-[11px] font-black uppercase">
                      <span className="text-white">{rec.totalTasks} TOTAL</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-white">{rec.completedTasks} DONE ({pct}%)</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-red-500">{rec.result.urgentTasks?.length || 0} URGENT</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        onRestore(rec);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-black hover:bg-zinc-200 text-xs font-black uppercase tracking-tight transition cursor-pointer min-h-[40px]"
                    >
                      <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Load Shift</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="px-4 sm:px-6 py-3.5 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between text-xs safe-bottom">
            <span className="font-bold uppercase tracking-wider text-zinc-400 text-[11px]">
              {history.length} Shift Records
            </span>
            <button
              type="button"
              onClick={onClearHistory}
              className="text-xs font-black uppercase text-red-500 hover:text-red-400 flex items-center gap-1 cursor-pointer py-1 min-h-[40px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear History
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
