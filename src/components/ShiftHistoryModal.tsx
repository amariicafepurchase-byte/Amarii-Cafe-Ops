import React, { useState } from 'react';
import {
  X,
  Calendar,
  Trash2,
  Download,
  Share2,
  Eye,
  CheckCircle2,
  Lock,
  Loader2,
  Building2,
  User,
  Clock,
  ClipboardList,
} from 'lucide-react';
import { ShiftRecord } from '../types';
import { generateChecklistAuditPdf } from '../utils/checklistPdfGenerator';
import { shareChecklistUpdate } from '../utils/shareUtils';
import { SubmissionDetailsModal } from './SubmissionDetailsModal';
import { useTheme } from '../context/ThemeContext';

interface ShiftHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ShiftRecord[];
  onRestore?: (record: ShiftRecord) => void;
  onClearHistory: () => void;
  onViewMedia?: (media: { id: string; type: 'photo' | 'video'; url: string; name: string }) => void;
}

export const ShiftHistoryModal: React.FC<ShiftHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onRestore,
  onClearHistory,
  onViewMedia,
}) => {
  const { isLightMode } = useTheme();
  const [selectedRecord, setSelectedRecord] = useState<ShiftRecord | null>(null);
  const [activePdfId, setActivePdfId] = useState<string | null>(null);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadPdf = async (rec: ShiftRecord) => {
    setActivePdfId(rec.id);
    setNotice(`Generating PDF for ${rec.label || 'Checklist'}...`);
    try {
      const checklistTitle =
        rec.label || rec.tasks?.[0]?.checklistHeader || `${rec.department || 'Shift'} Operations Checklist`;

      const pdfResult = await generateChecklistAuditPdf({
        checklistHeader: checklistTitle,
        department: rec.department || 'Operations',
        submittedBy: rec.staffName || 'Staff',
        submittedAt: rec.timestamp,
        outletName: rec.outlet || 'Amarii Café Kothrud',
        tasks: rec.tasks || [],
      });

      pdfResult.download();
      setNotice('✓ PDF Downloaded successfully!');
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error('PDF generation error:', err);
      setNotice('Failed to generate PDF.');
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setActivePdfId(null);
    }
  };

  const handleShareWhatsApp = async (rec: ShiftRecord) => {
    setActiveShareId(rec.id);
    setNotice('Opening WhatsApp share link...');
    try {
      const checklistTitle =
        rec.label || rec.tasks?.[0]?.checklistHeader || `${rec.department || 'Shift'} Operations Checklist`;

      const dateObj = new Date(rec.timestamp);
      const formattedDate = dateObj.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const formattedTime = dateObj.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const res = await shareChecklistUpdate({
        checklistName: checklistTitle,
        staffName: rec.staffName || 'Staff',
        timeStr: formattedTime,
        department: rec.department,
        tasks: rec.tasks || [],
        outletName: rec.outlet,
      });

      if (res.success) {
        setNotice(res.notice || '✓ WhatsApp link generated!');
      } else {
        const message = `*AMARII CAFÉ — SHIFT SIGN-OFF REPORT*\n📋 ${checklistTitle}\n👤 Staff: ${rec.staffName}\n⏰ ${formattedDate} ${formattedTime}\nStatus: Submitted.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        setNotice('Opened WhatsApp.');
      }
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error('WhatsApp error:', err);
    } finally {
      setActiveShareId(null);
    }
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-history-modal-title"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200 overflow-hidden"
      >
        <div
          className={`relative w-full max-w-3xl max-h-[92vh] sm:max-h-[85vh] flex flex-col border-t-4 sm:border-4 border-white shadow-2xl overflow-hidden rounded-t-2xl sm:rounded-none ${
            isLightMode ? 'bg-zinc-900 text-zinc-100' : 'bg-zinc-950 text-zinc-100'
          }`}
        >
          {/* Mobile Drag Indicator */}
          <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mt-2.5 sm:hidden" />

          {/* Modal Header */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b-2 sm:border-b-4 border-white flex items-center justify-between bg-zinc-900">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500 text-black">
                <Calendar className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h2
                  id="shift-history-modal-title"
                  className="text-lg sm:text-2xl font-black uppercase tracking-tight text-white"
                >
                  My Submissions & Shift History
                </h2>
                <p className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  Past Amarii Café Submitted Checklists (Strict Read-Only)
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

          {/* Notice Alert */}
          {notice && (
            <div className="mx-4 mt-3 p-2 bg-emerald-950 border border-emerald-500 text-emerald-200 text-xs font-bold rounded text-center shrink-0">
              {notice}
            </div>
          )}

          {/* List of past submissions */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-zinc-950 modal-scroll-area">
            {history.length === 0 ? (
              <div className="py-12 px-4 text-center text-xs font-bold uppercase tracking-wider text-zinc-500 bg-zinc-900/50 border border-dashed border-zinc-800 rounded">
                No past submissions recorded yet. Whenever you submit an Amarii Café checklist, it is permanently stored here for instant audit and report export.
              </div>
            ) : (
              history.map((rec) => {
                const dateObj = new Date(rec.timestamp);
                const dateStr = dateObj.toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const taskList = rec.tasks || [];
                const total = taskList.length || rec.totalTasks;
                const completed = taskList.filter((t) => t.completed).length || rec.completedTasks;
                const uncompleted = total - completed;
                const pct = total > 0 ? Math.round((completed / total) * 100) : rec.completionRate || 100;

                const checklistTitle =
                  rec.label ||
                  taskList[0]?.checklistHeader ||
                  `${rec.department || 'Shift'} Operations Checklist`;

                const isPdfLoading = activePdfId === rec.id;
                const isShareLoading = activeShareId === rec.id;

                return (
                  <div
                    key={rec.id}
                    className="p-4 border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900 hover:border-zinc-500 transition flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-md"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black uppercase tracking-wider text-white">
                          {checklistTitle}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                          {pct}% DONE
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Read-Only
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-medium">
                        <span className="flex items-center gap-1 text-zinc-300 font-mono">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" /> {dateStr}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-zinc-500" /> {rec.staffName || 'Staff'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-zinc-500" /> {rec.outlet || 'Amarii Café'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] font-bold uppercase">
                        <span className="px-2 py-0.5 bg-zinc-800 text-white rounded">
                          Total: {total}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                          Yes: {completed}
                        </span>
                        <span className="px-2 py-0.5 bg-red-950 text-red-300 border border-red-800 rounded">
                          No: {uncompleted}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: View Details, Download PDF, Share WhatsApp */}
                    <div className="flex items-center gap-1.5 sm:gap-2 self-start md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800 w-full md:w-auto">
                      {/* View Details Button */}
                      <button
                        type="button"
                        id={`history-view-details-btn-${rec.id}`}
                        onClick={() => setSelectedRecord(rec)}
                        className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-tight transition cursor-pointer min-h-[38px] rounded"
                        title="View read-only submission details"
                      >
                        <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>View Details</span>
                      </button>

                      {/* Download PDF Button */}
                      <button
                        type="button"
                        id={`history-download-pdf-btn-${rec.id}`}
                        onClick={() => handleDownloadPdf(rec)}
                        disabled={isPdfLoading}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-tight transition cursor-pointer min-h-[38px] rounded"
                        title="Download PDF Audit Report"
                      >
                        {isPdfLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">PDF</span>
                      </button>

                      {/* Share WhatsApp Button */}
                      <button
                        type="button"
                        id={`history-share-whatsapp-btn-${rec.id}`}
                        onClick={() => handleShareWhatsApp(rec)}
                        disabled={isShareLoading}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold uppercase tracking-tight transition cursor-pointer min-h-[38px] rounded"
                        title="Share report to WhatsApp"
                      >
                        {isShareLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        )}
                        <span className="hidden sm:inline">WhatsApp</span>
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
                {history.length} Past Submissions
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

      {/* Read-Only Details Modal */}
      {selectedRecord && (
        <SubmissionDetailsModal
          isOpen={Boolean(selectedRecord)}
          onClose={() => setSelectedRecord(null)}
          record={selectedRecord}
          onViewMedia={onViewMedia}
        />
      )}
    </>
  );
};
