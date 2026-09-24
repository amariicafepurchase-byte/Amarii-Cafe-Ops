import React, { useState } from 'react';
import { X, Sparkles, Clipboard, ArrowRight, Zap } from 'lucide-react';
import { SAMPLE_PRESETS, SamplePreset } from '../data/sampleData';

interface PasteInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: (rawText: string) => void;
  isLoading: boolean;
}

export const PasteInputModal: React.FC<PasteInputModalProps> = ({
  isOpen,
  onClose,
  onAnalyze,
  isLoading,
}) => {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAnalyze(text);
  };

  const handleApplyPreset = (preset: SamplePreset) => {
    setText(preset.data);
  };

  const handlePasteClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setText(clipText);
      }
    } catch (err) {
      console.warn('Clipboard read permission not available:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200 overflow-hidden">
      <div
        id="paste-tasks-modal"
        className="relative w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] flex flex-col bg-zinc-950 text-zinc-100 border-t-4 sm:border-4 border-white shadow-2xl overflow-hidden rounded-t-2xl sm:rounded-none"
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b-2 sm:border-b-4 border-white flex items-center justify-between bg-zinc-900">
          <div>
            <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-white">
              IMPORT AMARII CAFE LOGS
            </h2>
            <p className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
              Task Parser & Dispatcher
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-zinc-800 hover:bg-white hover:text-black text-white transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 modal-scroll-area">
          {/* Sample Presets Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-red-500" />
                Quick Presets / Logs
              </span>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-[11px] font-black uppercase tracking-tight text-black bg-white hover:bg-zinc-200 px-2.5 py-1 transition cursor-pointer min-h-[36px]"
              >
                Paste Clipboard
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="text-left p-2.5 border border-zinc-800 hover:border-white bg-zinc-900 hover:bg-zinc-850 transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-black uppercase tracking-tight text-white group-hover:text-red-400 truncate">
                      {preset.name}
                    </span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-black text-zinc-400 border border-zinc-800">
                      {preset.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Textarea Input */}
          <div className="space-y-1.5">
            <label htmlFor="raw-task-input" className="block text-xs font-black uppercase tracking-wider text-zinc-300">
              Raw Task Data / WhatsApp Text
            </label>
            <div className="relative">
              <textarea
                id="raw-task-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder="Paste Amarii Cafe task list, WhatsApp operations notes, or shift logs here..."
                className="w-full p-3 text-xs font-mono bg-zinc-900 text-white border-2 border-zinc-800 focus:border-white outline-none transition resize-y leading-relaxed"
                required
              />
              {text.length > 0 && (
                <button
                  type="button"
                  onClick={() => setText('')}
                  className="absolute top-2 right-2 text-[10px] font-black uppercase bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 border border-zinc-700 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              <span>{text ? `${text.split('\n').filter((l) => l.trim()).length} lines detected` : 'Ready for input'}</span>
            </div>
          </div>
        </form>

        {/* Sticky Action Footer */}
        <div className="p-3 sm:p-4 bg-zinc-900 border-t-2 border-white flex items-center justify-end gap-2 safe-bottom">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-black uppercase text-zinc-400 hover:text-white bg-zinc-800 transition cursor-pointer min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            id="analyze-submit-btn"
            disabled={isLoading || !text.trim()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-6 py-2.5 text-xs font-black uppercase tracking-tight text-black bg-white hover:bg-zinc-200 active:bg-zinc-300 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer min-h-[44px]"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>Analyze & Import</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
