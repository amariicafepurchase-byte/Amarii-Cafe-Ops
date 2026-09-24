import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Image as ImageIcon,
  Film,
  Camera,
  Trash2,
  Check,
  Clock,
  Tag,
  FileText,
  Video,
  ShieldAlert,
  ListPlus,
  Layers,
  CheckCircle2,
  CheckSquare,
  Sparkles,
  ArrowUpDown,
  Building2,
  MapPin,
  Edit2,
} from 'lucide-react';
import {
  TaskItem,
  TaskPriority,
  TaskDepartment,
  StaffMember,
  TaskMedia,
  ChecklistHeader,
  CHECKLIST_HEADERS,
  HEADER_TIME_SUGGESTIONS,
  SubTaskItem,
  OUTLETS,
} from '../types';
import { DEPARTMENTS } from '../data/staffData';
import { useOutlet } from '../context/OutletContext';
import { useTheme } from '../context/ThemeContext';
import { LiveCameraModal } from './LiveCameraModal';

interface TaskAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (task: TaskItem) => void;
  onSaveTasks?: (tasks: TaskItem[]) => void;
  staffList: StaffMember[];
  editingTask?: TaskItem | null;
  isDuplicate?: boolean;
  defaultDepartment?: TaskDepartment;
  defaultStaff?: StaffMember | null;
  defaultHeader?: ChecklistHeader | string;
}

// Preset checkpoints for standard cafe checklists with granular proof requirements
const PRESET_CHECKPOINTS: Record<
  string,
  {
    title: string;
    isPhotoMandatory?: boolean;
    isVideoMandatory?: boolean;
    isNoteMandatory?: boolean;
    media?: 'none' | 'photo' | 'video';
  }[]
> = {
  'Kitchen Opening Checklist': [
    { title: 'Check Walk-in & Reach-in Chiller temps (≤ 4°C)', isPhotoMandatory: true, isNoteMandatory: true },
    { title: 'Inspect Deep Freezer temperature (≤ -18°C)', isNoteMandatory: true },
    { title: 'Sanitize stainless steel prep tables & cutting boards' },
    { title: 'Inspect fresh produce & morning mise-en-place line', isPhotoMandatory: true },
  ],
  'Kitchen Closing Checklist': [
    { title: 'Turn off convection ovens, salamanders & deep fryers' },
    { title: 'Turn off primary LPG gas manifold valve', isVideoMandatory: true },
    { title: 'Cover, date-label & store all prepared food in chillers' },
    { title: 'Scrub line floor drains & empty oil filter grease traps', isPhotoMandatory: true },
  ],
  'Bar Opening Checklist': [
    { title: 'Purge espresso group heads & steam wands with boiling water' },
    { title: 'Calibrate coffee grinder & dial in 36g espresso extraction yield', isVideoMandatory: true },
    { title: 'Restock dairy, plant milks & beverage syrups in under-counter chiller', isPhotoMandatory: true },
    { title: 'Verify ice maker bin purity and clean ice scoops' },
  ],
  'Bar Closing Checklist': [
    { title: 'Perform 5x chemical backflush cycle with espresso machine cleaner' },
    { title: 'Soak steam wands & portafilters in hot sanitizing solution' },
    { title: 'Lock liquor rails and premium syrup inventory cabinet', isPhotoMandatory: true },
    { title: 'Log total discarded dairy milk and opened purees in notes', isNoteMandatory: true },
  ],
  'Cashier Opening/Closing': [
    { title: 'Power on PineLabs POS & test bank settlement connectivity' },
    { title: 'Count physical opening register float (Rs. 10,000)', isPhotoMandatory: true, isNoteMandatory: true },
    { title: 'Verify thermal receipt printer paper and backup rolls' },
    { title: 'Run day-end POS Z-Report & deposit verified cash in safe', isPhotoMandatory: true, isNoteMandatory: true },
  ],
  'Service Opening/Closing': [
    { title: 'Align all indoor and patio tables and clean chair cushions' },
    { title: 'Set air conditioner to 22°C & configure background ambience music' },
    { title: 'Inspect cutlery caddies, water carafes & QR code menu stands' },
    { title: 'Conduct full floor walkthrough verifying pristine readiness', isVideoMandatory: true },
  ],
  'Housekeeping Opening/Closing': [
    { title: 'Deep clean and disinfect customer restrooms & washroom fixtures' },
    { title: 'Restock scented liquid hand soaps, paper towels & tissues' },
    { title: 'Mop main cafe floor with antiseptic solution and dry thoroughly', isPhotoMandatory: true },
    { title: 'Empty all outdoor and kitchen disposal bins into dumpster' },
  ],
};

