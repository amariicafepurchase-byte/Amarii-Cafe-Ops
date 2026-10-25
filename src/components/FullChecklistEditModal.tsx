import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Trash2,
  Check,
  Clock,
  Layers,
  Edit2,
  Camera,
  AlertCircle,
  Sparkles,
  Save,
  CheckCircle2,
  HelpCircle,
  Flame,
} from 'lucide-react';
import { TaskItem, TaskPriority, TaskDepartment, HEADER_TIME_SUGGESTIONS } from '../types';
import { DEPARTMENTS } from '../data/staffData';
import { useTheme } from '../context/ThemeContext';
import { useOutlet } from '../context/OutletContext';

export interface EditedTaskRow {
  tempId: string;
  originalId?: string; // set if editing an existing task
  title: string;
  isPhotoMandatory: boolean;
  priority: TaskPriority;
  completed?: boolean;
}

interface FullChecklistEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  headerName: string | null;
  tasks: TaskItem[];
  onSaveFullChecklist: (params: {
    oldHeader: string;
    newHeader: string;
    department: TaskDepartment | string;
    startTime: string;
    endTime: string;
    tasksToUpdate: TaskItem[];
    tasksToCreate: {
      title: string;
      isPhotoMandatory: boolean;
      priority: TaskPriority;
    }[];
    taskIdsToDelete: string[];
  }) => Promise<void> | void;
}

