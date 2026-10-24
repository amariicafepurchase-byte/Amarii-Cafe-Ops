import React, { useState } from 'react';
import {
  X,
  Calendar,
  User,
  MapPin,
  ClipboardCheck,
  Download,
  Share2,
  Lock,
  CheckCircle2,
  XCircle,
  ImageIcon,
  FileText,
  Clock,
  Loader2,
  Building2,
} from 'lucide-react';
import { ShiftRecord, TaskItem } from '../types';
import { generateChecklistAuditPdf } from '../utils/checklistPdfGenerator';
import { shareChecklistUpdate } from '../utils/shareUtils';
import { useTheme } from '../context/ThemeContext';

interface SubmissionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ShiftRecord | null;
  onViewMedia?: (media: { id: string; type: 'photo' | 'video'; url: string; name: string }) => void;
}

export const SubmissionDetailsModal: React.FC<SubmissionDetailsModalProps> = ({
  isOpen,
  onClose,
  record,
  onViewMedia,
}) => {
  const { isLightMode } = useTheme();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isOpen || !record) return null;

  const tasks = record.tasks || [];
  const completedTasks = tasks.filter((t) => t.completed);
  const uncompletedTasks = tasks.filter((t) => !t.completed);
  const totalTasks = tasks.length || record.totalTasks;
  const completedCount = completedTasks.length || record.completedTasks;
  const noCount = totalTasks - completedCount;
  const pct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 100;

  // Count total photos
  let totalPhotos = 0;
  tasks.forEach((t) => {
    if (t.media) {
      totalPhotos += t.media.filter((m) => m.type === 'photo').length;
    }
  });

  const dateObj = new Date(record.timestamp);
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

  const checklistTitle =
    record.label || tasks[0]?.checklistHeader || `${record.department || 'Shift'} Operations Checklist`;

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setNotice('Generating PDF report...');
    try {
      const pdfResult = await generateChecklistAuditPdf({
        checklistHeader: checklistTitle,
        department: record.department || 'Operations',
        submittedBy: record.staffName || 'Staff',
        submittedAt: record.timestamp,
        outletName: record.outlet || 'Amarii Café Kothrud',
        tasks: tasks,
      });

      pdfResult.download();
      setNotice('✓ PDF Downloaded successfully!');
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error('PDF error:', err);
      setNotice('Failed to generate PDF.');
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    setIsSharingWhatsApp(true);
    setNotice('Opening WhatsApp...');
    try {
      const formattedMessage = `*AMARII CAFÉ — SHIFT SIGN-OFF RECORD*\n\n📋 *Checklist:* ${checklistTitle}\n📍 *Station:* ${record.department || 'General'}\n👤 *Filled By:* ${record.staffName || 'Staff'}\n🏢 *Outlet:* ${record.outlet || 'Amarii Café'}\n⏰ *Submitted:* ${formattedDate} at ${formattedTime}\n\n✅ *Yes (Done):* ${completedCount}\n❌ *No (Incomplete):* ${noCount}\n📊 *Completion Rate:* ${pct}%\n\nStatus: *Locked Historical Audit Record*`;

      const res = await shareChecklistUpdate({
        checklistName: checklistTitle,
        staffName: record.staffName || 'Staff',
        timeStr: formattedTime,
        department: record.department,
        tasks: tasks,
        outletName: record.outlet,
      });

      if (res.success) {
        setNotice(res.notice || '✓ Shared to WhatsApp!');
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(formattedMessage)}`, '_blank');
        setNotice('✓ Opened WhatsApp share text!');
      }
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error('WhatsApp error:', err);
      window.open(`https://wa.me/?text=${encodeURIComponent(`Amarii Cafe Shift Report: ${checklistTitle}`)}`, '_blank');
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submission-details-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
    >
      <div
        className={`relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border-2 sm:border-4 shadow-2xl overflow-hidden ${
          isLightMode
            ? 'bg-white text-zinc-950 border-zinc-900'
            : 'bg-zinc-950 text-zinc-100 border-zinc-800'
        }`}
      >
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-4 border-b-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-lg">
              <ClipboardCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="submission-details-modal-title"
                  className="text-base sm:text-xl font-black uppercase tracking-tight text-white"
                >
                  {checklistTitle}
                </h2>
                <span className="px-2 py-0.5 bg-amber-500 text-black text-[10px] font-black uppercase rounded flex items-center gap-1">
                  <Lock className="w-3 h-3" /> READ ONLY
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                Submitted by {record.staffName || 'Staff'} on {formattedDate} at {formattedTime}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-zinc-800 hover:bg-white hover:text-black text-white transition rounded cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Notice alert */}
        {notice && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold rounded text-center shrink-0">
            {notice}
          </div>
        )}

        {/* Read-Only Status & Lock Banner */}
        <div className="px-4 sm:px-6 py-2.5 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-zinc-600 dark:text-zinc-400 shrink-0">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-500" />
            <span>This submission is permanently archived and locked from editing.</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Export Actions */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-2.5 py-1 bg-zinc-900 dark:bg-white text-white dark:text-black text-[11px] font-bold rounded hover:opacity-90 flex items-center gap-1 cursor-pointer"
            >
              {isGeneratingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={isSharingWhatsApp}
              className="px-2.5 py-1 bg-[#25D366] text-white text-[11px] font-bold rounded hover:opacity-90 flex items-center gap-1 cursor-pointer"
            >
              <Share2 className="w-3 h-3" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Stats Summary Strip */}
        <div className="grid grid-cols-4 gap-2 p-4 bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 shrink-0 text-center">
          <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-bold block uppercase">TOTAL QUESTIONS</span>
            <span className="text-lg font-black font-mono">{totalTasks}</span>
          </div>

          <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block uppercase">YES (DONE)</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{completedCount}</span>
          </div>

          <div className="p-2 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
            <span className="text-[10px] text-red-700 dark:text-red-300 font-bold block uppercase">NO (INCOMPLETE)</span>
            <span className="text-lg font-black text-red-600 dark:text-red-400 font-mono">{noCount}</span>
          </div>

          <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
            <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold block uppercase">PHOTO PROOFS</span>
            <span className="text-lg font-black text-purple-600 dark:text-purple-400 font-mono">{totalPhotos}</span>
          </div>
        </div>

        {/* Questions List (Read Only Table / Cards) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 modal-scroll-area">
          {tasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500 uppercase font-bold">
              No individual task records available for this submission log.
            </div>
          ) : (
            tasks.map((task, idx) => {
              const isDone = Boolean(task.completed);
              const mediaList = task.media || [];
              const photoMedia = mediaList.filter((m) => m.type === 'photo');

              return (
                <div
                  key={`submission-task-${task.id || 'no-id'}-${idx}`}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isLightMode
                      ? 'bg-white border-zinc-200'
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-zinc-400">
                          #{idx + 1}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {task.title}
                        </h4>
                      </div>

                      {task.details && task.details !== task.title && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {task.details}
                        </p>
                      )}

                      {/* Subtasks if any */}
                      {task.subTasks && task.subTasks.length > 0 && (
                        <div className="mt-2 pl-3 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-1">
                          {task.subTasks.map((sub, sIdx) => (
                            <div key={sub.id || sIdx} className="flex items-center gap-2 text-xs">
                              {sub.isDone ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> [Done]
                                </span>
                              ) : (
                                <span className="text-zinc-400 font-bold flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> [Pending]
                                </span>
                              )}
                              <span className="text-zinc-700 dark:text-zinc-300">{sub.title}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {task.notes && task.notes.trim() && (
                        <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-900 dark:text-amber-200 font-medium">
                          <strong>Note:</strong> "{task.notes}"
                        </div>
                      )}

                      {/* Photo Attachments Thumbnails */}
                      {photoMedia.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /> Photo Proofs ({photoMedia.length}):
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {photoMedia.map((m) => (
                              <button
                                key={m.id || m.url}
                                type="button"
                                onClick={() => onViewMedia && onViewMedia(m)}
                                className="relative w-14 h-14 rounded overflow-hidden border border-zinc-300 dark:border-zinc-700 group cursor-pointer hover:opacity-90"
                              >
                                <img
                                  src={m.url}
                                  alt={m.name || 'Proof'}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white text-xs font-black uppercase rounded shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> YES
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-xs font-black uppercase rounded shadow-xs">
                          <XCircle className="w-3.5 h-3.5" /> NO
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Actions Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-900 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-zinc-400 font-bold">
            Ref ID: {record.id}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white text-black hover:bg-zinc-200 text-xs font-black uppercase tracking-wider rounded cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
