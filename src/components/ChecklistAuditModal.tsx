import React, { useState } from 'react';
import {
  X,
  Lock,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Share2,
  Camera,
  Video,
  FileText,
  AlertCircle,
  ShieldCheck,
  Check,
  Eye,
  Loader2,
} from 'lucide-react';
import { TaskItem, TaskMedia } from '../types';
import { useTheme } from '../context/ThemeContext';
import { shareChecklistUpdate } from '../utils/shareUtils';

interface ChecklistAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklistHeader: string;
  tasks: TaskItem[];
  submittedBy?: string;
  submittedAt?: string;
  department?: string;
  onViewMedia?: (media: TaskMedia) => void;
  onShareFeedback?: (msg: string) => void;
}

export const ChecklistAuditModal: React.FC<ChecklistAuditModalProps> = ({
  isOpen,
  onClose,
  checklistHeader,
  tasks,
  submittedBy = 'Staff Member',
  submittedAt,
  department = 'General Operations',
  onViewMedia,
  onShareFeedback,
}) => {
  const { isLightMode } = useTheme();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen) return null;

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const completedCount = safeTasks.filter((t) => t.completed).length;
  const totalCount = safeTasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  const formattedDate = submittedAt
    ? new Date(submittedAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  const formattedTime = submittedAt
    ? new Date(submittedAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

  const handleShare = async () => {
    setIsGeneratingPdf(true);
    if (onShareFeedback) {
      onShareFeedback('Generating exact submitted PDF & opening share...');
    }

    try {
      const res = await shareChecklistUpdate({
        checklistName: checklistHeader,
        staffName: submittedBy,
        timeStr: formattedTime,
        department,
        tasks: safeTasks,
      });

      if (res.success && onShareFeedback) {
        onShareFeedback(res.notice || `✓ Shared: "${res.message}"`);
      } else if (res.notice && onShareFeedback) {
        onShareFeedback(res.notice);
      }
    } catch (err) {
      console.error('Audit modal share error:', err);
      if (onShareFeedback) {
        onShareFeedback('Failed to generate PDF share.');
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className={`w-full max-w-3xl my-auto rounded-xl shadow-2xl border flex flex-col overflow-hidden max-h-[92vh] ${
          isLightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-[#18211b] border-zinc-800'
        }`}
      >
        {/* Signature Google Forms Purple Header Bar */}
        <div className="h-3 w-full bg-[#673ab7] shrink-0" />

        {/* Audit Mode Warning Banner */}
        <div className="bg-[#673ab7]/15 dark:bg-purple-950/60 border-b border-purple-200 dark:border-purple-900/60 px-4 sm:px-6 py-2 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-[#673ab7] dark:text-purple-300 font-black uppercase tracking-wider text-[11px]">
            <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>EXACT READ-ONLY AUDIT VIEW</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-200/80 dark:bg-purple-900/80 text-purple-900 dark:text-purple-200 font-bold">
            All Inputs Disabled
          </span>
        </div>

        {/* Modal Header & Metadata Card */}
        <div
          className={`p-4 sm:p-6 border-b shrink-0 ${
            isLightMode ? 'bg-white border-zinc-200' : 'bg-[#1a231e] border-zinc-800'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-[#673ab7] text-white rounded">
                  {department}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Submitted & Recorded</span>
                </span>
              </div>

              <h2
                id="audit-modal-title"
                className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
              >
                {checklistHeader}
              </h2>

              {/* Submitter & Timing Details */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#673ab7] dark:text-purple-400 shrink-0" />
                  <span>
                    Staff: <strong className="text-zinc-900 dark:text-zinc-100">{submittedBy}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>Date: {formattedDate}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>Time: {formattedTime}</span>
                </div>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="audit-share-whatsapp-top-btn"
                onClick={handleShare}
                disabled={isGeneratingPdf}
                className={`px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-md shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                  isGeneratingPdf ? 'opacity-80 cursor-wait' : ''
                }`}
                title="Share this completed checklist PDF & text update to WhatsApp"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin stroke-[2.5]" />
                    <span className="hidden sm:inline">Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span className="hidden sm:inline">Share Update</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Questions List (Exact Google Form Cards in Read-Only Mode) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {safeTasks.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              No tasks found for this checklist record.
            </div>
          ) : (
            safeTasks.map((task, idx) => {
              const hasSubTasks = Boolean(task.subTasks && task.subTasks.length > 0);
              const subTasks = task.subTasks || [];
              const hasTaskMedia = Boolean(task.media && task.media.length > 0);
              const hasTaskNotes = Boolean(task.notes && task.notes.trim());

              return (
                <div
                  key={task.id || `audit-task-${idx}`}
                  className={`p-3 sm:p-4 rounded-lg border shadow-xs transition ${
                    isLightMode
                      ? 'bg-white border-zinc-200'
                      : 'bg-[#1a231e] border-zinc-800'
                  }`}
                >
                  {/* Question Header & Title */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-[#673ab7] dark:text-purple-400">
                          #{idx + 1}
                        </span>
                        <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                          {task.title}
                        </h3>
                        {task.isPhotoMandatory && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded border bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300">
                            Photo Required
                          </span>
                        )}
                        {task.priority === 'urgent' && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-red-600 text-white">
                            URGENT
                          </span>
                        )}
                      </div>

                      {task.details && task.details !== task.title && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">
                          {task.details}
                        </p>
                      )}
                    </div>

                    {/* Standard Audit Status Badge (PeakScale Style) */}
                    <div className="shrink-0">
                      {task.completed ? (
                        <span className="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-xs">
                          <span>✓ [ DONE ]</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded bg-red-600 text-white text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-xs">
                          <span>✕ [ NOT DONE ]</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sub-Tasks Checklist Section (Strictly Read-Only with Clean Unicode Checkmarks) */}
                  {hasSubTasks && (
                    <div
                      className={`mt-2 p-2 sm:p-2.5 border rounded space-y-1 ${
                        isLightMode
                          ? 'bg-zinc-50 border-zinc-200'
                          : 'bg-black/40 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-tight">
                        <span>Checklist Sub-Tasks ({subTasks.filter((s) => s.isDone).length}/{subTasks.length} Done)</span>
                      </div>

                      <div className="space-y-0.5 pt-0.5">
                        {subTasks.map((sub, sIdx) => (
                          <div
                            key={sub.id || `audit-sub-${sIdx}`}
                            className={`px-2 py-1 border rounded text-xs flex items-center justify-between gap-2 ${
                              sub.isDone
                                ? isLightMode
                                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950 font-medium'
                                  : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200 font-medium'
                                : isLightMode
                                ? 'bg-white border-zinc-200 text-zinc-600'
                                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`text-xs font-black ${sub.isDone ? 'text-emerald-600' : 'text-zinc-400'}`}>
                                {sub.isDone ? '✓' : '○'}
                              </span>
                              <span className={`truncate ${sub.isDone ? 'line-through opacity-80' : ''}`}>
                                {sub.title}
                              </span>
                            </div>

                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded shrink-0 ${
                              sub.isDone ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                            }`}>
                              {sub.isDone ? '[ Done ]' : '[ Pending ]'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Task Uploaded Media Proofs (Photos & Videos) */}
                  {hasTaskMedia && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                      <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1">
                        <Camera className="w-3 h-3 text-emerald-500" />
                        <span>Uploaded Verification Proofs ({task.media!.length}):</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {task.media!.map((m, mIdx) => (
                          <button
                            key={m.id || `audit-m-${mIdx}`}
                            type="button"
                            onClick={() => onViewMedia && onViewMedia(m)}
                            className="relative w-12 h-12 sm:w-14 sm:h-14 rounded border-2 border-zinc-300 dark:border-zinc-700 overflow-hidden cursor-pointer hover:border-[#673ab7] transition hover:scale-105"
                            title={`Click to view full ${m.type} proof`}
                          >
                            {m.type === 'photo' ? (
                              <img src={m.url} alt={m.name || 'Proof'} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-white">
                                <Video className="w-4 h-4 text-rose-400" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shift Notes / Observations */}
                  {hasTaskNotes && (
                    <div className="mt-2.5 p-2 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded text-xs text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[10px] uppercase text-amber-700 dark:text-amber-400 block">
                          Recorded Observation:
                        </span>
                        <p className="italic">{task.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Rejection notice if any */}
                  {task.rejectionReason && (
                    <div className="mt-2 p-2 bg-red-950/80 text-red-200 rounded border border-red-600 text-xs">
                      <strong>❌ Rejection Stamp:</strong> "{task.rejectionReason}"
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div
          className={`p-3.5 sm:p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
            isLightMode ? 'bg-white border-zinc-200' : 'bg-[#1a231e] border-zinc-800'
          }`}
        >
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            Audit Summary: <strong className="text-zinc-900 dark:text-zinc-100">{completedCount} of {totalCount}</strong> questions completed ({percentage}%)
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              id="audit-share-whatsapp-bottom-btn"
              onClick={handleShare}
              disabled={isGeneratingPdf}
              className={`flex-1 sm:flex-initial px-4 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-md shadow flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                isGeneratingPdf ? 'opacity-80 cursor-wait' : ''
              }`}
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Share Update to WhatsApp</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-md transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
