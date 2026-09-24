import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
  ListTodo,
  Plus,
  CheckSquare,
  Square,
  AlertTriangle,
  FolderTree,
  Wifi,
  WifiOff,
  RefreshCw,
  Cloud,
  Check,
} from 'lucide-react';
import { TaskItem } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useTaskQueue } from '../hooks/useTaskQueue';

interface TaskManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  onEditTask: (task: TaskItem) => void;
  onDuplicateTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteChecklist?: (headerName: string) => void;
  onBatchDeleteTasks?: (taskIds: string[]) => void;
  onAddTaskToHeader?: (headerName: string) => void;
}

export const TaskManagementModal: React.FC<TaskManagementModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onEditTask,
  onDuplicateTask,
  onDeleteTask,
  onDeleteChecklist,
  onBatchDeleteTasks,
  onAddTaskToHeader,
}) => {
  const { isLightMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'checklists' | 'tasks'>('checklists');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteHeader, setConfirmDeleteHeader] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState<boolean>(false);
  const { queue, pendingCount, isOnline, isSyncing, triggerSync } = useTaskQueue();
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleTriggerSyncNow = async () => {
    try {
      const res = await triggerSync();
      if (res.processed > 0) {
        setSyncFeedback(`Synced ${res.processed} update${res.processed > 1 ? 's' : ''} to Firestore!`);
        setTimeout(() => setSyncFeedback(null), 3500);
      } else if (res.failed > 0) {
        setSyncFeedback(`Sync paused: network connection unstable.`);
        setTimeout(() => setSyncFeedback(null), 3500);
      }
    } catch (e) {
      console.error('Task management sync error:', e);
    }
  };

  // Group tasks by checklist header
  const checklistGroups = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    tasks.forEach((t) => {
      const header = t.checklistHeader || 'General Operations';
      const existing = map.get(header) || [];
      existing.push(t);
      map.set(header, existing);
    });

    const groups = Array.from(map.entries()).map(([header, groupTasks]) => {
      const completed = groupTasks.filter((t) => t.completed).length;
      const total = groupTasks.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      const department = groupTasks[0]?.department || 'General';
      return {
        header,
        tasks: groupTasks,
        total,
        completed,
        percentage,
        department,
      };
    });

    return groups.sort((a, b) => b.total - a.total);
  }, [tasks]);

  // Filter tasks based on search
  const filteredTasks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return tasks;
    return tasks.filter((t) => {
      return (
        t.title.toLowerCase().includes(q) ||
        (t.department && t.department.toLowerCase().includes(q)) ||
        (t.checklistHeader && t.checklistHeader.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q))
      );
    });
  }, [tasks, searchQuery]);

  // Filter checklist groups based on search
  const filteredChecklistGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return checklistGroups;
    return checklistGroups.filter((g) => {
      return (
        g.header.toLowerCase().includes(q) ||
        g.department.toLowerCase().includes(q) ||
        g.tasks.some((t) => t.title.toLowerCase().includes(q))
      );
    });
  }, [checklistGroups, searchQuery]);

  if (!isOpen) return null;

  // Toggle single task selection
  const handleToggleSelectTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  // Toggle select all filtered tasks
  const handleToggleSelectAll = () => {
    if (selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredTasks.map((t) => t.id));
    }
  };

  // Execute bulk delete
  const handleExecuteBulkDelete = () => {
    if (selectedTaskIds.length === 0) return;
    if (onBatchDeleteTasks) {
      onBatchDeleteTasks(selectedTaskIds);
    } else {
      selectedTaskIds.forEach((id) => onDeleteTask(id));
    }
    setSelectedTaskIds([]);
    setConfirmBulkDelete(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={`relative w-full max-w-5xl h-[90vh] sm:h-[85vh] flex flex-col shadow-2xl border-2 sm:border-4 ${
            isLightMode
              ? 'bg-zinc-50 border-zinc-300'
              : 'bg-[#0B140F] border-[#1D3528]'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className={`p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isLightMode ? 'border-zinc-200 bg-white' : 'border-[#1D3528] bg-black/40'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-emerald-500" />
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                  Checklist & Task Directory
                </h2>
              </div>
              <p
                className={`text-xs font-bold uppercase tracking-widest mt-1 ${
                  isLightMode ? 'text-zinc-500' : 'text-[#7D8F85]'
                }`}
              >
                Manage checklists ({checklistGroups.length}) & active tasks ({tasks.length})
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <Search
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    isLightMode ? 'text-zinc-400' : 'text-zinc-500'
                  }`}
                />
                <input
                  type="text"
                  placeholder="Search checklists or tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm font-bold border-2 transition ${
                    isLightMode
                      ? 'bg-white border-zinc-300 text-black focus:border-black placeholder:text-zinc-400'
                      : 'bg-[#0A120E] border-[#1D3528] text-white focus:border-[#3A5A48] placeholder:text-zinc-600'
                  }`}
                />
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className={`p-2 border-2 transition cursor-pointer flex-shrink-0 ${
                  isLightMode
                    ? 'bg-zinc-200 hover:bg-zinc-300 border-zinc-300 text-black'
                    : 'bg-[#1D3528] hover:bg-[#2A4A38] border-[#2A4A38] text-white'
                }`}
                aria-label="Close modal"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Offline & Local Queue Status Banner */}
          {(!isOnline || pendingCount > 0) && (
            <div
              className={`px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-bold border-b transition ${
                !isOnline
                  ? isLightMode
                    ? 'bg-amber-50 text-amber-950 border-amber-300'
                    : 'bg-amber-950/50 text-amber-200 border-amber-800'
                  : isLightMode
                  ? 'bg-blue-50 text-blue-950 border-blue-200'
                  : 'bg-blue-950/40 text-blue-200 border-blue-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {!isOnline ? (
                  <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                ) : (
                  <Cloud className="w-4 h-4 text-blue-500 flex-shrink-0" />
                )}
                <span>
                  {!isOnline ? (
                    <>
                      <strong>Offline Mode Active:</strong> Any task or checklist modifications are safely stored in your local retry queue ({pendingCount} pending). They will automatically sync to Firestore once connection restores.
                    </>
                  ) : (
                    <>
                      <strong>Local Queue:</strong> {pendingCount} update{pendingCount === 1 ? '' : 's'} stored in local queue ready for Firestore sync.
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-auto flex-shrink-0">
                {syncFeedback && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                    <Check className="w-3.5 h-3.5" />
                    {syncFeedback}
                  </span>
                )}
                {isOnline && pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={handleTriggerSyncNow}
                    disabled={isSyncing}
                    className="px-3 py-1 text-[11px] font-black uppercase tracking-tight bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white flex items-center gap-1.5 cursor-pointer shadow-sm transition border border-blue-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div
            className={`px-4 sm:px-6 pt-3 flex items-center justify-between border-b ${
              isLightMode ? 'bg-zinc-100 border-zinc-200' : 'bg-black/30 border-[#1D3528]'
            }`}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('checklists')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-black uppercase tracking-tight flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                  activeTab === 'checklists'
                    ? isLightMode
                      ? 'border-zinc-950 text-zinc-950 bg-white shadow-sm'
                      : 'border-emerald-400 text-white bg-emerald-950/40'
                    : isLightMode
                    ? 'border-transparent text-zinc-500 hover:text-zinc-900'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Checklists ({checklistGroups.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-black uppercase tracking-tight flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                  activeTab === 'tasks'
                    ? isLightMode
                      ? 'border-zinc-950 text-zinc-950 bg-white shadow-sm'
                      : 'border-emerald-400 text-white bg-emerald-950/40'
                    : isLightMode
                    ? 'border-transparent text-zinc-500 hover:text-zinc-900'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                <ListTodo className="w-4 h-4" />
                <span>All Tasks ({tasks.length})</span>
              </button>
            </div>

            {/* Quick action info */}
            <div className="text-[11px] font-bold text-zinc-500 hidden md:block">
              {activeTab === 'checklists'
                ? 'Delete entire checklists or add tasks to them directly'
                : 'Select tasks for bulk deletion or edit individual tasks'}
            </div>
          </div>

          {/* TAB 1: CHECKLISTS DIRECTORY */}
          {activeTab === 'checklists' && (
            <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
              {filteredChecklistGroups.length === 0 ? (
                <div
                  className={`p-8 text-center text-sm font-bold uppercase tracking-wider border-2 border-dashed ${
                    isLightMode
                      ? 'bg-white border-zinc-300 text-zinc-500'
                      : 'bg-zinc-900/40 border-[#1D3528] text-zinc-400'
                  }`}
                >
                  No checklists found matching "{searchQuery}".
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredChecklistGroups.map((group) => {
                    const isConfirmingDelete = confirmDeleteHeader === group.header;
                    return (
                      <div
                        key={group.header}
                        className={`p-4 border-2 transition flex flex-col justify-between ${
                          isLightMode
                            ? 'bg-white border-zinc-200 hover:border-zinc-400 shadow-sm'
                            : 'bg-[#0E1A14] border-[#1D3528] hover:border-[#2A4A38]'
                        }`}
                      >
                        <div>
                          {/* Header & Meta */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 border tracking-wider ${
                                  isLightMode
                                    ? 'bg-zinc-100 border-zinc-300 text-zinc-700'
                                    : 'bg-black/60 border-[#1D3528] text-emerald-400'
                                }`}
                              >
                                {group.department}
                              </span>
                              <h3 className="text-base sm:text-lg font-black uppercase tracking-tight mt-1.5 line-clamp-1">
                                {group.header}
                              </h3>
                            </div>

                            <span
                              className={`text-xs font-mono font-black px-2 py-1 border ${
                                group.percentage === 100
                                  ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                                  : isLightMode
                                  ? 'bg-zinc-100 text-zinc-800 border-zinc-300'
                                  : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                              }`}
                            >
                              {group.completed}/{group.total} Done ({group.percentage}%)
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div
                            className={`w-full h-1.5 my-3 overflow-hidden ${
                              isLightMode ? 'bg-zinc-100' : 'bg-black'
                            }`}
                          >
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${group.percentage}%` }}
                            />
                          </div>

                          {/* Tasks Preview List */}
                          <div className="space-y-1 my-2 max-h-32 overflow-y-auto pr-1">
                            {group.tasks.map((t) => (
                              <div
                                key={t.id}
                                className={`text-xs flex items-center justify-between gap-2 p-1.5 rounded-sm ${
                                  isLightMode ? 'bg-zinc-50' : 'bg-black/40'
                                }`}
                              >
                                <span
                                  className={`truncate font-semibold ${
                                    t.completed ? 'line-through opacity-60' : ''
                                  }`}
                                  title={t.title}
                                >
                                  {t.title}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-500 flex-shrink-0">
                                  {t.startTime || t.deadline || 'Anytime'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-zinc-200 dark:border-[#1D3528]">
                          {onAddTaskToHeader && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onAddTaskToHeader(group.header);
                              }}
                              className={`text-xs font-black uppercase tracking-tight px-3 py-1.5 border transition flex items-center gap-1 cursor-pointer ${
                                isLightMode
                                  ? 'bg-zinc-950 text-white hover:bg-zinc-800 border-zinc-950'
                                  : 'bg-white text-black hover:bg-zinc-200 border-white'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              <span>+ Add Task</span>
                            </button>
                          )}

                          {onDeleteChecklist && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isConfirmingDelete) {
                                  onDeleteChecklist(group.header);
                                  setConfirmDeleteHeader(null);
                                } else {
                                  setConfirmDeleteHeader(group.header);
                                  setTimeout(() => setConfirmDeleteHeader(null), 4000);
                                }
                              }}
                              className={`text-xs font-black uppercase tracking-tight px-3 py-1.5 border transition flex items-center gap-1.5 cursor-pointer ml-auto ${
                                isConfirmingDelete
                                  ? 'bg-red-600 text-white border-red-600 animate-pulse'
                                  : isLightMode
                                  ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                                  : 'bg-red-950/30 hover:bg-red-900/60 text-red-400 border-red-900/50'
                              }`}
                              title={
                                isConfirmingDelete
                                  ? 'Click to permanently delete this checklist and all its tasks'
                                  : 'Delete entire checklist'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>
                                {isConfirmingDelete
                                  ? `Confirm Delete (${group.total})?`
                                  : 'Delete Checklist'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALL TASKS & BULK DELETE */}
          {activeTab === 'tasks' && (
            <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6">
              {/* Bulk Selection Bar */}
              {selectedTaskIds.length > 0 && (
                <div
                  className={`p-3 mb-3 border-2 flex items-center justify-between gap-3 ${
                    isLightMode
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-amber-950/40 border-amber-800 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-tight">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>
                      {selectedTaskIds.length} task{selectedTaskIds.length > 1 ? 's' : ''} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTaskIds([])}
                      className="px-2.5 py-1 text-xs font-bold uppercase underline cursor-pointer"
                    >
                      Clear Selection
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirmBulkDelete) {
                          handleExecuteBulkDelete();
                        } else {
                          setConfirmBulkDelete(true);
                          setTimeout(() => setConfirmBulkDelete(false), 4000);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-black uppercase tracking-tight border transition flex items-center gap-1.5 cursor-pointer ${
                        confirmBulkDelete
                          ? 'bg-red-600 text-white border-red-600 animate-pulse'
                          : 'bg-red-600 hover:bg-red-700 text-white border-red-700'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>
                        {confirmBulkDelete
                          ? `Confirm Delete (${selectedTaskIds.length})?`
                          : `Delete Selected (${selectedTaskIds.length})`}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Table Container */}
              <div
                className={`flex-1 overflow-auto border-2 ${
                  isLightMode ? 'border-zinc-300' : 'border-[#1D3528]'
                }`}
              >
                <div className="min-w-[850px]">
                  {/* Table Header */}
                  <div
                    className={`grid grid-cols-[40px_1.5fr_2fr_1fr_1.5fr_120px] gap-3 p-3 border-b-2 text-xs font-black uppercase tracking-widest items-center ${
                      isLightMode
                        ? 'bg-zinc-200 border-zinc-300 text-zinc-700'
                        : 'bg-[#111F17] border-[#1D3528] text-[#7D8F85]'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="cursor-pointer"
                        title={
                          selectedTaskIds.length === filteredTasks.length
                            ? 'Deselect All'
                            : 'Select All'
                        }
                      >
                        {selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-500" />
                        )}
                      </button>
                    </div>
                    <div>Checklist / Header</div>
                    <div>Task Title</div>
                    <div>Department</div>
                    <div>Time Window</div>
                    <div className="text-right">Actions</div>
                  </div>

                  {/* Table Body */}
                  <div className="flex flex-col">
                    {filteredTasks.length === 0 ? (
                      <div
                        className={`p-8 text-center text-sm font-bold uppercase tracking-wider ${
                          isLightMode ? 'text-zinc-500' : 'text-zinc-600'
                        }`}
                      >
                        No tasks found matching your search.
                      </div>
                    ) : (
                      filteredTasks.map((task) => {
                        const isSelected = selectedTaskIds.includes(task.id);
                        return (
                          <div
                            key={task.id}
                            className={`grid grid-cols-[40px_1.5fr_2fr_1fr_1.5fr_120px] gap-3 p-3 items-center border-b last:border-b-0 transition ${
                              isSelected
                                ? isLightMode
                                  ? 'bg-amber-50/80 border-amber-200'
                                  : 'bg-amber-950/20 border-amber-900/40'
                                : isLightMode
                                ? 'border-zinc-200 hover:bg-zinc-100'
                                : 'border-[#1D3528]/50 hover:bg-[#111F17]'
                            }`}
                          >
                            {/* Checkbox */}
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleToggleSelectTask(task.id)}
                                className="cursor-pointer"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <Square className="w-4 h-4 text-zinc-500" />
                                )}
                              </button>
                            </div>

                            {/* Checklist Header */}
                            <div className="truncate">
                              <span
                                className={`text-xs font-bold px-2 py-1 border rounded-sm truncate inline-block max-w-full ${
                                  isLightMode
                                    ? 'bg-white border-zinc-300 text-zinc-700'
                                    : 'bg-black/50 border-[#1D3528] text-zinc-300'
                                }`}
                              >
                                {task.checklistHeader || 'General'}
                              </span>
                            </div>

                            {/* Title & Status */}
                            <div className="flex items-center gap-2 min-w-0">
                              {task.completed ? (
                                <CheckCircle2
                                  className={`w-4 h-4 flex-shrink-0 ${
                                    isLightMode ? 'text-emerald-600' : 'text-emerald-400'
                                  }`}
                                />
                              ) : (
                                <div
                                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                                    isLightMode ? 'border-zinc-300' : 'border-zinc-700'
                                  }`}
                                />
                              )}
                              <span
                                className={`text-sm font-bold truncate ${
                                  task.completed
                                    ? isLightMode
                                      ? 'text-zinc-400 line-through'
                                      : 'text-zinc-600 line-through'
                                    : ''
                                }`}
                                title={task.title}
                              >
                                {task.title}
                              </span>
                              {queue.some(
                                (op) =>
                                  ('taskId' in op && op.taskId === task.id) ||
                                  (op.type === 'SAVE_TASK' && op.task.id === task.id)
                              ) && (
                                <span
                                  className="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded-sm bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 flex-shrink-0"
                                  title="Task update is stored in local queue and waiting to sync"
                                >
                                  Sync Pending
                                </span>
                              )}
                            </div>

                            {/* Department */}
                            <div className="truncate text-xs font-bold">
                              {task.department || '-'}
                            </div>

                            {/* Time Window */}
                            <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                              <Clock
                                className={`w-3.5 h-3.5 ${
                                  isLightMode ? 'text-zinc-400' : 'text-zinc-500'
                                }`}
                              />
                              <span className="truncate">
                                {task.startTime
                                  ? `${task.startTime} - ${task.endTime || task.deadline || 'End'}`
                                  : task.deadline || 'Anytime'}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onDuplicateTask(task);
                                }}
                                className={`p-1.5 border transition cursor-pointer flex items-center justify-center ${
                                  isLightMode
                                    ? 'bg-white hover:bg-zinc-200 border-zinc-300 text-zinc-700'
                                    : 'bg-black hover:bg-[#1D3528] border-[#1D3528] text-zinc-300'
                                }`}
                                title="Duplicate Task"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                </svg>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onEditTask(task);
                                }}
                                className={`p-1.5 border transition cursor-pointer flex items-center justify-center ${
                                  isLightMode
                                    ? 'bg-white hover:bg-zinc-200 border-zinc-300 text-zinc-700'
                                    : 'bg-black hover:bg-[#1D3528] border-[#1D3528] text-zinc-300'
                                }`}
                                title="Edit Task"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (confirmDeleteId === task.id) {
                                    onDeleteTask(task.id);
                                    setConfirmDeleteId(null);
                                  } else {
                                    setConfirmDeleteId(task.id);
                                    setTimeout(() => setConfirmDeleteId(null), 3000);
                                  }
                                }}
                                className={`p-1.5 border transition cursor-pointer flex items-center justify-center ${
                                  isLightMode
                                    ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600'
                                    : 'bg-red-950/30 hover:bg-red-900/60 border-red-900/50 text-red-400'
                                }`}
                                title={confirmDeleteId === task.id ? 'Click again to confirm' : 'Delete Task'}
                              >
                                {confirmDeleteId === task.id ? (
                                  <span className="text-[10px] font-black uppercase whitespace-nowrap">
                                    Confirm?
                                  </span>
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