export const TaskAssignModal: React.FC<TaskAssignModalProps> = ({
  isOpen,
  onClose,
  onSaveTask,
  onSaveTasks,
  staffList = [],
  editingTask, isDuplicate,
  defaultDepartment = 'Kitchen & Food Prep',
  defaultStaff = null,
  defaultHeader,
}) => {
  const { activeOutlet, availableOutlets } = useOutlet();
  const { isLightMode } = useTheme();

  // Live Camera state
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState<boolean>(false);

  const handleLiveCameraCapture = (media: TaskMedia) => {
    setMediaList((prev) => [...prev, media]);
    setIsLiveCameraOpen(false);
  };

  // Checklist Header & Timeline
  const [checklistHeader, setChecklistHeader] = useState<ChecklistHeader | string>(
    defaultHeader || 'Kitchen Opening Checklist'
  );
  const [isCustomChecklistHeader, setIsCustomChecklistHeader] = useState<boolean>(
    Boolean(defaultHeader && !CHECKLIST_HEADERS.includes(defaultHeader as ChecklistHeader))
  );
  const [taskOutlet, setTaskOutlet] = useState<string>(activeOutlet);
  const [startTime, setStartTime] = useState<string>('09:00 AM');
  const [endTime, setEndTime] = useState<string>('10:30 AM');

  // Core Task Info
  const [title, setTitle] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [department, setDepartment] = useState<TaskDepartment | string>(defaultDepartment);
  const [priority, setPriority] = useState<TaskPriority>('today');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [deadline, setDeadline] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [mediaList, setMediaList] = useState<TaskMedia[]>([]);
  const [, setIsUploading] = useState<boolean>(false);

  // Task-level mandatory proof settings
  const [taskPhotoMandatory, setTaskPhotoMandatory] = useState<boolean>(false);
  const [taskVideoMandatory, setTaskVideoMandatory] = useState<boolean>(false);
  const [taskNoteMandatory, setTaskNoteMandatory] = useState<boolean>(false);

  // Sub-tasks state (Nested Checklists)
  const [subTasks, setSubTasks] = useState<SubTaskItem[]>([]);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState<string>('');
  const [newSubPhoto, setNewSubPhoto] = useState<boolean>(false);
  const [newSubVideo, setNewSubVideo] = useState<boolean>(false);
  const [newSubNote, setNewSubNote] = useState<boolean>(false);

  // Sub-task inline editing state
  const [editingSubTaskId, setEditingSubTaskId] = useState<string | null>(null);
  const [editSubTitle, setEditSubTitle] = useState<string>('');
  const [editSubPhoto, setEditSubPhoto] = useState<boolean>(false);
  const [editSubVideo, setEditSubVideo] = useState<boolean>(false);
  const [editSubNote, setEditSubNote] = useState<boolean>(false);

  // Bulk add staged tasks list
  const [stagedTasks, setStagedTasks] = useState<TaskItem[]>([]);
  const [batchToast, setBatchToast] = useState<string | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const subTaskInputRef = useRef<HTMLInputElement>(null);

  const safeStaffList = Array.isArray(staffList) ? staffList : [];

  // Initialize form when opened or editingTask changes
  useEffect(() => {
    if (editingTask) {
      setTaskOutlet(editingTask.outlet || activeOutlet);
      const curH = editingTask.checklistHeader || 'Kitchen Opening Checklist';
      setChecklistHeader(curH);
      setIsCustomChecklistHeader(!CHECKLIST_HEADERS.includes(curH as ChecklistHeader));
      setStartTime(editingTask.startTime || '09:00 AM');
      setEndTime(editingTask.endTime || editingTask.deadline || '10:30 AM');
      setTitle(editingTask.title || '');
      setDetails(editingTask.details || '');
      setDepartment(editingTask.department || 'Kitchen & Food Prep');
      setPriority(editingTask.priority || 'today');
      setAssigneeId(editingTask.assigneeId || '');
      setDeadline(editingTask.deadline || editingTask.endTime || '10:30 AM');
      setNotes(editingTask.notes || '');
      setMediaList(editingTask.media || []);
      setTaskPhotoMandatory(Boolean(editingTask.isPhotoMandatory || editingTask.mandatoryMedia === 'photo'));
      setTaskVideoMandatory(Boolean(editingTask.isVideoMandatory || editingTask.mandatoryMedia === 'video'));
      setTaskNoteMandatory(Boolean(editingTask.isNoteMandatory));
      setSubTasks(editingTask.subTasks ? [...editingTask.subTasks] : []);
      setEditingSubTaskId(null);
      setStagedTasks([]);
    } else {
      setTaskOutlet(activeOutlet);
      const initialH = defaultHeader || 'Kitchen Opening Checklist';
      setChecklistHeader(initialH);
      const times = HEADER_TIME_SUGGESTIONS[initialH] || { start: '09:00 AM', end: '10:30 AM' };
      setStartTime(times.start);
      setEndTime(times.end);
      setTitle('');
      setDetails('');
      setDepartment(defaultStaff ? defaultStaff.department : defaultDepartment);
      setPriority('today');
      setAssigneeId(defaultStaff ? defaultStaff.id : '');
      setDeadline('10:30 AM');
      setNotes('');
      setMediaList([]);
      setTaskPhotoMandatory(false);
      setTaskVideoMandatory(false);
      setTaskNoteMandatory(false);
      setSubTasks([]);
      setNewSubTaskTitle('');
      setNewSubPhoto(false);
      setNewSubVideo(false);
      setNewSubNote(false);
      setEditingSubTaskId(null);
      setStagedTasks([]);
    }
  }, [editingTask, isDuplicate, defaultDepartment, defaultStaff, isOpen, activeOutlet]);

  if (!isOpen) return null;

  // Filter staff by selected department (only ACTIVE staff eligible for new assignments)
  const deptStaff = safeStaffList.filter(
    (s) => s?.department === department && s?.isActive !== false && s?.active !== false
  );

  // When checklistHeader changes, auto-suggest relevant department and times if user hasn't typed custom title yet
  const handleSelectChecklistHeader = (header: ChecklistHeader | string) => {
    setChecklistHeader(header);
    if ((!editingTask || isDuplicate) && !title) {
      if (header.includes('Kitchen Opening')) {
        setDepartment('Kitchen & Food Prep');
        setStartTime('08:30 AM');
        setEndTime('10:00 AM');
        setDeadline('10:00 AM');
      } else if (header.includes('Kitchen Closing')) {
        setDepartment('Kitchen & Food Prep');
        setStartTime('10:30 PM');
        setEndTime('11:30 PM');
        setDeadline('11:30 PM');
      } else if (header.includes('Bar Opening')) {
        setDepartment('Barista & Beverage Station');
        setStartTime('09:00 AM');
        setEndTime('10:15 AM');
        setDeadline('10:15 AM');
      } else if (header.includes('Bar Closing')) {
        setDepartment('Barista & Beverage Station');
        setStartTime('10:45 PM');
        setEndTime('11:45 PM');
        setDeadline('11:45 PM');
      } else if (header.includes('Cashier')) {
        setDepartment('Cashier & Front of House (FOH)');
        setStartTime('09:00 AM');
        setEndTime('10:15 AM');
        setDeadline('10:15 AM');
      } else if (header.includes('Service')) {
        setDepartment('Service');
        setStartTime('10:00 AM');
        setEndTime('11:00 AM');
        setDeadline('11:00 AM');
      } else if (header.includes('Housekeeping')) {
        setDepartment('Housekeeping');
        setStartTime('09:00 AM');
        setEndTime('10:30 AM');
        setDeadline('10:30 AM');
      }
    }
  };

  // Quick load standard sub-task checkpoints for the selected header
  const handleLoadPresetCheckpoints = () => {
    const presets = PRESET_CHECKPOINTS[checklistHeader];
    if (!presets || presets.length === 0) return;

    const newItems: SubTaskItem[] = presets.map((p, idx) => ({
      id: `sub-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      title: p.title,
      isDone: false,
      isPhotoMandatory: Boolean(p.isPhotoMandatory || p.media === 'photo'),
      isVideoMandatory: Boolean(p.isVideoMandatory || p.media === 'video'),
      isNoteMandatory: Boolean(p.isNoteMandatory),
      mandatoryMedia: p.isPhotoMandatory || p.media === 'photo' ? 'photo' : p.isVideoMandatory || p.media === 'video' ? 'video' : 'none',
    }));

    setSubTasks((prev) => [...prev, ...newItems]);
  };

  // Add individual sub-task
  const handleAddSubTask = () => {
    if (!newSubTaskTitle.trim()) return;

    const newSub: SubTaskItem = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newSubTaskTitle.trim(),
      isDone: false,
      isPhotoMandatory: newSubPhoto,
      isVideoMandatory: newSubVideo,
      isNoteMandatory: newSubNote,
      mandatoryMedia: newSubPhoto ? 'photo' : newSubVideo ? 'video' : 'none',
    };

    setSubTasks((prev) => [...prev, newSub]);
    setNewSubTaskTitle('');
    setNewSubPhoto(false);
    setNewSubVideo(false);
    setNewSubNote(false);
    subTaskInputRef.current?.focus();
  };

  const handleStartEditSubTask = (sub: SubTaskItem) => {
    setEditingSubTaskId(sub.id);
    setEditSubTitle(sub.title);
    setEditSubPhoto(Boolean(sub.isPhotoMandatory || sub.mandatoryMedia === 'photo'));
    setEditSubVideo(Boolean(sub.isVideoMandatory || sub.mandatoryMedia === 'video'));
    setEditSubNote(Boolean(sub.isNoteMandatory));
  };

  const handleSaveEditSubTask = (id: string) => {
    if (!editSubTitle.trim()) return;

    setSubTasks((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              title: editSubTitle.trim(),
              isPhotoMandatory: editSubPhoto,
              isVideoMandatory: editSubVideo,
              isNoteMandatory: editSubNote,
              mandatoryMedia: editSubPhoto ? 'photo' : editSubVideo ? 'video' : 'none',
            }
          : s
      )
    );
    setEditingSubTaskId(null);
  };

  const handleCancelEditSubTask = () => {
    setEditingSubTaskId(null);
  };

  const handleRemoveSubTask = (id: string) => {
    setSubTasks((prev) => prev.filter((s) => s.id !== id));
    if (editingSubTaskId === id) {
      setEditingSubTaskId(null);
    }
  };

  // Strictly Handle Video Uploads (No photo/file upload from gallery allowed)
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    Array.from(files).forEach((file: File) => {
      const isVideo = file.type.startsWith('video') || /\.(mp4|mov|webm|avi|mkv|m4v|3gp)$/i.test(file.name);

      if (!isVideo) {
        alert('Only video format uploads are supported. Photos must be taken live via Camera.');
        setIsUploading(false);
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        alert(`Video ${file.name} is larger than 50MB. Please select a smaller video.`);
        setIsUploading(false);
        return;
      }

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

        setMediaList((prev) => [...prev, newMedia]);
        setIsUploading(false);
      };

      reader.onerror = () => {
        console.error('Error reading video file');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    });

    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleRemoveMedia = (mediaId: string) => {
    setMediaList((prev) => prev.filter((m) => m.id !== mediaId));
  };

  // Add current task to staged bulk list
  const handleAddAnotherTask = () => {
    if (!title.trim()) {
      alert('Please enter a Task Title before adding to the batch list.');
      titleInputRef.current?.focus();
      return;
    }

    const assignedMember = safeStaffList.find((s) => s.id === assigneeId);

    const newTask: TaskItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: title.trim(),
      checklistHeader,
      startTime: startTime.trim() || '09:00 AM',
      endTime: endTime.trim() || deadline.trim() || '10:30 AM',
      department,
      priority,
      completed: false,
      ...(details.trim() ? { details: details.trim() } : {}),
      deadline: endTime.trim() || deadline.trim() || '10:30 AM',
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(mediaList.length > 0 ? { media: mediaList } : {}),
      subTasks: subTasks.length > 0 ? subTasks : [],
      ...(assignedMember
        ? {
            assigneeId: assignedMember.id,
            assignee: `${assignedMember.name} (${assignedMember.designation})`,
            assigneeDesignation: assignedMember.designation,
            assigneeRoleType: assignedMember.roleType,
          }
        : {}),
      isPhotoMandatory: taskPhotoMandatory,
      isVideoMandatory: taskVideoMandatory,
      isNoteMandatory: taskNoteMandatory,
      mandatoryMedia: taskPhotoMandatory ? 'photo' : taskVideoMandatory ? 'video' : 'none',
      outlet: taskOutlet || activeOutlet,
    };

    setStagedTasks((prev) => [...prev, newTask]);
    setBatchToast(`Task "${title.trim()}" added to batch! Enter next task below.`);

    setTimeout(() => {
      setBatchToast(null);
    }, 4000);

    // Reset title, details, notes, media, and subtasks for next task entry
    setTitle('');
    setDetails('');
    setNotes('');
    setMediaList([]);
    setTaskPhotoMandatory(false);
    setTaskVideoMandatory(false);
    setTaskNoteMandatory(false);
    setSubTasks([]);
    setNewSubTaskTitle('');
    setNewSubPhoto(false);
    setNewSubVideo(false);
    setNewSubNote(false);
    titleInputRef.current?.focus();
  };

  const handleRemoveStagedTask = (taskId: string) => {
    setStagedTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // If editing existing task, update and save immediately
    if (editingTask && !isDuplicate) {
      if (!title.trim()) {
        alert('Task title cannot be empty.');
        return;
      }

      const assignedMember = safeStaffList.find((s) => s.id === assigneeId);

      const taskData: TaskItem = {
        ...editingTask,
        title: title.trim(),
        checklistHeader,
        startTime: startTime.trim() || '09:00 AM',
        endTime: endTime.trim() || deadline.trim() || '10:30 AM',
        department,
        priority,
        deadline: endTime.trim() || deadline.trim() || '10:30 AM',
        details: details.trim(),
        notes: notes.trim(),
        media: mediaList,
        subTasks: subTasks.length > 0 ? subTasks : [],
        ...(assignedMember
          ? {
              assigneeId: assignedMember.id,
              assignee: `${assignedMember.name} (${assignedMember.designation})`,
              assigneeDesignation: assignedMember.designation,
              assigneeRoleType: assignedMember.roleType,
            }
          : {}),
        isPhotoMandatory: taskPhotoMandatory,
        isVideoMandatory: taskVideoMandatory,
        isNoteMandatory: taskNoteMandatory,
        mandatoryMedia: taskPhotoMandatory ? 'photo' : taskVideoMandatory ? 'video' : 'none',
        outlet: taskOutlet || activeOutlet,
      };

      onSaveTask(taskData);
      onClose();
      return;
    }

    // Bulk creation flow: combine already staged tasks + currently entered task if title is present
    const finalTasks: TaskItem[] = [...stagedTasks];
    if (title.trim()) {
      const assignedMember = safeStaffList.find((s) => s.id === assigneeId);
      const currentTask: TaskItem = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: title.trim(),
        checklistHeader,
        startTime: startTime.trim() || '09:00 AM',
        endTime: endTime.trim() || deadline.trim() || '10:30 AM',
        department,
        priority,
        completed: false,
        deadline: endTime.trim() || deadline.trim() || '10:30 AM',
        ...(details.trim() ? { details: details.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(mediaList.length > 0 ? { media: mediaList } : {}),
        subTasks: subTasks.length > 0 ? subTasks : [],
        ...(assignedMember
          ? {
              assigneeId: assignedMember.id,
              assignee: `${assignedMember.name} (${assignedMember.designation})`,
              assigneeDesignation: assignedMember.designation,
              assigneeRoleType: assignedMember.roleType,
            }
          : {}),
        isPhotoMandatory: taskPhotoMandatory,
        isVideoMandatory: taskVideoMandatory,
        isNoteMandatory: taskNoteMandatory,
        mandatoryMedia: taskPhotoMandatory ? 'photo' : taskVideoMandatory ? 'video' : 'none',
        outlet: taskOutlet || activeOutlet,
      };
      finalTasks.push(currentTask);
    }

    if (finalTasks.length === 0) {
      alert('Please enter a task title before submitting.');
      titleInputRef.current?.focus();
      return;
    }

    if (onSaveTasks) {
      onSaveTasks(finalTasks);
    } else {
      finalTasks.forEach((t) => onSaveTask(t));
    }

    setStagedTasks([]);
    onClose();
  };

  const totalTasksToSubmit = stagedTasks.length + (title.trim() ? 1 : 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add Daily Checklist Task"
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden"
    >
      <div className={`relative max-w-2xl w-full ${
        isLightMode ? 'bg-white border-zinc-950 text-zinc-900 shadow-2xl' : 'bg-zinc-950 border-white text-white shadow-2xl'
      } border-t-4 sm:border-4 flex flex-col max-h-[94vh] sm:max-h-[92vh] overflow-hidden rounded-t-2xl sm:rounded-none`}>
        {/* Mobile Drag Indicator */}
        <div className={`w-12 h-1 ${isLightMode ? 'bg-zinc-300' : 'bg-zinc-700'} rounded-full mx-auto mt-2.5 sm:hidden`} />

        {/* Header */}
        <div className={`p-4 sm:p-5 ${
          isLightMode ? 'bg-zinc-100 border-zinc-950 text-zinc-950' : 'bg-zinc-900 border-white text-white'
        } border-b-2 sm:border-b-4 flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 font-black ${isLightMode ? 'bg-zinc-950 text-white' : 'bg-white text-black'}`}>
              {editingTask && !isDuplicate ? <Tag className="w-5 h-5 stroke-[2.5]" /> : <ListPlus className="w-5 h-5 stroke-[2.5]" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-lg sm:text-2xl font-black uppercase tracking-tight leading-tight ${
                  isLightMode ? 'text-zinc-950' : 'text-white'
                }`}>
                  {editingTask && !isDuplicate ? 'EDIT CHECKLIST TASK' : isDuplicate ? 'DUPLICATE CHECKLIST TASK' : 'CREATE CHECKLIST TASK'}
                </h2>
                {(!editingTask || isDuplicate) && stagedTasks.length > 0 && (
                  <span className="px-2 py-0.5 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider rounded-xs">
                    {stagedTasks.length} IN BATCH
                  </span>
                )}
              </div>
              <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                isLightMode ? 'text-zinc-600' : 'text-zinc-400'
              }`}>
                Grouped Checklists • Timeline Windows • Nested Sub-Tasks
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 ${
              isLightMode
                ? 'bg-zinc-200 hover:bg-zinc-950 hover:text-white text-zinc-900 border-zinc-300'
                : 'bg-zinc-800 hover:bg-white hover:text-black text-white border-zinc-700'
            } transition border cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center`}
            aria-label="Close modal"
          >
            <X className="w-5 h-5 stroke-[3]" />
          </button>
        </div>

        {/* Transient Batch Toast Notification */}
        {batchToast && (
          <div className="bg-emerald-500 text-black px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center justify-between animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 stroke-[3]" />
              <span>{batchToast}</span>
            </div>
            <span className="text-[10px] opacity-80">Ready to submit or add more</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 ${
          isLightMode ? 'bg-zinc-50' : 'bg-zinc-950'
        } modal-scroll-area`}>
          {/* Staged Tasks Queue (Bulk List) */}
          {(!editingTask || isDuplicate) && stagedTasks.length > 0 && (
            <div className={`${
              isLightMode ? 'bg-emerald-50 border-2 border-emerald-500 text-zinc-900' : 'bg-zinc-900 border-2 border-emerald-500/70 text-white'
            } p-3 sm:p-4 rounded-sm space-y-2.5 animate-in fade-in duration-200`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className={`w-4 h-4 ${isLightMode ? 'text-emerald-700' : 'text-emerald-400'}`} />
                  <span className={`text-xs font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>
                    Queued Checklists for Bulk Submission ({stagedTasks.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStagedTasks([])}
                  className={`text-[10px] underline uppercase tracking-wider cursor-pointer font-bold ${
                    isLightMode ? 'text-zinc-600 hover:text-red-600' : 'text-zinc-400 hover:text-red-400'
                  }`}
                >
                  Clear Queue
                </button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {stagedTasks.map((st, idx) => (
                  <div
                    key={st.id}
                    className={`p-2 border flex items-center justify-between text-xs gap-2 rounded-xs ${
                      isLightMode ? 'bg-white border-zinc-300 text-zinc-950 shadow-xs' : 'bg-black border-zinc-800 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-[10px] text-zinc-500 w-4">#{idx + 1}</span>
                      <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase flex-shrink-0 ${
                        isLightMode ? 'bg-zinc-200 text-zinc-800' : 'bg-zinc-800 text-zinc-300'
                      }`}>
                        {st.checklistHeader || st.department}
                      </span>
                      <span className="font-bold truncate">{st.title}</span>
                      {st.subTasks && st.subTasks.length > 0 && (
                        <span className={`text-[9px] px-1.5 py-0.5 border flex-shrink-0 ${
                          isLightMode ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-blue-950 text-blue-300 border-blue-800'
                        }`}>
                          {st.subTasks.length} sub-tasks
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveStagedTask(st.id)}
                      className="p-1 hover:text-red-500 text-zinc-400 transition cursor-pointer"
                      title="Remove from batch"
                      aria-label="Remove task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Target Branch / Outlet Selection */}
          <div className={`border-2 p-3 sm:p-4 rounded-sm space-y-2 ${
            isLightMode ? 'bg-white border-zinc-300 shadow-xs' : 'bg-zinc-900/90 border-zinc-800'
          }`}>
            <div className="flex items-center justify-between">
              <label className={`block text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                isLightMode ? 'text-zinc-950' : 'text-white'
              }`}>
                <Building2 className="w-4 h-4 text-[#E05A47] stroke-[2.5]" />
                <span>Target Branch / Outlet Location *</span>
              </label>
              <span className={`text-[10px] font-mono font-bold uppercase ${
                isLightMode ? 'text-amber-700' : 'text-amber-400'
              }`}>
                Multi-Branch Routing
              </span>
            </div>
            <select
              value={taskOutlet}
              onChange={(e) => setTaskOutlet(e.target.value)}
              className={`w-full border-2 p-2.5 text-xs sm:text-sm font-black uppercase tracking-tight outline-none cursor-pointer ${
                isLightMode
                  ? 'bg-white border-zinc-300 focus:border-zinc-950 text-zinc-950'
                  : 'bg-black border-zinc-700 focus:border-amber-400 text-white'
              }`}
            >
              {availableOutlets.map((o) => (
                <option key={o} value={o} className={isLightMode ? 'bg-white text-zinc-950 py-1' : 'bg-zinc-900 text-white py-1'}>
                  📍 {o}
                </option>
              ))}
            </select>
          </div>

          {/* 1. Checklist Header (Dropdown or Custom) */}
          <div className={`border-2 p-3 sm:p-4 rounded-sm space-y-2 ${
            isLightMode ? 'bg-white border-zinc-300 shadow-xs' : 'bg-zinc-900/90 border-zinc-800'
          }`}>
            <div className="flex items-center justify-between">
              <label className={`block text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                isLightMode ? 'text-zinc-950' : 'text-white'
              }`}>
                <Layers className={`w-4 h-4 stroke-[2.5] ${isLightMode ? 'text-emerald-700' : 'text-emerald-400'}`} />
                <span>1. Checklist Group / Header *</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCustomChecklistHeader(!isCustomChecklistHeader);
                  if (!isCustomChecklistHeader && CHECKLIST_HEADERS.includes(checklistHeader as ChecklistHeader)) {
                    setChecklistHeader('');
                  } else if (isCustomChecklistHeader && !checklistHeader) {
                    setChecklistHeader('Kitchen Opening Checklist');
                  }
                }}
                className={`text-[10px] font-black uppercase tracking-wider underline cursor-pointer ${
                  isLightMode ? 'text-emerald-700 hover:text-emerald-800' : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                {isCustomChecklistHeader ? '← Pick Preset Template' : '+ Custom Checklist Name'}
              </button>
            </div>

            {isCustomChecklistHeader ? (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={checklistHeader}
                  onChange={(e) => setChecklistHeader(e.target.value)}
                  placeholder="e.g. Evening Deep Clean, Sunday Brunch Setup..."
                  className={`w-full border-2 p-2.5 text-xs sm:text-sm font-black uppercase tracking-tight outline-none ${
                    isLightMode
                      ? 'bg-white border-emerald-600 focus:border-zinc-950 text-zinc-950 placeholder:text-zinc-400'
                      : 'bg-black border-emerald-500 focus:border-white text-white placeholder:text-zinc-500'
                  }`}
                  autoFocus
                />
                <p className={`text-[10px] font-bold ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  Type your custom checklist name. It will create a new group on the board.
                </p>
              </div>
            ) : (
              <select
                value={checklistHeader}
                onChange={(e) => handleSelectChecklistHeader(e.target.value)}
                className={`w-full border-2 p-2.5 text-xs sm:text-sm font-black uppercase tracking-tight outline-none cursor-pointer ${
                  isLightMode
                    ? 'bg-white border-zinc-300 focus:border-zinc-950 text-zinc-950'
                    : 'bg-black border-zinc-700 focus:border-white text-white'
                }`}
              >
                {CHECKLIST_HEADERS.map((h) => (
                  <option key={h} value={h} className={isLightMode ? 'bg-white text-zinc-950 py-1' : 'bg-zinc-900 text-white py-1'}>
                    {h}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Timeline Window (Start Time & End Time / Deadline) */}
          <div className={`border-2 p-3 sm:p-4 rounded-sm space-y-2 ${
            isLightMode ? 'bg-white border-zinc-300 shadow-xs' : 'bg-zinc-900/90 border-zinc-800'
          }`}>
            <div className="flex items-center justify-between">
              <label className={`block text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                isLightMode ? 'text-zinc-950' : 'text-white'
              }`}>
                <Clock className={`w-4 h-4 stroke-[2.5] ${isLightMode ? 'text-amber-600' : 'text-amber-400'}`} />
                <span>2. Timeline Window (Restrict When Checklist Can Be Filled) *</span>
              </label>
              <span className={`text-[10px] font-mono font-bold ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                {startTime} → {endTime}
              </span>
            </div>
            <p className={`text-[11px] ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
              Specify active operation hours. Tasks show active or closed status based on this window.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className={`block text-[10px] font-black uppercase tracking-wider mb-1 ${
                  isLightMode ? 'text-zinc-700' : 'text-zinc-400'
                }`}>
                  Start Time (Active From)
                </label>
                <div className={`flex items-center gap-1.5 border p-2 ${
                  isLightMode ? 'bg-zinc-50 border-zinc-300 focus-within:border-zinc-950' : 'bg-black border-zinc-700 focus-within:border-white'
                }`}>
                  <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`} />
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="e.g. 09:00 AM"
                    className={`w-full bg-transparent text-xs font-bold outline-none uppercase ${
                      isLightMode ? 'text-zinc-950' : 'text-white'
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-black uppercase tracking-wider mb-1 ${
                  isLightMode ? 'text-zinc-700' : 'text-zinc-400'
                }`}>
                  End Time / Deadline (Restricts Completion)
                </label>
                <div className={`flex items-center gap-1.5 border p-2 ${
                  isLightMode ? 'bg-zinc-50 border-zinc-300 focus-within:border-zinc-950' : 'bg-black border-zinc-700 focus-within:border-white'
                }`}>
                  <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${isLightMode ? 'text-amber-600' : 'text-amber-400'}`} />
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setDeadline(e.target.value);
                    }}
                    placeholder="e.g. 10:30 AM"
                    className={`w-full bg-transparent text-xs font-bold outline-none uppercase ${
                      isLightMode ? 'text-zinc-950' : 'text-white'
                    }`}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Quick Timeline Preset Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: 'Morning (08:30 - 10:30 AM)', start: '08:30 AM', end: '10:30 AM' },
                { label: 'Mid-Day (11:30 AM - 02:30 PM)', start: '11:30 AM', end: '02:30 PM' },
                { label: 'Evening (04:00 - 06:30 PM)', start: '04:00 PM', end: '06:30 PM' },
                { label: 'Night (10:30 - 11:45 PM)', start: '10:30 PM', end: '11:45 PM' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setStartTime(preset.start);
                    setEndTime(preset.end);
                    setDeadline(preset.end);
                  }}
                  className={`px-2 py-1 text-[9px] font-black uppercase tracking-tight border transition cursor-pointer ${
                    isLightMode
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Task Title & Instructions */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`block text-xs font-black uppercase tracking-wider ${
                  isLightMode ? 'text-zinc-900' : 'text-zinc-300'
                }`}>
                  3. Parent Checklist Title *
                </label>
                {(!editingTask || isDuplicate) && (
                  <span className={`text-[10px] font-bold uppercase ${
                    isLightMode ? 'text-zinc-500' : 'text-zinc-400'
                  }`}>
                    Single or Batch Checklist
                  </span>
                )}
              </div>
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Espresso Machine Calibration & Dial-in"
                className={`w-full border-2 p-2.5 text-sm font-bold outline-none ${
                  isLightMode
                    ? 'bg-white border-zinc-300 focus:border-zinc-950 text-zinc-950 placeholder:text-zinc-400'
                    : 'bg-zinc-900 border-zinc-700 focus:border-white text-white placeholder:text-zinc-600'
                }`}
                required={stagedTasks.length === 0}
              />
            </div>

            <div>
              <label className={`block text-xs font-black uppercase tracking-wider mb-1 ${
                isLightMode ? 'text-zinc-900' : 'text-zinc-300'
              }`}>
                Operational Instructions / SOP Details
              </label>
              <input
                type="text"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="e.g. Dial in coffee grinder for Brazil Santos roast. Record extraction video."
                className={`w-full border p-2 text-xs font-medium outline-none ${
                  isLightMode
                    ? 'bg-white border-zinc-300 focus:border-zinc-950 text-zinc-950 placeholder:text-zinc-400'
                    : 'bg-zinc-900 border-zinc-700 focus:border-white text-white placeholder:text-zinc-600'
                }`}
              />
            </div>

            {/* Task-Level Mandatory Proof Rules */}
            <div className={`p-3 border-2 rounded-sm space-y-2 ${
              isLightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900/90 border-zinc-800'
            }`}>
              <div className="flex items-center justify-between">
                <label className={`block text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isLightMode ? 'text-zinc-950' : 'text-white'
                }`}>
                  <ShieldAlert className="w-4 h-4 text-amber-500 stroke-[2.5]" />
                  <span>Mandatory Task Proofs (Require Before Completion)</span>
                </label>
                <span className={`text-[10px] font-mono font-bold ${
                  taskPhotoMandatory && taskVideoMandatory
                    ? 'text-red-500 font-black'
                    : taskPhotoMandatory || taskVideoMandatory
                    ? 'text-emerald-500'
                    : 'text-zinc-400'
                }`}>
                  {taskPhotoMandatory && taskVideoMandatory
                    ? 'BOTH PHOTO & VIDEO REQUIRED'
                    : taskPhotoMandatory
                    ? 'PHOTO REQUIRED'
                    : taskVideoMandatory
                    ? 'VIDEO REQUIRED'
                    : 'OPTIONAL (NO PROOFS REQUIRED)'}
                </span>
              </div>
              <p className={`text-[11px] ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Check the proofs required to complete this task. If you select <strong>both Photo and Video</strong>, staff must upload both.
              </p>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
                <label className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border rounded-xs cursor-pointer select-none transition ${
                  taskPhotoMandatory
                    ? isLightMode ? 'bg-emerald-100 border-emerald-500 text-emerald-950 shadow-xs' : 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-xs'
                    : isLightMode ? 'bg-white border-zinc-300 text-zinc-700 hover:text-zinc-950' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}>
                  <input
                    type="checkbox"
                    checked={taskPhotoMandatory}
                    onChange={(e) => setTaskPhotoMandatory(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                  <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Require Photo Proof</span>
                </label>

                <label className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border rounded-xs cursor-pointer select-none transition ${
                  taskVideoMandatory
                    ? isLightMode ? 'bg-rose-100 border-rose-500 text-rose-950 shadow-xs' : 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-xs'
                    : isLightMode ? 'bg-white border-zinc-300 text-zinc-700 hover:text-zinc-950' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}>
                  <input
                    type="checkbox"
                    checked={taskVideoMandatory}
                    onChange={(e) => setTaskVideoMandatory(e.target.checked)}
                    className="w-4 h-4 accent-rose-500 cursor-pointer"
                  />
                  <Video className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Require Video Proof</span>
                </label>

                <label className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border rounded-xs cursor-pointer select-none transition ${
                  taskNoteMandatory
                    ? isLightMode ? 'bg-amber-100 border-amber-500 text-amber-950 shadow-xs' : 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-xs'
                    : isLightMode ? 'bg-white border-zinc-300 text-zinc-700 hover:text-zinc-950' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}>
                  <input
                    type="checkbox"
                    checked={taskNoteMandatory}
                    onChange={(e) => setTaskNoteMandatory(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                  <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Require Shift Note</span>
                </label>
              </div>
            </div>
          </div>

          {/* 4. Nested Sub-Tasks Builder */}
          <div className={`border-2 p-3 sm:p-4 rounded-sm space-y-3 ${
            isLightMode ? 'bg-white border-zinc-300 shadow-xs' : 'bg-zinc-900 border-zinc-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-blue-500 stroke-[2.5]" />
                <label className={`block text-xs font-black uppercase tracking-wider ${
                  isLightMode ? 'text-zinc-950' : 'text-white'
                }`}>
                  4. Nested Sub-Tasks Checklist ({subTasks.length})
                </label>
              </div>

              {PRESET_CHECKPOINTS[checklistHeader] && (
                <button
                  type="button"
                  onClick={handleLoadPresetCheckpoints}
                  className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-tight flex items-center gap-1 transition cursor-pointer border ${
                    isLightMode
                      ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-300'
                      : 'bg-blue-950 hover:bg-blue-900 text-blue-300 border-blue-700'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  <span>Load Standard Checkpoints</span>
                </button>
              )}
            </div>

            <p className={`text-[11px] ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
              The parent checklist can only be completed when <strong className={isLightMode ? 'text-zinc-950' : 'text-white'}>all nested sub-tasks are checked</strong> and required proofs are uploaded.
            </p>

            {/* Add Sub-task Input Bar */}
            <div className={`border p-3 rounded-sm space-y-2.5 ${
              isLightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-black border-zinc-700'
            }`}>
              <input
                ref={subTaskInputRef}
                type="text"
                value={newSubTaskTitle}
                onChange={(e) => setNewSubTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubTask();
                  }
                }}
                placeholder="Add sub-task checkpoint (e.g., Check chiller thermometer display)"
                className={`w-full border text-xs font-bold outline-none p-2 ${
                  isLightMode
                    ? 'bg-white border-zinc-300 text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950'
                    : 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-white'
                }`}
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-300 dark:border-zinc-800">
                {/* 3 Distinct Checkboxes for Mandatory Proofs */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <label className={`flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 border rounded-xs cursor-pointer select-none transition ${
                    newSubPhoto
                      ? isLightMode ? 'bg-emerald-100 border-emerald-500 text-emerald-900' : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : isLightMode ? 'bg-white border-zinc-300 text-zinc-700 hover:text-zinc-950' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}>
                    <input
                      type="checkbox"
                      checked={newSubPhoto}
                      onChange={(e) => setNewSubPhoto(e.target.checked)}
                      className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
                    />
                    <Camera className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Require Photo</span>
                  </label>

                  <label className={`flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 border rounded-xs cursor-pointer select-none transition ${
                    newSubVideo
                      ? isLightMode ? 'bg-rose-100 border-rose-500 text-rose-900' : 'bg-rose-950/80 border-rose-500 text-rose-300'
                      : isLightMode ? 'bg-white border-zinc-300 text-zinc-700 hover:text-zinc-950' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}>
                    <input
                      type="checkbox"
                      checked={newSubVideo}
                      onChange={(e) => setNewSubVideo(e.target.checked)}
                      className="w-3.5 h-3.5 accent-rose-500 cursor-pointer"
                    />
                    <Video className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                    <span>Require Video</span>
                  </label>

                  <label className={`flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 border rounded-xs cursor-pointer select-none transition ${
                    newSubNote
                      ? isLightMode ? 'bg-amber-100 border-amber-500 text-amber-900' : 'bg-amber-950/80 border-amber-500 text-amber-300'
                      : isLightMode ? 'bg-white border-zinc-300 text-zinc-700 hover:text-zinc-950' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}>
                    <input
                      type="checkbox"
                      checked={newSubNote}
                      onChange={(e) => setNewSubNote(e.target.checked)}
                      className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                    />
                    <FileText className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>Require Note</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleAddSubTask}
                  disabled={!newSubTaskTitle.trim()}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-tight flex items-center gap-1 transition cursor-pointer min-h-[32px] ${
                    newSubTaskTitle.trim()
                      ? isLightMode
                        ? 'bg-zinc-950 text-white hover:bg-zinc-800'
                        : 'bg-white text-black hover:bg-zinc-200'
                      : 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add Sub-task</span>
                </button>
              </div>
            </div>

            {/* Sub-Tasks List */}
            {subTasks.length > 0 ? (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {subTasks.map((sub, idx) => {
                  const isEditing = editingSubTaskId === sub.id;
                  const hasPhotoReq = Boolean(sub.isPhotoMandatory || sub.mandatoryMedia === 'photo');
                  const hasVideoReq = Boolean(sub.isVideoMandatory || sub.mandatoryMedia === 'video');
                  const hasNoteReq = Boolean(sub.isNoteMandatory);

                  if (isEditing) {
                    return (
                      <div
                        key={sub.id}
                        className={`p-3 border-2 border-blue-500 space-y-2 rounded-xs ${
                          isLightMode ? 'bg-blue-50/50' : 'bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-mono font-bold uppercase ${
                            isLightMode ? 'text-blue-800' : 'text-blue-400'
                          }`}>
                            Editing Sub-Task #{idx + 1}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveEditSubTask(sub.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase flex items-center gap-1 transition cursor-pointer"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditSubTask}
                              className={`px-2 py-1 text-[10px] font-black uppercase flex items-center gap-1 transition cursor-pointer ${
                                isLightMode ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                              }`}
                            >
                              <X className="w-3 h-3 stroke-[2.5]" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={editSubTitle}
                          onChange={(e) => setEditSubTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEditSubTask(sub.id);
                            }
                          }}
                          className={`w-full border text-xs font-bold p-1.5 outline-none ${
                            isLightMode
                              ? 'bg-white border-zinc-300 text-zinc-950 focus:border-blue-600'
                              : 'bg-black border-zinc-700 text-white focus:border-blue-400'
                          }`}
                        />

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <label className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 border rounded-xs cursor-pointer select-none transition ${
                            editSubPhoto
                              ? isLightMode ? 'bg-emerald-100 border-emerald-500 text-emerald-900' : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                              : isLightMode ? 'bg-white border-zinc-300 text-zinc-700' : 'bg-black border-zinc-800 text-zinc-400'
                          }`}>
                            <input
                              type="checkbox"
                              checked={editSubPhoto}
                              onChange={(e) => setEditSubPhoto(e.target.checked)}
                              className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
                            />
                            <Camera className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Require Photo</span>
                          </label>

                          <label className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 border rounded-xs cursor-pointer select-none transition ${
                            editSubVideo
                              ? isLightMode ? 'bg-rose-100 border-rose-500 text-rose-900' : 'bg-rose-950/80 border-rose-500 text-rose-300'
                              : isLightMode ? 'bg-white border-zinc-300 text-zinc-700' : 'bg-black border-zinc-800 text-zinc-400'
                          }`}>
                            <input
                              type="checkbox"
                              checked={editSubVideo}
                              onChange={(e) => setEditSubVideo(e.target.checked)}
                              className="w-3.5 h-3.5 accent-rose-500 cursor-pointer"
                            />
                            <Video className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                            <span>Require Video</span>
                          </label>

                          <label className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 border rounded-xs cursor-pointer select-none transition ${
                            editSubNote
                              ? isLightMode ? 'bg-amber-100 border-amber-500 text-amber-900' : 'bg-amber-950/80 border-amber-500 text-amber-300'
                              : isLightMode ? 'bg-white border-zinc-300 text-zinc-700' : 'bg-black border-zinc-800 text-zinc-400'
                          }`}>
                            <input
                              type="checkbox"
                              checked={editSubNote}
                              onChange={(e) => setEditSubNote(e.target.checked)}
                              className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                            />
                            <FileText className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Require Note</span>
                          </label>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={sub.id}
                      className={`p-2.5 border flex items-center justify-between text-xs gap-2 rounded-xs ${
                        isLightMode ? 'bg-zinc-50 border-zinc-200 text-zinc-900 hover:border-zinc-400' : 'bg-black border-zinc-800 text-white hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="font-mono text-[10px] text-zinc-400 w-4 flex-shrink-0">#{idx + 1}</span>
                        <span className="font-bold truncate">{sub.title}</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Requirement badges */}
                        <div className="flex items-center gap-1">
                          {hasPhotoReq && (
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 border flex items-center gap-0.5 ${
                              isLightMode ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            }`}>
                              <Camera className="w-2.5 h-2.5" /> Photo
                            </span>
                          )}
                          {hasVideoReq && (
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 border flex items-center gap-0.5 ${
                              isLightMode ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-rose-950 text-rose-300 border-rose-700'
                            }`}>
                              <Video className="w-2.5 h-2.5" /> Video
                            </span>
                          )}
                          {hasNoteReq && (
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 border flex items-center gap-0.5 ${
                              isLightMode ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-950 text-amber-300 border-amber-700'
                            }`}>
                              <FileText className="w-2.5 h-2.5" /> Note
                            </span>
                          )}
                          {!hasPhotoReq && !hasVideoReq && !hasNoteReq && (
                            <span className="text-[9px] font-mono text-zinc-400 px-1">
                              No Proofs
                            </span>
                          )}
                        </div>

                        {/* Edit and Delete buttons */}
                        <button
                          type="button"
                          onClick={() => handleStartEditSubTask(sub)}
                          className={`p-1 px-1.5 border text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                            isLightMode
                              ? 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                          }`}
                          title="Edit sub-task title & mandatory proofs"
                        >
                          <Edit2 className="w-3 h-3 text-blue-500" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveSubTask(sub.id)}
                          className="p-1 text-zinc-400 hover:text-red-500 transition cursor-pointer"
                          title="Delete sub-task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`p-3 border border-dashed text-center ${
                isLightMode ? 'bg-zinc-100/50 border-zinc-300' : 'bg-black/40 border-zinc-800'
              }`}>
                <p className={`text-xs ${isLightMode ? 'text-zinc-600' : 'text-zinc-500'}`}>
                  No sub-tasks added yet. Use the input above or click{' '}
                  <span className="text-blue-500 font-bold">"Load Standard Checkpoints"</span> to populate default steps.
                </p>
              </div>
            )}
          </div>

          {/* 5. Department & Station Selection */}
          <div>
            <label className={`block text-xs font-black uppercase tracking-wider mb-1.5 ${
              isLightMode ? 'text-zinc-900' : 'text-zinc-300'
            }`}>
              5. Department / Station *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
              {DEPARTMENTS.slice(0, 8).map((dept) => {
                const isSelected = department === dept;
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => {
                      setDepartment(dept);
                      const stillInDept = staffList.find((s) => s.id === assigneeId && s.department === dept);
                      if (!stillInDept) {
                        setAssigneeId('');
                      }
                    }}
                    className={`p-2 sm:p-2.5 text-xs font-black uppercase tracking-tight border transition text-left cursor-pointer min-h-[44px] ${
                      isSelected
                        ? isLightMode
                          ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                          : 'bg-white text-black border-white shadow-md'
                        : isLightMode
                          ? 'bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-100'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <span className="block truncate">{dept}</span>
                    <span className="text-[9px] font-bold block opacity-70">
                      {safeStaffList.filter((s) => s?.department === dept && s?.isActive !== false && s?.active !== false).length} Active Staff
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Priority Level */}
          <div>
            <label className={`block text-xs font-black uppercase tracking-wider mb-1.5 ${
              isLightMode ? 'text-zinc-900' : 'text-zinc-300'
            }`}>
              6. Priority Level *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setPriority('urgent')}
                className={`p-2.5 sm:p-3 text-xs font-black uppercase border transition flex items-center justify-between cursor-pointer min-h-[44px] ${
                  priority === 'urgent'
                    ? 'bg-red-500 text-white border-red-600 font-black shadow-md'
                    : isLightMode
                      ? 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <span>🚨 Urgent Priority</span>
                <span className="text-[9px] sm:text-[10px] opacity-80">Immediate</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('today')}
                className={`p-2.5 sm:p-3 text-xs font-black uppercase border transition flex items-center justify-between cursor-pointer min-h-[44px] ${
                  priority === 'today'
                    ? isLightMode
                      ? 'bg-zinc-950 text-white border-zinc-950 shadow-md'
                      : 'bg-white text-black border-white shadow-md'
                    : isLightMode
                      ? 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <span>📋 Daily Routine</span>
                <span className="text-[9px] sm:text-[10px] opacity-80">Checklist</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('pending')}
                className={`p-2.5 sm:p-3 text-xs font-black uppercase border transition flex items-center justify-between cursor-pointer min-h-[44px] ${
                  priority === 'pending'
                    ? isLightMode
                      ? 'bg-zinc-300 text-zinc-950 border-zinc-400 shadow-md'
                      : 'bg-zinc-700 text-white border-zinc-500 shadow-md'
                    : isLightMode
                      ? 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <span>⏳ Pending Approval</span>
                <span className="text-[9px] sm:text-[10px] opacity-80">Follow-up</span>
              </button>
            </div>
          </div>

          {/* 7. Assign Staff Member */}
          <div className={`p-3 sm:p-4 border-2 space-y-2 sm:space-y-3 rounded-sm ${
            isLightMode ? 'bg-white border-zinc-300 shadow-xs' : 'bg-zinc-900 border-zinc-800'
          }`}>
            <div className="flex items-center justify-between">
              <label className={`block text-xs font-black uppercase tracking-wider ${
                isLightMode ? 'text-zinc-950' : 'text-white'
              }`}>
                7. Assign Staff Member ({department})
              </label>
              <span className={`text-[9px] sm:text-[10px] font-bold uppercase ${
                isLightMode ? 'text-zinc-500' : 'text-zinc-400'
              }`}>
                {deptStaff.length} Available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 max-h-40 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setAssigneeId('')}
                className={`p-2 text-xs font-bold uppercase border text-left transition cursor-pointer min-h-[42px] ${
                  !assigneeId
                    ? isLightMode
                      ? 'bg-zinc-950 text-white border-zinc-950'
                      : 'bg-white text-black border-white'
                    : isLightMode
                      ? 'bg-zinc-50 text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                      : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <span>Unassigned (General Shift)</span>
              </button>

              {deptStaff.map((staff) => {
                const isSelected = assigneeId === staff.id;
                return (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => setAssigneeId(staff.id)}
                    className={`p-2 text-xs font-bold uppercase border text-left transition flex items-center justify-between cursor-pointer min-h-[42px] ${
                      isSelected
                        ? isLightMode
                          ? 'bg-zinc-950 text-white border-zinc-950 shadow'
                          : 'bg-white text-black border-white shadow'
                        : isLightMode
                          ? 'bg-zinc-50 text-zinc-800 border-zinc-300 hover:bg-zinc-100'
                          : 'bg-black text-zinc-300 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black">{staff.name}</span>
                        {staff.roleType === 'manager' && (
                          <span className={`px-1 py-0.1 text-[8px] font-black uppercase ${
                            isSelected
                              ? 'bg-red-500 text-white'
                              : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800'
                          }`}>
                            Manager
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500 block opacity-80">
                        {staff.designation}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className={`w-4 h-4 stroke-[3] flex-shrink-0 ${
                        isLightMode ? 'text-white' : 'text-black'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 8. Shift Notes */}
          <div>
            <label className={`block text-xs font-black uppercase tracking-wider mb-1 flex items-center gap-1.5 ${
              isLightMode ? 'text-zinc-900' : 'text-zinc-300'
            }`}>
              <FileText className="w-3.5 h-3.5 text-red-500" />
              <span>8. Shift Remarks & Instructions</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Add shift remarks, temperature readings, or special guidelines..."
              className={`w-full border p-2 text-xs outline-none ${
                isLightMode
                  ? 'bg-white border-zinc-300 focus:border-zinc-950 text-zinc-950 placeholder:text-zinc-400'
                  : 'bg-zinc-900 border-zinc-700 focus:border-white text-white placeholder:text-zinc-600'
              }`}
            />
          </div>

          {/* 9. Pre-attached Media */}
          <div className={`p-3 sm:p-4 border-2 space-y-2 sm:space-y-3 rounded-sm ${
            isLightMode ? 'bg-white border-zinc-300 shadow-xs' : 'bg-zinc-900 border-zinc-800'
          }`}>
            <div className="flex items-center justify-between">
              <label className={`block text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                isLightMode ? 'text-zinc-950' : 'text-white'
              }`}>
                <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span>9. Attach Media (Live Camera Photo / Video Upload)</span>
              </label>
              <span className={`text-[9px] font-mono ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {mediaList.length} Attached
              </span>
            </div>

            <p className={`text-[10px] ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Attach live inspection photos directly from the camera or upload video clips (photo gallery uploads disabled).
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={videoInputRef}
                type="file"
                multiple
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
                id="task-video-input"
              />

              {/* 📷 Live Camera Button */}
              <button
                type="button"
                onClick={() => setIsLiveCameraOpen(true)}
                className="px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-tight flex items-center gap-1.5 transition cursor-pointer min-h-[44px] shadow-xs"
              >
                <Camera className="w-4 h-4 stroke-[2.5]" />
                <span>📷 Live Camera</span>
              </button>

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className={`px-3 sm:px-3.5 py-2 text-xs font-black uppercase tracking-tight border flex items-center gap-1.5 transition cursor-pointer min-h-[44px] ${
                  isLightMode
                    ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-300'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700'
                }`}
              >
                <Video className="w-4 h-4 text-red-500" />
                <span>Upload Video</span>
              </button>
            </div>

            {/* Thumbnail Preview Grid */}
            {mediaList.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                {mediaList.map((media) => (
                  <div
                    key={media.id}
                    className="relative group bg-black border border-zinc-700 overflow-hidden aspect-video flex items-center justify-center rounded-sm"
                  >
                    {media.type === 'video' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-300 p-1 text-center">
                        <Film className="w-5 h-5 text-red-500 mb-0.5" />
                        <span className="text-[8px] font-mono truncate max-w-full">
                          {media.name}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={media.url}
                        alt={media.name}
                        className="w-full h-full object-cover"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(media.id)}
                      className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-red-600 text-white transition rounded cursor-pointer"
                      title="Remove media"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Sticky Form Footer */}
        <div className={`p-3 sm:p-4 border-t-2 flex flex-wrap items-center justify-between gap-2 sm:gap-3 safe-bottom ${
          isLightMode ? 'bg-zinc-100 border-zinc-950' : 'bg-zinc-900 border-white'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-tight transition min-h-[44px] cursor-pointer ${
              isLightMode
                ? 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300 border border-zinc-300'
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {(!editingTask || isDuplicate) && (
              <button
                type="button"
                onClick={handleAddAnotherTask}
                className={`px-4 py-2.5 border text-xs font-black uppercase tracking-tight flex items-center gap-1.5 transition cursor-pointer min-h-[44px] ${
                  isLightMode
                    ? 'bg-white hover:bg-zinc-50 text-zinc-950 border-zinc-400'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-600'
                }`}
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Add Another Task</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              className={`px-6 py-2.5 text-xs font-black uppercase tracking-tight transition cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] shadow-md ${
                isLightMode
                  ? 'bg-zinc-950 text-white hover:bg-zinc-800'
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                {editingTask && !isDuplicate
                  ? 'Save Checklist Changes'
                  : totalTasksToSubmit > 1
                  ? `Create All (${totalTasksToSubmit}) Tasks`
                  : 'Save to Daily Checklist'}
              </span>
            </button>
          </div>
        </div>

        {/* Live Camera Modal for immediate photo proof capturing */}
        <LiveCameraModal
          isOpen={isLiveCameraOpen}
          onClose={() => setIsLiveCameraOpen(false)}
          onCapture={handleLiveCameraCapture}
          title="Capture Checklist Photo Proof"
        />
      </div>
    </div>
  );
};