export const FullChecklistEditModal: React.FC<FullChecklistEditModalProps> = ({
  isOpen,
  onClose,
  headerName,
  tasks = [],
  onSaveFullChecklist,
}) => {
  const { isLightMode } = useTheme();
  const { activeOutlet } = useOutlet();

  // Form State
  const [titleHeader, setTitleHeader] = useState<string>('');
  const [department, setDepartment] = useState<TaskDepartment | string>('Kitchen & Food Prep');
  const [startTime, setStartTime] = useState<string>('08:30 AM');
  const [endTime, setEndTime] = useState<string>('10:00 AM');
  const [taskRows, setTaskRows] = useState<EditedTaskRow[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lastRowRef = useRef<HTMLInputElement>(null);

  // Initialize modal data when headerName or isOpen changes
  useEffect(() => {
    if (!isOpen || !headerName) return;

    setTitleHeader(headerName);

    // Find tasks belonging to this checklist header
    const checklistTasks = tasks.filter(
      (t) => (t.checklistHeader || 'General Operations') === headerName
    );

    // Infer department
    const inferredDept =
      checklistTasks[0]?.department ||
      (headerName.includes('Kitchen')
        ? 'Kitchen & Food Prep'
        : headerName.includes('Bar')
        ? 'Barista & Beverage Station'
        : headerName.includes('Housekeeping')
        ? 'Housekeeping'
        : headerName.includes('Service')
        ? 'Service'
        : headerName.includes('Cashier') || headerName.includes('Billing')
        ? 'Cashier & Front of House (FOH)'
        : 'Kitchen & Food Prep');

    setDepartment(inferredDept);

    // Infer shift times
    const suggestion = HEADER_TIME_SUGGESTIONS[headerName];
    if (suggestion) {
      setStartTime(suggestion.start);
      setEndTime(suggestion.end);
    } else if (checklistTasks[0]?.startTime) {
      setStartTime(checklistTasks[0].startTime);
      setEndTime(checklistTasks[0].endTime || checklistTasks[0].deadline || '10:00 AM');
    } else {
      setStartTime('08:30 AM');
      setEndTime('10:00 AM');
    }

    // Map existing tasks into row state
    if (checklistTasks.length > 0) {
      const rows: EditedTaskRow[] = checklistTasks.map((t) => ({
        tempId: t.id,
        originalId: t.id,
        title: t.title || '',
        isPhotoMandatory: Boolean(t.isPhotoMandatory || t.mandatoryMedia === 'photo'),
        priority: t.priority || 'today',
        completed: Boolean(t.completed),
      }));
      setTaskRows(rows);
    } else {
      // Empty checklist template: add 3 default rows
      setTaskRows([
        {
          tempId: `new-${Date.now()}-0`,
          title: '',
          isPhotoMandatory: false,
          priority: 'today',
        },
        {
          tempId: `new-${Date.now()}-1`,
          title: '',
          isPhotoMandatory: false,
          priority: 'today',
        },
      ]);
    }

    setErrorMsg(null);
    setIsSaving(false);
  }, [isOpen, headerName, tasks]);

  if (!isOpen || !headerName) return null;

  // Append new task row at the bottom
  const handleAddNextTask = () => {
    const newRow: EditedTaskRow = {
      tempId: `new-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: '',
      isPhotoMandatory: false,
      priority: 'today',
    };
    setTaskRows((prev) => [...prev, newRow]);

    // Focus newly added input after render
    setTimeout(() => {
      if (lastRowRef.current) {
        lastRowRef.current.focus();
      }
    }, 50);
  };

  // Remove task row by index
  const handleRemoveTaskRow = (index: number) => {
    setTaskRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Update specific task row property
  const handleUpdateTaskRow = (
    index: number,
    field: keyof EditedTaskRow,
    value: any
  ) => {
    setTaskRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  };

  // Execute Save Changes
  const handleSaveChanges = async () => {
    setErrorMsg(null);

    const cleanTitleHeader = titleHeader.trim();
    if (!cleanTitleHeader) {
      setErrorMsg('Please enter a valid checklist title.');
      return;
    }

    // Filter valid non-empty task rows
    const validRows = taskRows.filter((r) => r.title.trim() !== '');
    if (validRows.length === 0) {
      setErrorMsg('Please add at least one task or question to the checklist.');
      return;
    }

    setIsSaving(true);

    try {
      const originalTasks = tasks.filter(
        (t) => (t.checklistHeader || 'General Operations') === headerName
      );
      const originalTaskIds = new Set(originalTasks.map((t) => t.id));

      const keptOriginalIds = new Set(
        validRows.filter((r) => r.originalId).map((r) => r.originalId!)
      );

      // IDs to delete: original tasks that were trashed
      const taskIdsToDelete = Array.from(originalTaskIds).filter(
        (id) => !keptOriginalIds.has(id)
      );

      // Tasks to update: existing tasks with modified properties
      const tasksToUpdate: TaskItem[] = [];
      validRows.forEach((r) => {
        if (r.originalId) {
          const existingTask = originalTasks.find((t) => t.id === r.originalId);
          if (existingTask) {
            tasksToUpdate.push({
              ...existingTask,
              title: r.title.trim(),
              checklistHeader: cleanTitleHeader,
              department: department as TaskDepartment,
              startTime: startTime.trim() || '08:30 AM',
              endTime: endTime.trim() || '10:00 AM',
              deadline: endTime.trim() || '10:00 AM',
              isPhotoMandatory: r.isPhotoMandatory,
              mandatoryMedia: r.isPhotoMandatory ? 'photo' : 'none',
              priority: r.priority,
            });
          }
        }
      });

      // New tasks to create
      const tasksToCreate = validRows
        .filter((r) => !r.originalId)
        .map((r) => ({
          title: r.title.trim(),
          isPhotoMandatory: r.isPhotoMandatory,
          priority: r.priority,
        }));

      let timer: any;
      const timeoutPromise = new Promise((resolve) => {
        timer = setTimeout(() => resolve('TIMED_OUT'), 3000);
      });

      try {
        await Promise.race([
          Promise.resolve(
            onSaveFullChecklist({
              oldHeader: headerName,
              newHeader: cleanTitleHeader,
              department,
              startTime,
              endTime,
              tasksToUpdate,
              tasksToCreate,
              taskIdsToDelete,
            })
          ),
          timeoutPromise,
        ]);
      } finally {
        clearTimeout(timer);
      }

      onClose();
    } catch (err: any) {
      console.error('Failed to save full checklist edits:', err);
      setErrorMsg(err?.message || 'Error saving changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border-2 sm:border-4 rounded-xl overflow-hidden ${
            isLightMode
              ? 'bg-zinc-50 border-zinc-300 text-zinc-950'
              : 'bg-[#0B140F] border-[#1D3528] text-[#F7F4EB]'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Google Form Purple Accent Bar */}
          <div className="h-3 w-full bg-[#673ab7] shrink-0" />

          {/* Modal Header */}
          <div
            className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 shrink-0 ${
              isLightMode ? 'bg-white border-zinc-200' : 'bg-black/50 border-[#1D3528]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#673ab7] text-white rounded-lg shadow-sm">
                <Edit2 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#673ab7] dark:text-purple-400">
                  Full Checklist Editor • (पूरा चेकलिस्ट एडिट करें)
                </div>
                <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight line-clamp-1">
                  Edit Checklist: {headerName}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-lg border-2 transition cursor-pointer shrink-0 ${
                isLightMode
                  ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-black'
                  : 'bg-[#1D3528] hover:bg-[#2A4A38] border-[#2A4A38] text-white'
              }`}
              aria-label="Close checklist editor"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {errorMsg && (
              <div className="p-3.5 bg-red-500/10 border-2 border-red-500 rounded-lg text-red-600 dark:text-red-400 text-xs sm:text-sm font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. TOP SECTION: Title, Department & Shift Timing */}
            <div
              className={`p-4 sm:p-5 border-2 rounded-xl space-y-4 ${
                isLightMode
                  ? 'bg-white border-zinc-200 shadow-xs'
                  : 'bg-[#132219] border-[#1D3528]'
              }`}
            >
              <div className="text-xs font-black uppercase tracking-wider text-[#673ab7] dark:text-purple-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>Checklist Settings & Shift Timing</span>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wide mb-1.5 opacity-80">
                  Checklist Title (चेकलिस्ट का नाम) *
                </label>
                <input
                  type="text"
                  value={titleHeader}
                  onChange={(e) => setTitleHeader(e.target.value)}
                  placeholder="e.g. Kitchen Opening Checklist, Barista Shift Audit..."
                  className={`w-full px-3.5 py-2.5 text-sm sm:text-base font-bold border-2 rounded-lg outline-none transition ${
                    isLightMode
                      ? 'bg-zinc-50 border-zinc-300 text-black focus:border-[#673ab7]'
                      : 'bg-[#0A120E] border-[#1D3528] text-white focus:border-[#7c4dff]'
                  }`}
                />
              </div>

              {/* Department & Times Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Department Dropdown */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wide mb-1 opacity-80">
                    Department / Station
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as TaskDepartment)}
                    className={`w-full px-3 py-2 text-xs font-bold border-2 rounded-lg outline-none transition cursor-pointer ${
                      isLightMode
                        ? 'bg-zinc-50 border-zinc-300 text-black focus:border-[#673ab7]'
                        : 'bg-[#0A120E] border-[#1D3528] text-white focus:border-[#7c4dff]'
                    }`}
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Time */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wide mb-1 opacity-80 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Start Time</span>
                  </label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="e.g. 08:30 AM"
                    className={`w-full px-3 py-2 text-xs font-mono font-bold border-2 rounded-lg outline-none transition ${
                      isLightMode
                        ? 'bg-zinc-50 border-zinc-300 text-black focus:border-[#673ab7]'
                        : 'bg-[#0A120E] border-[#1D3528] text-white focus:border-[#7c4dff]'
                    }`}
                  />
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wide mb-1 opacity-80 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>End Time / Deadline</span>
                  </label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="e.g. 10:00 AM"
                    className={`w-full px-3 py-2 text-xs font-mono font-bold border-2 rounded-lg outline-none transition ${
                      isLightMode
                        ? 'bg-zinc-50 border-zinc-300 text-black focus:border-[#673ab7]'
                        : 'bg-[#0A120E] border-[#1D3528] text-white focus:border-[#7c4dff]'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* 2. QUESTIONS & TASKS LIST SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    <span>Questions & Tasks ({taskRows.length})</span>
                  </h3>
                  <p className="text-[11px] opacity-70">
                    Edit question text, toggle photo proof requirements, or mark urgent tasks.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddNextTask}
                  className="px-3 py-1.5 text-xs font-black uppercase tracking-tight bg-[#673ab7] hover:bg-[#58309e] text-white rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Add Next Task</span>
                </button>
              </div>

              {/* Rows List */}
              <div className="space-y-2.5">
                {taskRows.map((row, idx) => {
                  const isLast = idx === taskRows.length - 1;
                  return (
                    <div
                      key={row.tempId}
                      className={`p-3 border-2 rounded-xl transition flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 ${
                        isLightMode
                          ? 'bg-white border-zinc-200 hover:border-purple-300 shadow-2xs'
                          : 'bg-[#111F17] border-[#1D3528] hover:border-[#3A5A48]'
                      }`}
                    >
                      {/* Left: Row Badge & Task Title Direct Input */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-[#673ab7] dark:text-purple-300 text-xs font-black flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
                          {idx + 1}
                        </span>

                        <input
                          type="text"
                          ref={isLast ? lastRowRef : null}
                          value={row.title}
                          onChange={(e) =>
                            handleUpdateTaskRow(idx, 'title', e.target.value)
                          }
                          placeholder={`Question/Task ${idx + 1} title...`}
                          className={`w-full px-3 py-2 text-xs sm:text-sm font-bold border-2 rounded-lg outline-none transition ${
                            isLightMode
                              ? 'bg-zinc-50 border-zinc-200 text-black focus:border-[#673ab7] focus:bg-white'
                              : 'bg-[#0A120E] border-[#1D3528] text-white focus:border-[#7c4dff] focus:bg-black'
                          }`}
                        />
                      </div>

                      {/* Right: Inline Toggles & Delete Trash Button */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {/* Toggle Photo Proof Required */}
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateTaskRow(
                              idx,
                              'isPhotoMandatory',
                              !row.isPhotoMandatory
                            )
                          }
                          className={`px-2.5 py-1.5 text-[11px] font-black uppercase tracking-tight rounded-lg border-2 transition flex items-center gap-1 cursor-pointer ${
                            row.isPhotoMandatory
                              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                              : isLightMode
                              ? 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:border-zinc-400'
                              : 'bg-[#0A120E] text-zinc-400 border-[#1D3528] hover:text-white'
                          }`}
                          title="Toggle Photo Proof Requirement"
                        >
                          <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>
                            {row.isPhotoMandatory ? 'Photo Required' : 'Photo Proof'}
                          </span>
                        </button>

                        {/* Toggle Urgency */}
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateTaskRow(
                              idx,
                              'priority',
                              row.priority === 'urgent' ? 'today' : 'urgent'
                            )
                          }
                          className={`px-2.5 py-1.5 text-[11px] font-black uppercase tracking-tight rounded-lg border-2 transition flex items-center gap-1 cursor-pointer ${
                            row.priority === 'urgent'
                              ? 'bg-red-600 text-white border-red-600 shadow-xs animate-pulse'
                              : isLightMode
                              ? 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:border-zinc-400'
                              : 'bg-[#0A120E] text-zinc-400 border-[#1D3528] hover:text-white'
                          }`}
                          title="Toggle Urgent Priority"
                        >
                          <Flame className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{row.priority === 'urgent' ? 'Urgent' : 'Normal'}</span>
                        </button>

                        {/* Trash Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveTaskRow(idx)}
                          className={`p-2 rounded-lg border-2 transition cursor-pointer text-zinc-400 hover:text-red-500 ${
                            isLightMode
                              ? 'bg-zinc-100 hover:bg-red-50 border-zinc-300 hover:border-red-300'
                              : 'bg-[#0A120E] hover:bg-red-950/40 border-[#1D3528] hover:border-red-800'
                          }`}
                          title="Remove task row"
                        >
                          <Trash2 className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Add Row Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddNextTask}
                  className={`w-full py-3 border-2 border-dashed rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                    isLightMode
                      ? 'bg-white hover:bg-purple-50/50 border-zinc-300 hover:border-[#673ab7] text-zinc-700 hover:text-[#673ab7]'
                      : 'bg-[#0B140F] hover:bg-[#132219] border-[#1D3528] hover:border-[#7c4dff] text-zinc-300 hover:text-purple-300'
                  }`}
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>[+ Add Next Task]</span>
                </button>
              </div>
            </div>
          </div>

          {/* Modal Footer Bar */}
          <div
            className={`p-4 sm:p-5 border-t flex items-center justify-between gap-3 shrink-0 ${
              isLightMode ? 'bg-white border-zinc-200' : 'bg-black/60 border-[#1D3528]'
            }`}
          >
            <div className="text-xs font-bold opacity-70 hidden sm:block">
              All updates will save instantly to Master Register & Cloud Firestore.
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className={`px-4 py-2.5 text-xs font-black uppercase tracking-tight rounded-xl border-2 transition cursor-pointer ${
                  isLightMode
                    ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800'
                    : 'bg-[#1D3528] hover:bg-[#2A4A38] border-[#2A4A38] text-white'
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-[#673ab7] to-[#7c4dff] hover:from-[#58309e] hover:to-[#651fff] text-white text-xs sm:text-sm font-black uppercase tracking-wide rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 stroke-[2.5]" />
                    <span>[SAVE CHANGES]</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
