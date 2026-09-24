import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  AlertCircle,
  Clock,
  User,
  Tag,
  Film,
  Image as ImageIcon,
  Edit2,
  FileText,
  Play,
  Camera,
  Video,
  Save,
  X,
  Trash2,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TaskItem, TaskMedia, StaffMember, SubTaskItem } from '../types';
import { DEPARTMENT_COLORS } from '../data/staffData';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { LiveCameraModal } from './LiveCameraModal';

interface TaskCardProps {
  task: TaskItem;
  onToggle: (id: string) => void;
  index: number;
  onEditTask?: (task: TaskItem) => void;
  onDeleteTask?: (taskId: string) => void;
  onViewMedia?: (media: TaskMedia) => void;
  onAddMediaToTask?: (taskId: string, media: TaskMedia) => void;
  onUpdateTaskNote?: (taskId: string, note: string) => void;
  onToggleSubTask?: (taskId: string, subTaskId: string) => void;
  onAddSubTaskMedia?: (taskId: string, subTaskId: string, media: TaskMedia) => void;
  onUpdateSubTaskNote?: (taskId: string, subTaskId: string, note: string) => void;
  onApproveTask?: (taskId: string) => void;
  onRejectTask?: (taskId: string, reason: string) => void;
  staffList?: StaffMember[];
  isBlocked?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggle,
  index,
  onEditTask,
  onDeleteTask,
  onViewMedia,
  onAddMediaToTask,
  onUpdateTaskNote,
  onToggleSubTask,
  onAddSubTaskMedia,
  onUpdateSubTaskNote,
  onApproveTask,
  onRejectTask,
  staffList = [],
  isBlocked = false,
}) => {
  const { isLightMode } = useTheme();
  const { canDeleteTask, canEditTask, isAdmin } = useAuth();
  const isDeleteAllowed = Boolean(canDeleteTask);
  const isUrgent = task.priority === 'urgent';
  const isPending = task.priority === 'pending';

  // Inline rejection state on the card for Hemen Das
  const [isCardRejecting, setIsCardRejecting] = useState<boolean>(false);
  const [cardRejectReason, setCardRejectReason] = useState<string>('');

  // Dedicated Parent Task / Checklist Delete Handler
  const handleDeleteTaskCard = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!task || !task.id) {
      console.error('TaskCard: Missing task.id for delete', task);
      return;
    }

    if (!isDeleteAllowed) {
      return;
    }

    if (confirmDelete) {
      if (onDeleteTask) {
        onDeleteTask(task.id);
        setConfirmDelete(false);
      }
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  // Inline notes editing state for parent
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);
  const [noteDraft, setNoteDraft] = useState<string>(task.notes || '');

  // Confirm delete state
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  // Subtasks collapsed/expanded state
  const [isSubTasksExpanded, setIsSubTasksExpanded] = useState<boolean>(true);

  // Hidden file input refs for video attachment (strictly video format)
  const videoInputRef = useRef<HTMLInputElement>(null);
  const subTaskVideoInputRef = useRef<HTMLInputElement>(null);
  const [activeSubTaskIdForMedia, setActiveSubTaskIdForMedia] = useState<string | null>(null);

  // Sub-task inline note drafting state
  const [editingSubTaskIdForNote, setEditingSubTaskIdForNote] = useState<string | null>(null);
  const [subTaskNoteDraft, setSubTaskNoteDraft] = useState<string>('');

  // Local warning message when user clicks checkbox with pending subtasks
  const [localBlockMsg, setLocalBlockMsg] = useState<string | null>(null);

  // Live camera modal state
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState<boolean>(false);
  const [liveCameraSubTaskId, setLiveCameraSubTaskId] = useState<string | null>(null);

  const handleLiveCameraCapture = (capturedMedia: TaskMedia) => {
    if (liveCameraSubTaskId) {
      if (onAddSubTaskMedia) {
        onAddSubTaskMedia(task.id, liveCameraSubTaskId, capturedMedia);
      } else if (onAddMediaToTask) {
        onAddMediaToTask(task.id, capturedMedia);
      }
    } else {
      if (onAddMediaToTask) {
        onAddMediaToTask(task.id, capturedMedia);
      }
    }
    setIsLiveCameraOpen(false);
    setLiveCameraSubTaskId(null);
  };

  // Find assigned staff details if any
  const assignedStaff = staffList.find(
    (s) => s.id === task.assigneeId || (task.assignee && task.assignee.includes(s.name))
  );

  const deptKey = (task.department as keyof typeof DEPARTMENT_COLORS) || 'General';
  const deptStyle = DEPARTMENT_COLORS[deptKey] || DEPARTMENT_COLORS.General;

  const hasMedia = task.media && task.media.length > 0;
  const hasNotes = Boolean(task.notes);

  // Sub-tasks calculations
  const subTasks = task.subTasks || [];
  const hasSubTasks = subTasks.length > 0;
  const doneSubTasksCount = subTasks.filter((s) => s.isDone).length;
  const allSubTasksDone = !hasSubTasks || doneSubTasksCount === subTasks.length;
  const subTasksProgress = hasSubTasks ? Math.round((doneSubTasksCount / subTasks.length) * 100) : 100;

  // Check parent task missing proofs
  const isTaskPhotoRequired = Boolean(task.isPhotoMandatory || task.mandatoryMedia === 'photo');
  const hasTaskPhoto = Boolean(
    (task.media && task.media.some((m) => m.type === 'photo')) ||
    (task.subTasks && task.subTasks.some((st) => st.media && st.media.some((m) => m.type === 'photo')))
  );
  const isTaskPhotoMissing = isTaskPhotoRequired && !hasTaskPhoto;

  const isTaskVideoRequired = Boolean(task.isVideoMandatory || task.mandatoryMedia === 'video');
  const hasTaskVideo = Boolean(
    (task.media && task.media.some((m) => m.type === 'video')) ||
    (task.subTasks && task.subTasks.some((st) => st.media && st.media.some((m) => m.type === 'video')))
  );
  const isTaskVideoMissing = isTaskVideoRequired && !hasTaskVideo;

  const isTaskNoteRequired = Boolean(task.isNoteMandatory);
  const hasTaskNote = Boolean(task.notes && task.notes.trim());
  const isTaskNoteMissing = isTaskNoteRequired && !hasTaskNote;

  // Check missing subtasks proofs (photo, video, note)
  const subTasksMissingProofs = subTasks.filter((s) => {
    const reqPhoto = Boolean(s.isPhotoMandatory || s.mandatoryMedia === 'photo');
    const hasPhoto = Boolean(
      (s.media && s.media.some((m) => m.type === 'photo')) ||
      (task.media && task.media.some((m) => m.type === 'photo'))
    );
    if (reqPhoto && !hasPhoto) return true;

    const reqVideo = Boolean(s.isVideoMandatory || s.mandatoryMedia === 'video');
    const hasVideo = Boolean(
      (s.media && s.media.some((m) => m.type === 'video')) ||
      (task.media && task.media.some((m) => m.type === 'video'))
    );
    if (reqVideo && !hasVideo) return true;

    const reqNote = Boolean(s.isNoteMandatory);
    const hasNote = Boolean(s.notes && s.notes.trim());
    if (reqNote && !hasNote) return true;

    return false;
  });

  const hasMissingParentProof = isTaskPhotoMissing || isTaskVideoMissing || isTaskNoteMissing;
  const hasMissingSubTaskProofs = subTasksMissingProofs.length > 0;
  const hasMissingMandatory = !task.completed && (hasMissingParentProof || (!allSubTasksDone || hasMissingSubTaskProofs));

  // Handle direct video attachment to parent task (Strictly Video format)
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const newMedia: TaskMedia = {
          id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          type: 'video',
          url,
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          uploadedAt: new Date().toISOString(),
        };
        if (onAddMediaToTask) {
          onAddMediaToTask(task.id, newMedia);
        }
      };
      reader.readAsDataURL(file);
    });

    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // Handle direct video attachment for a nested subtask (Strictly Video format)
  const handleSubTaskVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeSubTaskIdForMedia) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const newMedia: TaskMedia = {
          id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          type: 'video',
          url,
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          uploadedAt: new Date().toISOString(),
        };
        if (onAddSubTaskMedia) {
          onAddSubTaskMedia(task.id, activeSubTaskIdForMedia, newMedia);
        } else if (onAddMediaToTask) {
          onAddMediaToTask(task.id, newMedia);
        }
      };
      reader.readAsDataURL(file);
    });

    if (subTaskVideoInputRef.current) subTaskVideoInputRef.current.value = '';
    setActiveSubTaskIdForMedia(null);
  };

  const handleToggleSubTaskNoteEditor = (sub: SubTaskItem) => {
    if (editingSubTaskIdForNote === sub.id) {
      setEditingSubTaskIdForNote(null);
      setSubTaskNoteDraft('');
    } else {
      setEditingSubTaskIdForNote(sub.id);
      setSubTaskNoteDraft(sub.notes || '');
    }
  };

  const handleSaveSubTaskNoteInline = (subId: string) => {
    if (onUpdateSubTaskNote) {
      onUpdateSubTaskNote(task.id, subId, subTaskNoteDraft.trim());
    }
    setEditingSubTaskIdForNote(null);
    setSubTaskNoteDraft('');
  };

  const handleSaveNoteInline = () => {
    if (onUpdateTaskNote) {
      onUpdateTaskNote(task.id, noteDraft.trim());
    }
    setIsEditingNote(false);
  };

  // Handle clicking parent checkbox with pre-flight check
  const handleParentToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!task.completed) {
      if (isTaskPhotoMissing && isTaskVideoMissing) {
        setLocalBlockMsg(`Both Photo & Video proofs are required for "${task.title}"!`);
        setTimeout(() => setLocalBlockMsg(null), 5000);
        return;
      }
      if (isTaskPhotoMissing) {
        setLocalBlockMsg(`Photo proof is required for "${task.title}"! Tap 📷 Camera below.`);
        setTimeout(() => setLocalBlockMsg(null), 5000);
        return;
      }
      if (isTaskVideoMissing) {
        setLocalBlockMsg(`Video proof is required for "${task.title}"! Attach video below.`);
        setTimeout(() => setLocalBlockMsg(null), 5000);
        return;
      }
      if (isTaskNoteMissing) {
        setLocalBlockMsg(`Shift Note is required for "${task.title}"!`);
        setTimeout(() => setLocalBlockMsg(null), 5000);
        return;
      }

      // Check subtasks completion
      if (hasSubTasks && !allSubTasksDone) {
        const pending = subTasks.filter((s) => !s.isDone);
        setLocalBlockMsg(`Cannot complete: ${pending.length} sub-task(s) still incomplete!`);
        setTimeout(() => setLocalBlockMsg(null), 5000);
        return;
      }

      // Check subtask proofs (photo, video, note)
      if (hasMissingSubTaskProofs) {
        const first = subTasksMissingProofs[0];
        const reqs: string[] = [];
        if (first.isPhotoMandatory || first.mandatoryMedia === 'photo') reqs.push('Photo');
        if (first.isVideoMandatory || first.mandatoryMedia === 'video') reqs.push('Video');
        if (first.isNoteMandatory) reqs.push('Note');
        setLocalBlockMsg(`Proof required for sub-task "${first.title}": ${reqs.join(' & ')}`);
        setTimeout(() => setLocalBlockMsg(null), 5000);
        return;
      }
    }

    setLocalBlockMsg(null);
    onToggle(task.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{
        opacity: task.completed ? 0.55 : 1,
        y: 0,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        x: -24,
        scale: 0.95,
        transition: { duration: 0.18, ease: 'easeOut' },
      }}
      transition={{
        duration: 0.22,
        ease: [0.16, 1, 0.3, 1],
        layout: { duration: 0.2, ease: 'easeOut' },
      }}
      id={`task-item-${task.id}`}
      className={`group relative p-3.5 sm:p-4 transition-colors duration-150 rounded-sm border-2 ${
        isUrgent
          ? task.completed
            ? isLightMode
              ? 'bg-red-50/40 opacity-50 border-red-200'
              : 'bg-zinc-900/60 opacity-50 border-zinc-700'
            : isLightMode
            ? 'bg-red-50/90 border-red-600 shadow-sm'
            : 'bg-zinc-950 border-red-500 shadow-md'
          : isPending
          ? task.completed
            ? isLightMode
              ? 'bg-zinc-100 opacity-50 border-zinc-300'
              : 'bg-zinc-900/50 opacity-50 border-zinc-800'
            : isLightMode
            ? 'bg-amber-50/70 border-amber-400'
            : 'bg-zinc-900/80 border-zinc-700'
          : task.completed
          ? isLightMode
            ? 'bg-zinc-100 opacity-50 border-zinc-300'
            : 'bg-zinc-900/40 opacity-50 border-zinc-800'
          : isLightMode
          ? 'bg-white hover:bg-zinc-50 border-zinc-300 hover:border-zinc-400 shadow-xs'
          : 'bg-zinc-900/95 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Hidden File Inputs for Video Upload (Strictly Video Format) */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        className="hidden"
      />
      <input
        ref={subTaskVideoInputRef}
        type="file"
        accept="video/*"
        onChange={handleSubTaskVideoUpload}
        className="hidden"
      />

      <div className="flex items-start gap-3 sm:gap-3.5">
        {/* Large Touch-Friendly Checkbox for Parent Task */}
        <button
          type="button"
          id={`checkbox-${task.id}`}
          aria-label={task.completed ? 'Mark uncompleted' : 'Mark completed'}
          className={`mt-0.5 flex-shrink-0 w-7 h-7 sm:w-6 sm:h-6 border-2 flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
            task.completed
              ? isLightMode
                ? 'bg-zinc-950 border-zinc-950 text-white'
                : 'bg-white border-white text-black'
              : isUrgent
              ? isLightMode
                ? 'border-red-600 hover:bg-red-600 hover:text-white text-transparent'
                : 'border-red-500 hover:bg-red-500 hover:text-black text-transparent'
              : isLightMode
              ? 'border-zinc-500 hover:border-zinc-900 text-transparent'
              : 'border-zinc-400 hover:border-white text-transparent'
          }`}
          onClick={handleParentToggleClick}
          title={
            task.completed
              ? 'Click to uncheck checklist'
              : hasSubTasks && !allSubTasksDone
              ? 'Complete all sub-tasks first'
              : 'Click to mark checklist complete'
          }
        >
          {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
        </button>

        {/* Task Info & Actions */}
        <div className="flex-1 min-w-0">
          {/* Top Badges Bar: Group Header, Timeline Window, Priority */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
            {/* Checklist Group Header Badge */}
            {task.checklistHeader && (
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-blue-600 text-white flex items-center gap-1">
                <Tag className="w-3 h-3 stroke-[2.5]" />
                <span>{task.checklistHeader}</span>
              </span>
            )}

            {/* Department Badge */}
            {task.department && (
              <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 ${deptStyle.badge}`}>
                {task.department}
              </span>
            )}

            {/* Priority Badge */}
            {isUrgent && (
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 bg-red-600 text-white flex items-center gap-1">
                <AlertCircle className="w-3 h-3 stroke-[3]" />
                URGENT
              </span>
            )}

            {/* Awaiting Approval Status Badge specifically highlighting Hemen Das Photo Quality Check */}
            {(task.approvalStatus === 'pending' || (task.priority === 'pending' && !task.completed)) && (
              <span
                id={`awaiting-approval-badge-${task.id}`}
                className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border flex items-center gap-1.5 shadow-xs animate-pulse ${
                  isLightMode
                    ? 'bg-amber-100 text-amber-950 border-amber-400'
                    : 'bg-amber-950/90 text-amber-300 border-amber-500'
                }`}
                title="Awaiting photo quality check & approval by Hemen Das"
              >
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 stroke-[2.5]" />
                <span>⏳ Awaiting Approval • Hemen Das Quality Check</span>
              </span>
            )}

            {task.approvalStatus === 'rejected' && (
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 bg-red-600 text-white flex items-center gap-1 animate-pulse">
                <AlertCircle className="w-3 h-3 stroke-[2.5]" />
                ❌ REJECTED BY HEMEN DAS
              </span>
            )}

            {task.approvalStatus === 'approved' && (
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 bg-emerald-600 text-white flex items-center gap-1">
                <Check className="w-3 h-3 stroke-[3]" />
                ✓ APPROVED BY HEMEN DAS
              </span>
            )}

            {/* Timeline Window: Prominently displayed Start - End Time & Top Delete Button */}
            <div className="ml-auto flex items-center gap-1.5">
              <span
                className={`text-[10px] sm:text-xs font-mono font-black uppercase px-2 py-0.5 border flex items-center gap-1 ${
                  task.completed
                    ? isLightMode
                      ? 'bg-zinc-100 text-zinc-600 border-zinc-300'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    : isLightMode
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                    : 'bg-zinc-800 text-amber-300 border-amber-500/50'
                }`}
                title={`Valid filling window: ${task.startTime || 'Start'} to ${task.endTime || task.deadline || 'End'}`}
              >
                <Clock className="w-3 h-3 stroke-[2.5]" />
                <span>
                  {task.startTime ? `${task.startTime} – ${task.endTime || task.deadline}` : task.deadline || 'Anytime'}
                </span>
              </span>

              {/* Top Quick Delete Button for Admin and Manager */}
              {isDeleteAllowed && (
                <button
                  type="button"
                  id={`top-delete-task-${task.id}`}
                  onClick={handleDeleteTaskCard}
                  className={`p-1 border transition cursor-pointer active:scale-90 flex items-center justify-center ${
                    isLightMode
                      ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:border-red-400'
                      : 'bg-red-950/50 hover:bg-red-900/80 text-red-400 border-red-900/70 hover:border-red-600'
                  } ${confirmDelete ? 'w-auto px-2 border-red-500' : 'w-7'}`}
                  title={confirmDelete ? 'Click again to confirm delete' : `Delete checklist "${task.title}"`}
                  aria-label={`Delete task ${task.title}`}
                >
                  {confirmDelete ? (
                    <span className="text-[10px] font-black uppercase whitespace-nowrap">Confirm?</span>
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="flex items-center justify-between gap-2">
            <p
              onClick={handleParentToggleClick}
              className={`font-black text-sm sm:text-base leading-snug uppercase tracking-tight cursor-pointer ${
                task.completed
                  ? isLightMode
                    ? 'line-through text-zinc-400'
                    : 'line-through opacity-70 text-white'
                  : isLightMode
                  ? 'text-zinc-950 hover:text-black'
                  : 'text-white hover:text-zinc-200'
              }`}
            >
              {task.title}
            </p>

            {hasSubTasks && (
              <button
                type="button"
                onClick={() => setIsSubTasksExpanded(!isSubTasksExpanded)}
                className="p-1 text-zinc-400 hover:text-white transition cursor-pointer flex-shrink-0"
                title={isSubTasksExpanded ? 'Collapse sub-tasks' : 'Expand sub-tasks'}
              >
                {isSubTasksExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Details */}
          {task.details && task.details !== task.title && (
            <p
              className={`text-xs sm:text-sm mt-1 leading-relaxed ${
                task.completed
                  ? isLightMode
                    ? 'line-through text-zinc-400'
                    : 'line-through text-zinc-600'
                  : isLightMode
                  ? 'text-zinc-700 font-medium'
                  : 'text-zinc-400 font-medium'
              }`}
            >
              {task.details}
            </p>
          )}

          {/* Rejection Notice Banner from Admin Hemen Das */}
          {task.rejectionReason && (
            <div className="mt-2.5 p-2.5 bg-red-950/90 text-red-200 text-xs font-bold border-2 border-red-600 shadow-md flex items-start justify-between gap-2 animate-in slide-in-from-top-1">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5 stroke-[2.5]" />
                <div>
                  <span className="font-black uppercase text-red-400 block">❌ Rejected by Admin Hemen Das:</span>
                  <span className="text-red-200 mt-0.5 block">"{task.rejectionReason}"</span>
                  <span className="text-[10px] text-amber-400 uppercase font-black tracking-wider block mt-1">
                    👉 Please capture a new clear photo/video proof and re-submit.
                  </span>
                </div>
              </div>
              {isAdmin && onApproveTask && (
                <button
                  type="button"
                  id={`card-reapprove-btn-${task.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onApproveTask(task.id);
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-tight flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95 rounded-xs shrink-0"
                  title="Override rejection and approve task"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>✓ Re-Approve</span>
                </button>
              )}
            </div>
          )}

          {/* Awaiting Approval Notice Bar: Specifically highlights photo quality verification by Hemen Das */}
          {((task.approvalStatus === 'pending') ||
            (task.priority === 'pending' && !task.completed) ||
            (task.completed && task.approvalStatus !== 'approved') ||
            (hasMedia && task.approvalStatus !== 'approved')) &&
            !task.rejectionReason && (
            <div
              id={`awaiting-approval-banner-${task.id}`}
              className={`mt-2.5 p-2.5 border-2 rounded-xs space-y-2 shadow-xs ${
                isLightMode
                  ? 'bg-amber-50/95 border-amber-400 text-amber-950'
                  : 'bg-amber-950/40 border-amber-600/80 text-amber-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 bg-amber-500 text-black rounded-xs flex-shrink-0">
                    <Camera className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider block text-amber-600 dark:text-amber-400">
                      Awaiting Approval • Photo Quality Check
                    </span>
                    <span className="text-[11px] font-medium block truncate">
                      {task.submittedBy ? `Submitted by ${task.submittedBy}` : 'Staff submitted'} • Waiting for <strong className="font-black">Hemen Das</strong> to inspect photo quality & approve
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-black uppercase bg-amber-500 text-black px-2 py-0.5 rounded-xs flex-shrink-0 shadow-xs">
                  In Review
                </span>
              </div>

              {/* DIRECT 1-CLICK APPROVAL CONTROLS FOR HEMEN DAS */}
              {isAdmin && (
                <div className="pt-2 border-t border-amber-300/60 dark:border-amber-700/60 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1">
                      <span>👑 Hemen Das Inspection Actions:</span>
                    </span>

                    {!isCardRejecting && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        {onApproveTask && (
                          <button
                            type="button"
                            id={`card-approve-btn-${task.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onApproveTask(task.id);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-tight flex items-center gap-1.5 transition cursor-pointer shadow-md active:scale-95 rounded-xs animate-pulse"
                            title="Verify photo proof and officially approve task"
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>✓ APPROVE QUALITY</span>
                          </button>
                        )}

                        {onRejectTask && (
                          <button
                            type="button"
                            id={`card-reject-btn-${task.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsCardRejecting(true);
                            }}
                            className="px-2.5 py-1.5 bg-red-600/90 hover:bg-red-600 text-white text-xs font-black uppercase tracking-tight flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95 rounded-xs"
                            title="Reject photo proof with reason"
                          >
                            <X className="w-3.5 h-3.5 stroke-[3]" />
                            <span>✕ Reject</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isCardRejecting && (
                    <div className="p-2 bg-red-950/20 border border-red-500/40 rounded-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-red-500">
                          Select quick reason or write feedback:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCardRejecting(false);
                            setCardRejectReason('');
                          }}
                          className="text-[10px] text-zinc-400 hover:text-white uppercase font-bold"
                        >
                          ✕ Cancel
                        </button>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex flex-wrap gap-1">
                        {[
                          'Photo too blurry / unclear',
                          'Gauge / Temperature not visible',
                          'Station prep incomplete',
                          'Wrong area photographed',
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCardRejectReason(preset)}
                            className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-xs border cursor-pointer ${
                              cardRejectReason === preset
                                ? 'bg-red-600 text-white border-red-500'
                                : 'bg-black/40 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          value={cardRejectReason}
                          onChange={(e) => setCardRejectReason(e.target.value)}
                          placeholder="Type specific reason for staff..."
                          className={`flex-1 p-1.5 text-xs font-bold border rounded-xs outline-none ${
                            isLightMode ? 'bg-white border-red-400 text-black' : 'bg-black border-red-500 text-white'
                          }`}
                          autoFocus
                        />
                        <div className="flex items-center gap-1 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => {
                              if (onRejectTask && cardRejectReason.trim()) {
                                onRejectTask(task.id, cardRejectReason.trim());
                                setIsCardRejecting(false);
                                setCardRejectReason('');
                              }
                            }}
                            disabled={!cardRejectReason.trim()}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-[10px] font-black uppercase rounded-xs cursor-pointer shadow-xs"
                          >
                            Confirm Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Local Block Warning Notice when user attempts premature check */}
          {(localBlockMsg || (isBlocked && hasMissingMandatory)) && (
            <div className="mt-2.5 p-2.5 bg-red-600 text-white text-xs font-black uppercase tracking-tight flex items-center justify-between gap-2 border-2 border-red-400 shadow-md animate-in slide-in-from-top-1 duration-150">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-4 h-4 flex-shrink-0 stroke-[3]" />
                <span className="truncate">
                  {localBlockMsg || (
                    <>
                      Completion Blocked! Missing:{' '}
                      {[
                        !allSubTasksDone && `${subTasks.length - doneSubTasksCount} Incomplete Sub-tasks`,
                        hasMissingSubTaskProofs && 'Sub-task Proof Verification',
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </>
                  )}
                </span>
              </div>
              <span className="text-[10px] bg-black text-white px-2 py-0.5 font-black uppercase flex-shrink-0">
                Required
              </span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* NESTED SUB-TASKS CHECKLIST SECTION */}
          {/* ========================================================================= */}
          {hasSubTasks && (
            <div
              className={`mt-3 p-2.5 sm:p-3 border-2 rounded-xs space-y-2 ${
                isLightMode
                  ? 'bg-zinc-50 border-zinc-200'
                  : 'bg-black/60 border-zinc-800'
              }`}
            >
              {/* Sub-tasks Progress Header */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-blue-500 stroke-[2.5]" />
                  <span
                    className={`font-black uppercase tracking-tight text-[11px] ${
                      isLightMode ? 'text-zinc-900' : 'text-zinc-200'
                    }`}
                  >
                    Nested Checklist Items
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[10px] font-black ${
                      allSubTasksDone
                        ? 'text-emerald-500'
                        : isLightMode
                        ? 'text-zinc-700'
                        : 'text-zinc-400'
                    }`}
                  >
                    {doneSubTasksCount}/{subTasks.length} Done ({subTasksProgress}%)
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsSubTasksExpanded(!isSubTasksExpanded)}
                    className="text-[10px] text-zinc-400 hover:text-white uppercase font-bold cursor-pointer"
                  >
                    {isSubTasksExpanded ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-700/40 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    allSubTasksDone ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${subTasksProgress}%` }}
                />
              </div>

              {/* Sub-tasks interactive list */}
              {isSubTasksExpanded && (
                <div className="space-y-2 pt-1">
                  {subTasks.map((sub: SubTaskItem, sIdx: number) => {
                    const hasSubPhoto = Boolean(sub.media && sub.media.some((m) => m.type === 'photo'));
                    const hasSubVideo = Boolean(sub.media && sub.media.some((m) => m.type === 'video'));
                    const hasSubNote = Boolean(sub.notes && sub.notes.trim());

                    const isReqPhoto = Boolean(sub.isPhotoMandatory || sub.mandatoryMedia === 'photo');
                    const isReqVideo = Boolean(sub.isVideoMandatory || sub.mandatoryMedia === 'video');
                    const isReqNote = Boolean(sub.isNoteMandatory);

                    const subPhotoMissing = isReqPhoto && !hasSubPhoto;
                    const subVideoMissing = isReqVideo && !hasSubVideo;
                    const subNoteMissing = isReqNote && !hasSubNote;

                    return (
                      <div
                        key={sub.id ? `sub-${task.id}-${sub.id}-${sIdx}` : `sub-${task.id}-${sIdx}`}
                        className={`p-2.5 border transition text-xs rounded-xs space-y-2 ${
                          sub.isDone
                            ? isLightMode
                              ? 'bg-zinc-100/80 border-zinc-200 text-zinc-500'
                              : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-500'
                            : isLightMode
                            ? 'bg-white border-zinc-300 text-zinc-900 hover:border-zinc-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        {/* Subtask Top Header Row: Checkbox, Title, and Mandatory Proof Chips */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* Subtask Checkbox */}
                            <button
                              type="button"
                              onClick={() => onToggleSubTask && onToggleSubTask(task.id, sub.id)}
                              className={`w-4 h-4 border flex items-center justify-center transition cursor-pointer flex-shrink-0 ${
                                sub.isDone
                                  ? 'bg-emerald-500 border-emerald-500 text-black'
                                  : isLightMode
                                  ? 'border-zinc-400 hover:border-zinc-800'
                                  : 'border-zinc-600 hover:border-white'
                              }`}
                              title={sub.isDone ? 'Mark subtask incomplete' : 'Mark subtask complete'}
                            >
                              {sub.isDone && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>

                            {/* Subtask Title */}
                            <span
                              onClick={() => onToggleSubTask && onToggleSubTask(task.id, sub.id)}
                              className={`font-bold cursor-pointer select-none truncate ${
                                sub.isDone ? 'line-through opacity-60' : ''
                              }`}
                            >
                              {sub.title}
                            </span>
                          </div>

                          {/* Subtask Mandatory Proof Status Badges */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isReqPhoto && (
                              <span
                                className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tight border flex items-center gap-0.5 ${
                                  hasSubPhoto
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500 animate-pulse'
                                }`}
                                title={hasSubPhoto ? 'Photo proof attached' : 'Mandatory photo required'}
                              >
                                <Camera className="w-2.5 h-2.5" />
                                <span>{hasSubPhoto ? 'Photo ✓' : 'Photo Req'}</span>
                              </span>
                            )}

                            {isReqVideo && (
                              <span
                                className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tight border flex items-center gap-0.5 ${
                                  hasSubVideo
                                    ? 'bg-rose-950 text-rose-300 border-rose-700'
                                    : 'bg-rose-950/80 text-rose-300 border-rose-500 animate-pulse'
                                }`}
                                title={hasSubVideo ? 'Video proof attached' : 'Mandatory video required'}
                              >
                                <Video className="w-2.5 h-2.5" />
                                <span>{hasSubVideo ? 'Video ✓' : 'Video Req'}</span>
                              </span>
                            )}

                            {isReqNote && (
                              <span
                                className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tight border flex items-center gap-0.5 ${
                                  hasSubNote
                                    ? 'bg-amber-950 text-amber-300 border-amber-700'
                                    : 'bg-amber-950/80 text-amber-300 border-amber-500 animate-pulse'
                                }`}
                                title={hasSubNote ? 'Shift note entered' : 'Mandatory note required'}
                              >
                                <FileText className="w-2.5 h-2.5" />
                                <span>{hasSubNote ? 'Note ✓' : 'Note Req'}</span>
                              </span>
                            )}

                            {sub.isDone && (
                              <span className="text-[9px] font-mono text-emerald-500 font-bold ml-0.5">
                                ✓ Done
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Subtask Action Buttons: Directly under individual sub-tasks */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 pl-6">
                          {/* Live Camera Proof Button */}
                          <button
                            type="button"
                            id={`subtask-camera-${sub.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setLiveCameraSubTaskId(sub.id);
                              setIsLiveCameraOpen(true);
                            }}
                            className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-tight border flex items-center gap-1 cursor-pointer transition active:scale-95 ${
                              subPhotoMissing
                                ? 'bg-emerald-950 text-emerald-200 border-emerald-500 animate-pulse ring-1 ring-emerald-500/50'
                                : hasSubPhoto
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                                : isLightMode
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                            }`}
                            title={subPhotoMissing ? 'Mandatory photo proof required! Snap live camera photo' : 'Open live camera for this sub-task'}
                          >
                            <Camera className={`w-2.5 h-2.5 ${subPhotoMissing ? 'text-emerald-300' : 'text-emerald-500'}`} />
                            <span>{hasSubPhoto ? 'Photo ✓' : '📷 Camera'} {subPhotoMissing && '*'}</span>
                          </button>

                          {/* + Video Button */}
                          <button
                            type="button"
                            id={`subtask-video-${sub.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSubTaskIdForMedia(sub.id);
                              subTaskVideoInputRef.current?.click();
                            }}
                            className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-tight border flex items-center gap-1 cursor-pointer transition active:scale-95 ${
                              subVideoMissing
                                ? 'bg-rose-950 text-rose-200 border-rose-500 animate-pulse ring-1 ring-rose-500/50'
                                : hasSubVideo
                                ? 'bg-rose-950/60 text-rose-300 border-rose-700 hover:bg-rose-900'
                                : isLightMode
                                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                            }`}
                            title={subVideoMissing ? 'Mandatory video proof required!' : 'Attach video for this sub-task'}
                          >
                            <Video className={`w-2.5 h-2.5 ${subVideoMissing ? 'text-rose-300' : 'text-rose-500'}`} />
                            <span>{hasSubVideo ? 'Video ✓' : '+ Video'} {subVideoMissing && '*'}</span>
                          </button>

                          {/* + Note Button */}
                          <button
                            type="button"
                            id={`subtask-note-${sub.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSubTaskNoteEditor(sub);
                            }}
                            className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-tight border flex items-center gap-1 cursor-pointer transition active:scale-95 ${
                              subNoteMissing
                                ? 'bg-amber-950 text-amber-200 border-amber-500 animate-pulse ring-1 ring-amber-500/50'
                                : hasSubNote
                                ? 'bg-amber-950/60 text-amber-300 border-amber-700 hover:bg-amber-900'
                                : isLightMode
                                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                            }`}
                            title={subNoteMissing ? 'Mandatory shift note required!' : 'Add or edit shift note for this sub-task'}
                          >
                            <FileText className={`w-2.5 h-2.5 ${subNoteMissing ? 'text-amber-300' : 'text-amber-500'}`} />
                            <span>{hasSubNote ? 'Note ✓' : '+ Note'} {subNoteMissing && '*'}</span>
                          </button>
                        </div>

                        {/* Attached Media for Subtask (Thumbnails) */}
                        {sub.media && sub.media.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pl-6 pt-1">
                            {sub.media.map((m, mIdx) => (
                              <div
                                key={m.id ? `sub-media-${sub.id}-${m.id}-${mIdx}` : `sub-media-${sub.id}-${mIdx}`}
                                onClick={() => onViewMedia && onViewMedia(m)}
                                className={`group/thumb relative cursor-pointer border rounded-xs overflow-hidden flex items-center gap-1.5 p-1 ${
                                  isLightMode ? 'bg-zinc-100 border-zinc-300 hover:border-zinc-600' : 'bg-zinc-950 border-zinc-700 hover:border-white'
                                }`}
                                title={`Click to view ${m.name || m.type}`}
                              >
                                {m.type === 'photo' ? (
                                  <img src={m.url} alt={m.name || 'Proof'} className="w-8 h-8 object-cover rounded-xs" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center rounded-xs">
                                    <Video className="w-4 h-4 text-rose-400" />
                                  </div>
                                )}
                                <span className="text-[10px] font-mono font-bold max-w-[100px] truncate">{m.name || m.type}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Subtask Inline Note Editor */}
                        {editingSubTaskIdForNote === sub.id ? (
                          <div className={`mt-2 p-2 border rounded-xs ${isLightMode ? 'bg-amber-50 border-amber-400' : 'bg-zinc-950 border-amber-600/60'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[9px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
                                <FileText className="w-2.5 h-2.5" />
                                <span>Sub-Task Observation / Note</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => setEditingSubTaskIdForNote(null)}
                                className="text-zinc-400 hover:text-white"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <textarea
                              value={subTaskNoteDraft}
                              onChange={(e) => setSubTaskNoteDraft(e.target.value)}
                              placeholder="Type observation, temperature reading, or comment..."
                              rows={2}
                              className="w-full bg-black/80 border border-zinc-700 focus:border-white p-1.5 text-xs text-white outline-none placeholder:text-zinc-600"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5 mt-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingSubTaskIdForNote(null)}
                                className="px-2 py-0.5 text-[9px] font-bold uppercase bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveSubTaskNoteInline(sub.id)}
                                className="px-2.5 py-0.5 text-[9px] font-black uppercase bg-white text-black hover:bg-zinc-200 flex items-center gap-1 cursor-pointer"
                              >
                                <Save className="w-2.5 h-2.5" />
                                <span>Save Note</span>
                              </button>
                            </div>
                          </div>
                        ) : sub.notes && sub.notes.trim() ? (
                          <div className={`mt-1 pl-6 flex items-start justify-between gap-2 p-1.5 border text-[11px] rounded-xs ${
                            isLightMode ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-zinc-950/80 border-amber-900/40 text-amber-200'
                          }`}>
                            <div className="flex items-start gap-1 min-w-0">
                              <FileText className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                              <span className="italic truncate">{sub.notes}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleSubTaskNoteEditor(sub)}
                              className="text-[9px] font-bold uppercase text-amber-500 hover:underline cursor-pointer flex-shrink-0"
                            >
                              Edit
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Inline Notes Display & Editor */}
          {isEditingNote ? (
            <div
              className={`mt-2.5 p-2.5 border-2 rounded-xs ${
                isLightMode ? 'bg-amber-50 border-amber-400' : 'bg-zinc-900 border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>Shift Notes & Observations</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsEditingNote(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Type shift notes, fridge readings, or remarks..."
                rows={2}
                className="w-full bg-black/80 border border-zinc-700 focus:border-white p-2 text-xs text-white outline-none placeholder:text-zinc-600"
                autoFocus
              />
              <div className="flex justify-end gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingNote(false)}
                  className="px-2.5 py-1 text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNoteInline}
                  className="px-3 py-1 text-[10px] font-black uppercase bg-white text-black hover:bg-zinc-200 flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3 h-3" />
                  <span>Save Note</span>
                </button>
              </div>
            </div>
          ) : (
            hasNotes && (
              <div
                onClick={() => {
                  setNoteDraft(task.notes || '');
                  setIsEditingNote(true);
                }}
                className={`mt-2.5 p-2 text-xs border rounded-xs cursor-pointer flex items-start gap-1.5 group/note ${
                  isLightMode
                    ? 'bg-amber-50/80 border-amber-300 text-amber-950 hover:bg-amber-100/80'
                    : 'bg-zinc-900/90 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                }`}
                title="Click to edit shift note"
              >
                <FileText className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="flex-1 italic leading-relaxed text-[11px] sm:text-xs">
                  {task.notes}
                </p>
                <Edit2 className="w-3 h-3 text-zinc-400 opacity-0 group-hover/note:opacity-100 transition flex-shrink-0" />
              </div>
            )
          )}

          {/* Attached Media Thumbnails (Photos & Videos) */}
          {hasMedia && (
            <div className="mt-2.5">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                <ImageIcon className="w-3 h-3 text-emerald-400" />
                <span>Verification Media ({task.media!.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {task.media!.map((m, mIdx) => (
                  <button
                    key={m.id ? `task-media-${task.id}-${m.id}-${mIdx}` : `task-media-${task.id}-${mIdx}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewMedia && onViewMedia(m);
                    }}
                    className="relative w-12 h-12 sm:w-14 sm:h-14 border-2 border-zinc-700 hover:border-white transition overflow-hidden bg-black flex-shrink-0 cursor-pointer group/media"
                    title={`View ${m.name || m.type}`}
                  >
                    {m.type === 'video' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900">
                        <Film className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 text-white fill-white" />
                        </div>
                      </div>
                    ) : (
                      <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Task Bottom Control Bar with Assignee, Proof Actions, Edit, and Delete buttons */}
          <div
            className={`mt-3 pt-2 border-t flex flex-wrap items-center justify-between gap-2 ${
              isLightMode ? 'border-zinc-200' : 'border-zinc-800/80'
            }`}
          >
            {/* Assignee Information */}
            <div
              className={`flex items-center gap-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider ${
                isLightMode ? 'text-zinc-800' : 'text-zinc-300'
              }`}
            >
              <User
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5] ${
                  isLightMode ? 'text-zinc-600' : 'text-zinc-400'
                }`}
              />
              <span>
                {assignedStaff ? (
                  <>
                    <strong className={`font-black ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>
                      {assignedStaff.name}
                    </strong>
                    <span
                      className={`opacity-75 text-[10px] ml-1 ${
                        isLightMode ? 'text-zinc-600' : 'text-zinc-400'
                      }`}
                    >
                      ({assignedStaff.designation})
                    </span>
                  </>
                ) : task.assignee ? (
                  task.assignee
                ) : (
                  <span className={`opacity-60 italic ${isLightMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    Unassigned
                  </span>
                )}
              </span>
            </div>

            {/* Quick Actions Bar on every task */}
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
              {/* Only show parent attachment buttons for standalone tasks without subtasks */}
              {!hasSubTasks && (
                <>
                  {/* 📷 Live Camera Quick Action */}
                  <button
                    type="button"
                    id={`live-camera-task-${task.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLiveCameraSubTaskId(null);
                      setIsLiveCameraOpen(true);
                    }}
                    className={`px-2 py-1 text-[10px] font-black uppercase tracking-tight border flex items-center gap-1 cursor-pointer active:scale-95 transition ${
                      isLightMode
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-700'
                    }`}
                    title="Open live camera to snap proof photo"
                  >
                    <Camera className="w-3 h-3 text-emerald-500" />
                    <span>📷 Camera</span>
                  </button>

                  {/* 🎥 Video Quick Action (Strictly Video format) */}
                  <button
                    type="button"
                    id={`add-video-task-${task.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      videoInputRef.current?.click();
                    }}
                    className={`px-2 py-1 text-[10px] font-black uppercase tracking-tight border flex items-center gap-1 cursor-pointer active:scale-95 transition ${
                      isLightMode
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-300'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border-zinc-700'
                    }`}
                    title="Add Video to this task"
                  >
                    <Video className={`w-3 h-3 ${isLightMode ? 'text-red-700' : 'text-red-400'}`} />
                    <span>+ Video</span>
                  </button>

                  {/* 📝 Note Quick Action */}
                  <button
                    type="button"
                    id={`add-note-task-${task.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setNoteDraft(task.notes || '');
                      setIsEditingNote(!isEditingNote);
                    }}
                    className={`px-2 py-1 text-[10px] font-black uppercase tracking-tight border flex items-center gap-1 cursor-pointer active:scale-95 transition ${
                      hasNotes
                        ? isLightMode
                          ? 'bg-amber-100 text-amber-950 border-amber-400 hover:bg-amber-200'
                          : 'bg-zinc-800 text-amber-300 border-amber-500/50 hover:border-amber-400'
                        : isLightMode
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-300'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border-zinc-700'
                    }`}
                    title={hasNotes ? 'Edit Notes' : 'Add Note to this task'}
                  >
                    <FileText className={`w-3 h-3 ${isLightMode ? 'text-amber-700' : 'text-amber-400'}`} />
                    <span>{hasNotes ? 'Notes' : '+ Note'}</span>
                  </button>
                </>
              )}

              {/* Quick Approve / Approved Status for Hemen Das */}
              {isAdmin && onApproveTask && (
                task.approvalStatus === 'approved' ? (
                  <span
                    className="px-2 py-1 text-[10px] font-black uppercase tracking-tight bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 flex items-center gap-1 rounded-xs"
                    title="Task and photo proofs approved by Hemen Das"
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Approved</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    id={`toolbar-approve-task-${task.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onApproveTask(task.id);
                    }}
                    className="px-2.5 py-1 text-[10px] font-black uppercase tracking-tight bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 flex items-center gap-1 cursor-pointer active:scale-95 transition shadow-xs rounded-xs"
                    title="1-Click Approve this task & photo quality"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>✓ Approve</span>
                  </button>
                )
              )}

              {/* Edit Icon Button: Clear, prominent for Admin and Manager */}
              {onEditTask && (
                <button
                  type="button"
                  id={`edit-task-${task.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTask(task);
                  }}
                  className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-tight border flex items-center gap-1 cursor-pointer active:scale-95 transition ${
                    isLightMode
                      ? 'bg-zinc-950 text-white hover:bg-zinc-800 border-zinc-950 shadow-xs'
                      : 'bg-white text-black hover:bg-zinc-200 border-white shadow-xs'
                  }`}
                  title="Edit checklist, time window, or sub-tasks"
                >
                  <Edit2 className="w-3 h-3 stroke-[2.5]" />
                  <span>Edit</span>
                </button>
              )}

              {/* Delete Icon Button: Clear, prominent for Admin and Manager */}
              {isDeleteAllowed && (
                <button
                  type="button"
                  id={`delete-task-${task.id}`}
                  onClick={handleDeleteTaskCard}
                  className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-tight border flex items-center gap-1 cursor-pointer active:scale-95 transition ${
                    isLightMode
                      ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-300'
                      : 'bg-red-950/50 hover:bg-red-900/80 text-red-400 border-red-900/80'
                  } ${confirmDelete ? 'bg-red-600 text-white border-red-600' : ''}`}
                  title={confirmDelete ? 'Click again to confirm delete' : `Delete checklist "${task.title}"`}
                >
                  {confirmDelete ? (
                    <span>Confirm Delete?</span>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3 stroke-[2.5]" />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Direct Live Camera Modal */}
      <LiveCameraModal
        isOpen={isLiveCameraOpen}
        onClose={() => {
          setIsLiveCameraOpen(false);
          setLiveCameraSubTaskId(null);
        }}
        onCapture={handleLiveCameraCapture}
        title={liveCameraSubTaskId ? `Live Camera • Sub-task Proof` : `Live Camera • ${task.title}`}
      />
    </motion.div>
  );
};
