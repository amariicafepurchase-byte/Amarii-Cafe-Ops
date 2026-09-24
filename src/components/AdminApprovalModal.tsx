import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  Check,
  XCircle,
  Clock,
  User,
  MapPin,
  AlertTriangle,
  FileText,
  Building2,
  Sparkles,
  Search,
  Maximize2,
} from 'lucide-react';
import { TaskItem, TaskMedia } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface AdminApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  onApproveTask: (taskId: string) => Promise<void> | void;
  onRejectTask: (taskId: string, reason: string) => Promise<void> | void;
  onViewMedia: (media: TaskMedia) => void;
}

export const AdminApprovalModal: React.FC<AdminApprovalModalProps> = ({
  isOpen,
  onClose,
  tasks = [],
  onApproveTask,
  onRejectTask,
  onViewMedia,
}) => {
  const { isLightMode } = useTheme();
  const { isAdmin, isManager } = useAuth();

  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  // Filter tasks pending approval OR recently rejected
  const pendingTasks = tasks.filter(
    (t) =>
      t.approvalStatus === 'pending' ||
      (t.media && t.media.length > 0 && !t.completed && t.approvalStatus !== 'approved')
  );

  const filteredPending = pendingTasks.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.department || '').toLowerCase().includes(q) ||
      (t.submittedBy || '').toLowerCase().includes(q) ||
      (t.outlet || '').toLowerCase().includes(q)
    );
  });

  const handleConfirmReject = async (taskId: string) => {
    if (!rejectReason.trim()) return;
    setIsSubmitting(true);
    try {
      await onRejectTask(taskId, rejectReason.trim());
      setRejectingTaskId(null);
      setRejectReason('');
    } catch (err) {
      console.error('Reject task error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (taskId: string) => {
    setIsSubmitting(true);
    try {
      await onApproveTask(taskId);
    } catch (err) {
      console.error('Approve task error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-sm border-2 sm:border-4 border-black shadow-2xl overflow-hidden ${
          isLightMode ? 'bg-white text-zinc-950' : 'bg-zinc-950 text-white'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 bg-zinc-900 text-white flex items-center justify-between border-b-2 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500 text-black font-black shadow-md">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                  Admin Task Verification & Approval
                </h2>
                <span className="px-2 py-0.5 bg-amber-500 text-black text-xs font-black uppercase rounded-xs">
                  {pendingTasks.length} Pending
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                Owner Hemen Das Quality Control • Inspect HD Photos & Video SOP Proofs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className={`p-3 sm:p-4 border-b flex items-center gap-3 ${isLightMode ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by task title, department, staff, or outlet..."
              className={`w-full pl-9 pr-3 py-2 text-xs font-bold uppercase border-2 outline-none ${
                isLightMode ? 'bg-white border-zinc-300 text-black' : 'bg-black border-zinc-700 text-white'
              }`}
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredPending.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-zinc-300 dark:border-zinc-800 p-8">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3 stroke-[1.5]" />
              <h3 className="text-lg font-black uppercase tracking-tight">All Tasks Verified!</h3>
              <p className="text-xs text-zinc-500 font-bold uppercase mt-1">
                No pending tasks awaiting Admin Hemen Das photo proof inspection.
              </p>
            </div>
          ) : (
            filteredPending.map((task, taskIdx) => (
              <div
                key={task.id ? `approval-task-${task.id}` : `approval-task-idx-${taskIdx}`}
                className={`p-4 border-2 rounded-xs transition shadow-sm ${
                  isLightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900/80 border-zinc-800'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left: Task Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-amber-500/20 text-amber-500 border border-amber-500/40">
                        Pending Admin Review
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-zinc-800 text-zinc-300">
                        {task.department || 'General'}
                      </span>
                      {task.outlet && (
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {task.outlet}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
                      {task.title}
                    </h3>

                    {task.details && (
                      <p className="text-xs text-zinc-500 font-medium italic">{task.details}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-400 pt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-amber-500" />
                        Submitted By: <strong className="text-white">{task.submittedBy || task.assignee || 'Staff'}</strong>
                      </span>
                      {task.submittedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          {new Date(task.submittedAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </span>
                      )}
                    </div>

                    {/* Rejection notice if previously rejected */}
                    {task.rejectionReason && (
                      <div className="p-2.5 bg-red-950/60 border border-red-800 text-red-300 text-xs font-bold rounded-xs flex items-start gap-2 mt-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-black uppercase text-red-400">Previous Rejection Note:</p>
                          <p className="text-red-200 mt-0.5">"{task.rejectionReason}"</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Attached Photos / Media Proof */}
                  <div className="w-full md:w-64 shrink-0 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      Uploaded Photo/Video Proofs ({task.media?.length || 0}):
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {task.media && task.media.length > 0 ? (
                        task.media.map((m, mIdx) => (
                          <div
                            key={m.id ? `modal-media-${task.id}-${m.id}` : `modal-media-${task.id}-${mIdx}-${m.type}`}
                            onClick={() => onViewMedia(m)}
                            className="relative aspect-video bg-black border border-zinc-700 overflow-hidden cursor-pointer group rounded-xs shadow"
                          >
                            {m.type === 'photo' ? (
                              <img
                                src={m.url}
                                alt={m.name || 'Task Proof'}
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                              />
                            ) : (
                              <video src={m.url} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                              <Maximize2 className="w-4 h-4" />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 p-3 bg-red-950/40 border border-red-800 text-center text-red-400 text-xs font-bold">
                          No Photo Proof Attached
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="mt-4 pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-end gap-2">
                  {rejectingTaskId === task.id ? (
                    <div className="w-full flex flex-col sm:flex-row items-center gap-2 pt-1 animate-in fade-in">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Specify rejection reason (e.g. Photo is blurry, clean counter again)..."
                        className="flex-1 px-3 py-2 text-xs font-bold uppercase bg-black border-2 border-red-600 text-white outline-none"
                        autoFocus
                      />
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleConfirmReject(task.id)}
                          disabled={isSubmitting || !rejectReason.trim()}
                          className="flex-1 sm:flex-initial px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase cursor-pointer disabled:opacity-50"
                        >
                          Confirm Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingTaskId(null);
                            setRejectReason('');
                          }}
                          className="px-3 py-2 bg-zinc-800 text-zinc-300 text-xs font-bold uppercase hover:bg-zinc-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingTaskId(task.id);
                          setRejectReason('');
                        }}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-300 text-xs font-black uppercase tracking-tight transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span>Reject (नकार द्या)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApprove(task.id)}
                        disabled={isSubmitting}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-tight transition flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Approve Task (मंजूर करा)</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-white text-black font-black uppercase text-xs hover:bg-zinc-200 transition cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
