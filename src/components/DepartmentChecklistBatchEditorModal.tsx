import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  Camera,
  Video,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  CheckSquare,
  Square,
  Layers,
} from 'lucide-react';
import { TaskItem, TaskDepartment, SubTaskItem, ChecklistHeader, DEFAULT_OUTLET } from '../types';
import { useTheme } from '../context/ThemeContext';
import { PREDEFINED_CHECKLIST_TEMPLATES } from '../data/checklistTemplates';

export interface DepartmentBundleDef {
  key: string;
  title: string;
  icon: string;
  department: TaskDepartment;
  matchingHeaders: string[];
  defaultShiftOverview: string;
}

export const DEPARTMENT_BUNDLES: DepartmentBundleDef[] = [
  {
    key: 'kitchen',
    title: 'Kitchen & Food Prep Daily Checklist',
    icon: '🍳',
    department: 'Kitchen',
    matchingHeaders: ['Kitchen Opening Checklist', 'Kitchen Closing Checklist', 'Kitchen & Food Prep'],
    defaultShiftOverview: 'Opening (08:30 AM) & Closing (10:00 PM) Shifts',
  },
  {
    key: 'bar',
    title: 'Barista & Beverage Daily Checklist',
    icon: '☕',
    department: 'Bar',
    matchingHeaders: ['Bar Opening Checklist', 'Bar Closing Checklist', 'Barista & Beverage Station'],
    defaultShiftOverview: 'Opening (09:00 AM) & Closing (10:00 PM) Shifts',
  },
  {
    key: 'housekeeping',
    title: 'Housekeeping & Hygiene Checklist',
    icon: '🧹',
    department: 'Housekeeping',
    matchingHeaders: ['Housekeeping Opening/Closing', 'Closing & Maintenance'],
    defaultShiftOverview: 'All-Day Maintenance & Night Deep Clean',
  },
  {
    key: 'service',
    title: 'Service & Dining Checklist',
    icon: '🛎️',
    department: 'Service',
    matchingHeaders: ['Service Opening Checklist', 'Service Closing Checklist', 'Service Opening/Closing', 'Cashier & Front of House (FOH)'],
    defaultShiftOverview: 'Floor Alignment, Guest Ambience & Closing',
  },
  {
    key: 'billing',
    title: 'Billing & Cashier Daily Checklist',
    icon: '💳',
    department: 'Billing',
    matchingHeaders: ['Cashier Opening/Closing', 'Billing'],
    defaultShiftOverview: 'Morning Float (Rs 10,000) & POS Z-Report',
  },
];

interface DepartmentChecklistBatchEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: DepartmentBundleDef;
  initialTasks: TaskItem[];
  onSaveBatch: (updatedTasks: TaskItem[], deletedTaskIds: string[]) => Promise<void>;
  onResetToDefaultBundle: (bundleKey: string) => Promise<void>;
}

interface EditableTaskRow extends TaskItem {
  isNew?: boolean;
  isModified?: boolean;
}

export const DepartmentChecklistBatchEditorModal: React.FC<DepartmentChecklistBatchEditorModalProps> = ({
  isOpen,
  onClose,
  bundle,
  initialTasks,
  onSaveBatch,
  onResetToDefaultBundle,
}) => {
  const { isLightMode } = useTheme();

  // Local state for batch editing
  const [editableRows, setEditableRows] = useState<EditableTaskRow[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedSubtaskMap, setExpandedSubtaskMap] = useState<Record<string, boolean>>({});
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<Record<string, string>>({});

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Initialize editable rows when modal opens or initialTasks change
  useEffect(() => {
    if (isOpen) {
      const cloned = initialTasks.map((t) => ({
        ...t,
        subTasks: t.subTasks ? t.subTasks.map((st) => ({ ...st })) : [],
      }));
      setEditableRows(cloned);
      setDeletedIds(new Set());
      setSelectedRowIds(new Set());
      setSearchFilter('');
    }
  }, [isOpen, initialTasks]);

  if (!isOpen) return null;

  // Filtered rows for search
  const filteredRows = editableRows.filter((r) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase().trim();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.details && r.details.toLowerCase().includes(q)) ||
      (r.checklistHeader && r.checklistHeader.toLowerCase().includes(q))
    );
  });

  // Toggle selection
  const toggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRowIds.size === filteredRows.length && filteredRows.length > 0) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredRows.map((r) => r.id)));
    }
  };

  // Add 1 blank task row
  const handleAddBlankRow = () => {
    const newId = `task-${bundle.key}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newRow: EditableTaskRow = {
      id: newId,
      title: '',
      details: '',
      priority: 'today',
      department: bundle.department,
      checklistHeader: bundle.matchingHeaders[0] || `${bundle.department} Checklist`,
      completed: false,
      startTime: '08:30 AM',
      endTime: '10:00 AM',
      deadline: '10:00 AM',
      isPhotoMandatory: false,
      isVideoMandatory: false,
      isNoteMandatory: false,
      mandatoryMedia: 'none',
      subTasks: [],
      outlet: DEFAULT_OUTLET,
      createdAt: new Date().toISOString(),
      assignedAt: new Date().toISOString(),
      isNew: true,
      isModified: true,
    };
    setEditableRows((prev) => [newRow, ...prev]);
  };

  // Add 5 blank rows
  const handleAddFiveRows = () => {
    const newRows: EditableTaskRow[] = Array.from({ length: 5 }).map((_, idx) => {
      const newId = `task-${bundle.key}-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`;
      return {
        id: newId,
        title: '',
        details: '',
        priority: 'today',
        department: bundle.department,
        checklistHeader: bundle.matchingHeaders[0] || `${bundle.department} Checklist`,
        completed: false,
        startTime: '08:30 AM',
        endTime: '10:00 AM',
        deadline: '10:00 AM',
        isPhotoMandatory: false,
        isVideoMandatory: false,
        isNoteMandatory: false,
        mandatoryMedia: 'none',
        subTasks: [],
        outlet: DEFAULT_OUTLET,
        createdAt: new Date().toISOString(),
        assignedAt: new Date().toISOString(),
        isNew: true,
        isModified: true,
      };
    });
    setEditableRows((prev) => [...newRows, ...prev]);
  };

  // Field change handler
  const handleFieldChange = (id: string, field: keyof EditableTaskRow, value: any) => {
    setEditableRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            [field]: value,
            isModified: true,
          };
        }
        return r;
      })
    );
  };

  // Shift Timing Presets
  const handleShiftPreset = (id: string, preset: 'opening' | 'rush' | 'closing' | 'anytime') => {
    let header = bundle.matchingHeaders[0] || `${bundle.department} Checklist`;
    let start = '08:30 AM';
    let end = '10:00 AM';
    let priority: 'today' | 'urgent' = 'today';

    if (preset === 'opening') {
      header = bundle.matchingHeaders.find((h) => h.toLowerCase().includes('opening')) || bundle.matchingHeaders[0];
      start = '08:30 AM';
      end = '10:30 AM';
    } else if (preset === 'rush') {
      header = bundle.matchingHeaders[0];
      start = '12:00 PM';
      end = '04:00 PM';
      priority = 'urgent';
    } else if (preset === 'closing') {
      header = bundle.matchingHeaders.find((h) => h.toLowerCase().includes('closing')) || bundle.matchingHeaders[0];
      start = '10:00 PM';
      end = '11:30 PM';
    } else if (preset === 'anytime') {
      start = '09:00 AM';
      end = '06:00 PM';
    }

    setEditableRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            checklistHeader: header,
            startTime: start,
            endTime: end,
            deadline: end,
            priority,
            isModified: true,
          };
        }
        return r;
      })
    );
  };

  // All Available Checklist Headers for Bulk Reassignment
  const allAvailableHeaders = React.useMemo(() => {
    const set = new Set<string>(bundle.matchingHeaders);
    editableRows.forEach((r) => {
      if (r.checklistHeader) set.add(r.checklistHeader);
    });
    set.add('Kitchen Opening Checklist');
    set.add('Kitchen Closing Checklist');
    set.add('Bar Opening Checklist');
    set.add('Bar Closing Checklist');
    set.add('Cashier Opening/Closing');
    set.add('Service Opening Checklist');
    set.add('Service Closing Checklist');
    set.add('Housekeeping Opening/Closing');
    set.add('General Operations');
    return Array.from(set);
  }, [bundle, editableRows]);

  // Bulk Department / Station Change
  const handleBulkChangeDepartment = (newDept: TaskDepartment) => {
    if (selectedRowIds.size === 0) return;
    setEditableRows((prev) =>
      prev.map((r) => {
        if (selectedRowIds.has(r.id)) {
          return {
            ...r,
            department: newDept,
            isModified: true,
          };
        }
        return r;
      })
    );
  };

  // Bulk Shift Timing Preset Change
  const handleBulkApplyShiftPreset = (preset: 'opening' | 'rush' | 'closing' | 'allday') => {
    if (selectedRowIds.size === 0) return;

    let start = '08:30 AM';
    let end = '10:00 AM';
    let priority: 'today' | 'urgent' = 'today';

    if (preset === 'opening') {
      start = '08:30 AM';
      end = '10:00 AM';
    } else if (preset === 'rush') {
      start = '12:30 PM';
      end = '03:00 PM';
      priority = 'urgent';
    } else if (preset === 'closing') {
      start = '09:30 PM';
      end = '11:00 PM';
    } else if (preset === 'allday') {
      start = '09:00 AM';
      end = '06:00 PM';
    }

    setEditableRows((prev) =>
      prev.map((r) => {
        if (selectedRowIds.has(r.id)) {
          return {
            ...r,
            startTime: start,
            endTime: end,
            deadline: end,
            priority,
            isModified: true,
          };
        }
        return r;
      })
    );
  };

  // Bulk Photo Proof Toggle
  const handleBulkSetPhotoProof = (mandatory: boolean) => {
    if (selectedRowIds.size === 0) return;
    setEditableRows((prev) =>
      prev.map((r) => {
        if (selectedRowIds.has(r.id)) {
          return {
            ...r,
            isPhotoMandatory: mandatory,
            mandatoryMedia: mandatory ? 'photo' : r.isVideoMandatory ? 'video' : 'none',
            isModified: true,
          };
        }
        return r;
      })
    );
  };

  // Bulk Video Proof Toggle
  const handleBulkSetVideoProof = (mandatory: boolean) => {
    if (selectedRowIds.size === 0) return;
    setEditableRows((prev) =>
      prev.map((r) => {
        if (selectedRowIds.has(r.id)) {
          return {
            ...r,
            isVideoMandatory: mandatory,
            mandatoryMedia: mandatory ? 'video' : r.isPhotoMandatory ? 'photo' : 'none',
            isModified: true,
          };
        }
        return r;
      })
    );
  };

  // Bulk Reassign Checklist Sub-Header
  const handleBulkReassignChecklistHeader = (newHeader: string) => {
    if (selectedRowIds.size === 0 || !newHeader) return;
    setEditableRows((prev) =>
      prev.map((r) => {
        if (selectedRowIds.has(r.id)) {
          return {
            ...r,
            checklistHeader: newHeader as ChecklistHeader,
            isModified: true,
          };
        }
        return r;
      })
    );
  };

  // Delete single row locally
  const handleDeleteRow = (id: string) => {
    const row = editableRows.find((r) => r.id === id);
    if (!row) return;

    if (!row.isNew) {
      setDeletedIds((prev) => new Set(prev).add(id));
    }
    setEditableRows((prev) => prev.filter((r) => r.id !== id));
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Delete selected bulk rows
  const handleDeleteSelected = () => {
    const idsToDelete = Array.from(selectedRowIds);
    if (idsToDelete.length === 0) return;

    idsToDelete.forEach((id) => {
      const row = editableRows.find((r) => r.id === id);
      if (row && !row.isNew) {
        setDeletedIds((prev) => new Set(prev).add(id));
      }
    });

    setEditableRows((prev) => prev.filter((r) => !selectedRowIds.has(r.id)));
    setSelectedRowIds(new Set());
  };

  // Duplicate row
  const handleDuplicateRow = (row: EditableTaskRow) => {
    const newId = `task-${bundle.key}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const duplicated: EditableTaskRow = {
      ...row,
      id: newId,
      title: `${row.title} (Copy)`,
      isNew: true,
      isModified: true,
      subTasks: row.subTasks ? row.subTasks.map((st) => ({ ...st, id: `sub-${Date.now()}-${Math.random()}` })) : [],
    };
    setEditableRows((prev) => [duplicated, ...prev]);
  };

  // Subtasks Inline Handlers
  const toggleExpandSubtasks = (id: string) => {
    setExpandedSubtaskMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddSubtask = (taskId: string) => {
    const title = (newSubtaskInputs[taskId] || '').trim();
    if (!title) return;

    const newSubtask: SubTaskItem = {
      id: `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title,
      isDone: false,
    };

    setEditableRows((prev) =>
      prev.map((r) => {
        if (r.id === taskId) {
          return {
            ...r,
            subTasks: [...(r.subTasks || []), newSubtask],
            isModified: true,
          };
        }
        return r;
      })
    );

    setNewSubtaskInputs((prev) => ({ ...prev, [taskId]: '' }));
  };

  const handleRemoveSubtask = (taskId: string, subtaskId: string) => {
    setEditableRows((prev) =>
      prev.map((r) => {
        if (r.id === taskId) {
          return {
            ...r,
            subTasks: (r.subTasks || []).filter((st) => st.id !== subtaskId),
            isModified: true,
          };
        }
        return r;
      })
    );
  };

  // Save All Changes to Firestore & Cache
  const handleExecuteSaveAll = async () => {
    // Validate rows
    const validRows = editableRows.filter((r) => r.title.trim().length > 0);
    const emptyCount = editableRows.length - validRows.length;

    if (validRows.length === 0 && deletedIds.size === 0) {
      alert('Please enter at least one valid task title before saving.');
      return;
    }

    setIsSaving(true);
    try {
      // Ensure all rows have valid mandatoryMedia and department
      const sanitizedRows: TaskItem[] = validRows.map((r) => ({
        id: r.id,
        title: r.title.trim(),
        details: r.details || '',
        priority: r.priority || 'today',
        department: r.department || bundle.department,
        checklistHeader: r.checklistHeader || bundle.matchingHeaders[0] || `${bundle.department} Checklist`,
        completed: Boolean(r.completed),
        startTime: r.startTime || '08:30 AM',
        endTime: r.endTime || '10:00 AM',
        deadline: r.deadline || '10:00 AM',
        isPhotoMandatory: Boolean(r.isPhotoMandatory),
        isVideoMandatory: Boolean(r.isVideoMandatory),
        isNoteMandatory: Boolean(r.isNoteMandatory),
        mandatoryMedia: r.isPhotoMandatory ? 'photo' : r.isVideoMandatory ? 'video' : 'none',
        subTasks: r.subTasks || [],
        outlet: r.outlet || DEFAULT_OUTLET,
        createdAt: r.createdAt || new Date().toISOString(),
        assignedAt: r.assignedAt || new Date().toISOString(),
      }));

      await onSaveBatch(sanitizedRows, Array.from(deletedIds));

      setSaveSuccessMsg(`✓ Successfully saved ${sanitizedRows.length} checklist items to Firestore!`);
      setTimeout(() => {
        setSaveSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Batch checklist save failed:', err);
      alert(`Error saving checklist changes: ${err?.message || 'Database connection error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Reset to Default Template
  const handleExecuteResetToDefault = async () => {
    setIsSaving(true);
    try {
      await onResetToDefaultBundle(bundle.key);
      setSaveSuccessMsg(`✓ ${bundle.title} reset to default template!`);
      setTimeout(() => {
        setSaveSuccessMsg(null);
        setConfirmReset(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Reset bundle template error:', err);
      alert(`Failed to reset template: ${err?.message || 'Database error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className={`w-full max-w-7xl h-[92vh] flex flex-col border-2 sm:border-4 shadow-2xl overflow-hidden rounded-xl ${
            isLightMode ? 'bg-[#F4F6F0] border-zinc-900 text-zinc-950' : 'bg-[#0B140F] border-zinc-700 text-white'
          }`}
        >
          {/* Top Bar Header */}
          <div className="p-3.5 sm:p-5 bg-zinc-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-zinc-800">
            <div className="flex items-center gap-3">
              <span className="text-2xl p-2 bg-zinc-900 border border-zinc-700 rounded-lg">{bundle.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-600 text-white rounded">
                    BATCH CHECKLIST EDITOR
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Dept: {bundle.department}
                  </span>
                </div>
                <h2 className="text-base sm:text-xl font-black uppercase tracking-tight mt-0.5">
                  {bundle.title}
                </h2>
                <p className="text-xs text-zinc-400 hidden sm:block">
                  {bundle.defaultShiftOverview} • Edit questions, shift timings, photo requirements & subtasks in a single table view.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleExecuteSaveAll}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-md shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save All Changes'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition cursor-pointer"
                aria-label="Close Editor"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Quick Action Bar */}
          <div
            className={`p-3 sm:p-4 border-b flex flex-wrap items-center justify-between gap-2.5 ${
              isLightMode ? 'bg-white border-zinc-300' : 'bg-black/40 border-zinc-800'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddBlankRow}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-xs font-black uppercase tracking-tight rounded flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Add Task Row</span>
              </button>

              <button
                type="button"
                onClick={handleAddFiveRows}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-tight rounded border transition flex items-center gap-1.5 cursor-pointer ${
                  isLightMode
                    ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-900'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add 5 Blank Rows</span>
              </button>

              {selectedRowIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-tight rounded flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedRowIds.size})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-tight rounded border transition flex items-center gap-1.5 cursor-pointer ${
                  isLightMode
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-800'
                }`}
                title="Reset this department checklist to default operational tasks"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset to Default Template</span>
              </button>
            </div>

            {/* Filter Search Field */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search questions in checklist..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 text-xs font-semibold border rounded transition ${
                  isLightMode
                    ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
                    : 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500'
                }`}
              />
            </div>
          </div>

          {/* Toast / Alert feedback */}
          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 stroke-[3]" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Main Batch Table */}
          <div className="flex-1 overflow-auto p-2 sm:p-4">
            <div
              className={`rounded-lg border shadow-sm overflow-hidden ${
                isLightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-800'
              }`}
            >
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`border-b-2 text-[11px] font-black uppercase tracking-wider ${
                      isLightMode
                        ? 'bg-zinc-100 text-zinc-800 border-zinc-300'
                        : 'bg-zinc-950 text-zinc-300 border-zinc-800'
                    }`}
                  >
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRowIds.size === filteredRows.length && filteredRows.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-zinc-400 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                        aria-label="Select all rows"
                      />
                    </th>
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3 w-[40%]">Checklist Question / Task Title</th>
                    <th className="py-3 px-3 w-[22%]">Shift & Timing</th>
                    <th className="py-3 px-3 w-[18%]">Proof Required</th>
                    <th className="py-3 px-3 w-[15%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/70">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500 text-xs font-bold uppercase">
                        No tasks in this department checklist. Click <strong>"+ Add Task Row"</strong> or <strong>"Reset to Default Template"</strong> above.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => {
                      const isSelected = selectedRowIds.has(row.id);
                      const isSubtaskExpanded = Boolean(expandedSubtaskMap[row.id]);
                      const subtaskCount = row.subTasks?.length || 0;

                      return (
                        <React.Fragment key={`batch-row-${row.id || 'no-id'}-${idx}`}>
                          <tr
                            className={`transition-colors duration-150 ${
                              isSelected
                                ? isLightMode
                                  ? 'bg-red-50/80'
                                  : 'bg-red-950/40'
                                : row.isNew
                                ? isLightMode
                                  ? 'bg-emerald-50/50'
                                  : 'bg-emerald-950/20'
                                : isLightMode
                                ? 'hover:bg-zinc-50'
                                : 'hover:bg-zinc-800/40'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-3 px-3 align-top text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectRow(row.id)}
                                className="w-4 h-4 rounded border-zinc-400 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                              />
                            </td>

                            {/* Row Index */}
                            <td className="py-3 px-3 align-top font-mono font-bold text-zinc-400 text-[11px]">
                              {idx + 1}
                            </td>

                            {/* Task Title & Details Input */}
                            <td className="py-3 px-3 align-top">
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  value={row.title}
                                  onChange={(e) => handleFieldChange(row.id, 'title', e.target.value)}
                                  placeholder="e.g. Inspect chiller temperature gauge..."
                                  className={`w-full px-2.5 py-1.5 text-xs font-bold border rounded transition ${
                                    !row.title.trim()
                                      ? 'border-red-500 bg-red-50/30 dark:bg-red-950/20'
                                      : isLightMode
                                      ? 'bg-white border-zinc-300 text-zinc-950 focus:border-black'
                                      : 'bg-zinc-800 border-zinc-700 text-white focus:border-white'
                                  }`}
                                />

                                <div className="flex items-center justify-between gap-2">
                                  <input
                                    type="text"
                                    value={row.details || ''}
                                    onChange={(e) => handleFieldChange(row.id, 'details', e.target.value)}
                                    placeholder="Optional instruction note / details..."
                                    className={`w-full px-2 py-1 text-[11px] font-medium border rounded transition ${
                                      isLightMode
                                        ? 'bg-zinc-50 border-zinc-200 text-zinc-700'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                                    }`}
                                  />

                                  {/* Subtasks Toggle Badge */}
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandSubtasks(row.id)}
                                    className={`px-2 py-1 text-[10px] font-black uppercase rounded border transition flex items-center gap-1 shrink-0 cursor-pointer ${
                                      subtaskCount > 0
                                        ? 'bg-purple-100 text-[#673ab7] dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                                        : isLightMode
                                        ? 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-200'
                                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                                    }`}
                                  >
                                    <ListTodo className="w-3 h-3" />
                                    <span>{subtaskCount} Subtask{subtaskCount === 1 ? '' : 's'}</span>
                                    {isSubtaskExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* Shift & Timing Selector */}
                            <td className="py-3 px-3 align-top">
                              <div className="space-y-1.5">
                                <select
                                  value={row.checklistHeader || bundle.matchingHeaders[0]}
                                  onChange={(e) => handleFieldChange(row.id, 'checklistHeader', e.target.value)}
                                  className={`w-full px-2 py-1.5 text-xs font-bold border rounded uppercase transition cursor-pointer ${
                                    isLightMode
                                      ? 'bg-white border-zinc-300 text-zinc-900'
                                      : 'bg-zinc-800 border-zinc-700 text-white'
                                  }`}
                                >
                                  {bundle.matchingHeaders.map((h) => (
                                    <option key={h} value={h}>
                                      {h}
                                    </option>
                                  ))}
                                </select>

                                {/* Quick Timing Presets */}
                                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                                  <span className="text-[9px] font-bold text-zinc-400 uppercase">Preset:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleShiftPreset(row.id, 'opening')}
                                    className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-bold rounded cursor-pointer hover:opacity-80"
                                  >
                                    Opening
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleShiftPreset(row.id, 'rush')}
                                    className="px-1.5 py-0.5 bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 text-[10px] font-bold rounded cursor-pointer hover:opacity-80"
                                  >
                                    Rush/Urgent
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleShiftPreset(row.id, 'closing')}
                                    className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[10px] font-bold rounded cursor-pointer hover:opacity-80"
                                  >
                                    Closing
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* Proof Required Toggles */}
                            <td className="py-3 px-3 align-top">
                              <div className="flex flex-col gap-1">
                                {/* Photo Toggle */}
                                <button
                                  type="button"
                                  onClick={() => handleFieldChange(row.id, 'isPhotoMandatory', !row.isPhotoMandatory)}
                                  className={`px-2 py-1 text-[10px] font-black uppercase rounded border transition flex items-center justify-between cursor-pointer ${
                                    row.isPhotoMandatory
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : isLightMode
                                      ? 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-200'
                                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                                  }`}
                                >
                                  <span className="flex items-center gap-1">
                                    <Camera className="w-3 h-3" /> Photo Proof
                                  </span>
                                  <span>{row.isPhotoMandatory ? 'YES' : 'NO'}</span>
                                </button>

                                {/* Video Toggle */}
                                <button
                                  type="button"
                                  onClick={() => handleFieldChange(row.id, 'isVideoMandatory', !row.isVideoMandatory)}
                                  className={`px-2 py-1 text-[10px] font-black uppercase rounded border transition flex items-center justify-between cursor-pointer ${
                                    row.isVideoMandatory
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : isLightMode
                                      ? 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-200'
                                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                                  }`}
                                >
                                  <span className="flex items-center gap-1">
                                    <Video className="w-3 h-3" /> Video Proof
                                  </span>
                                  <span>{row.isVideoMandatory ? 'YES' : 'NO'}</span>
                                </button>
                              </div>
                            </td>

                            {/* Row Actions */}
                            <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateRow(row)}
                                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition cursor-pointer"
                                  title="Duplicate Task"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(row.id)}
                                  className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded transition cursor-pointer"
                                  title="Delete Task Row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Subtasks Expanded Drawer Row */}
                          {isSubtaskExpanded && (
                            <tr
                              className={`${
                                isLightMode ? 'bg-purple-50/40' : 'bg-purple-950/20'
                              }`}
                            >
                              <td colSpan={6} className="p-3 sm:p-4 border-b border-zinc-300 dark:border-zinc-800">
                                <div className="space-y-2 max-w-2xl pl-8">
                                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#673ab7] dark:text-purple-300">
                                    <span className="flex items-center gap-1.5">
                                      <ListTodo className="w-4 h-4" />
                                      Subtasks for: "{row.title || 'Untitled Task'}"
                                    </span>
                                    <span>({subtaskCount} Subtask{subtaskCount === 1 ? '' : 's'})</span>
                                  </div>

                                  {/* Existing Subtasks */}
                                  <div className="space-y-1">
                                    {row.subTasks && row.subTasks.length > 0 ? (
                                      row.subTasks.map((st, subIdx) => (
                                        <div
                                          key={st.id || subIdx}
                                          className={`flex items-center justify-between gap-2 p-2 rounded border text-xs ${
                                            isLightMode
                                              ? 'bg-white border-zinc-200 text-zinc-900'
                                              : 'bg-zinc-900 border-zinc-800 text-white'
                                          }`}
                                        >
                                          <span className="font-medium text-xs">
                                            {subIdx + 1}. {st.title}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveSubtask(row.id, st.id)}
                                            className="p-1 text-zinc-400 hover:text-red-500 cursor-pointer"
                                            title="Remove Subtask"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-[11px] italic text-zinc-500">
                                        No subtasks added yet. Type below to add subtasks to this checklist item.
                                      </p>
                                    )}
                                  </div>

                                  {/* Add Subtask Input */}
                                  <div className="flex items-center gap-2 pt-1">
                                    <input
                                      type="text"
                                      placeholder="Type new subtask step (e.g. Wipe nozzle, check seal)..."
                                      value={newSubtaskInputs[row.id] || ''}
                                      onChange={(e) =>
                                        setNewSubtaskInputs((prev) => ({ ...prev, [row.id]: e.target.value }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleAddSubtask(row.id);
                                        }
                                      }}
                                      className={`flex-1 px-3 py-1.5 text-xs font-medium border rounded ${
                                        isLightMode
                                          ? 'bg-white border-zinc-300 text-zinc-900'
                                          : 'bg-zinc-800 border-zinc-700 text-white'
                                      }`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAddSubtask(row.id)}
                                      className="px-3 py-1.5 bg-[#673ab7] hover:bg-[#58309e] text-white text-xs font-bold uppercase rounded cursor-pointer shrink-0"
                                    >
                                      + Add Subtask
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Floating Sticky Bulk Actions Toolbar */}
          <AnimatePresence>
            {selectedRowIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 25 }}
                className="sticky bottom-2 z-30 mx-2 sm:mx-4 p-3 bg-zinc-950 text-white rounded-xl shadow-2xl border-2 border-[#673ab7] flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0"
              >
                {/* Selection Counter Badge */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[#673ab7] text-white flex items-center justify-center font-black text-xs shrink-0 shadow">
                    {selectedRowIds.size}
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-tight text-white flex items-center gap-1.5">
                      <span>{selectedRowIds.size} {selectedRowIds.size === 1 ? 'Task' : 'Tasks'} Selected</span>
                      <span className="text-[10px] text-purple-300 font-mono bg-purple-950/80 px-1.5 py-0.2 rounded border border-purple-800">
                        Bulk Editor
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Apply changes instantly to all checked tasks
                    </div>
                  </div>
                </div>

                {/* Bulk Action Controls */}
                <div className="flex flex-wrap items-center gap-2 flex-1 justify-start lg:justify-end">
                  {/* 1. Department / Station Dropdown */}
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 px-2 py-1 rounded">
                    <span className="text-[10px] font-bold uppercase text-zinc-400">Dept:</span>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleBulkChangeDepartment(e.target.value as TaskDepartment);
                          e.target.value = '';
                        }
                      }}
                      className="bg-transparent text-xs font-bold text-emerald-400 outline-none cursor-pointer uppercase max-w-[130px]"
                    >
                      <option value="" disabled className="bg-zinc-900 text-zinc-300">Reassign Station...</option>
                      <option value="Kitchen" className="bg-zinc-900 text-white">Kitchen</option>
                      <option value="Bar" className="bg-zinc-900 text-white">Bar</option>
                      <option value="Housekeeping" className="bg-zinc-900 text-white">Housekeeping</option>
                      <option value="Service" className="bg-zinc-900 text-white">Service</option>
                      <option value="Billing" className="bg-zinc-900 text-white">Billing</option>
                      <option value="Management" className="bg-zinc-900 text-white">Management</option>
                      <option value="Inventory" className="bg-zinc-900 text-white">Inventory</option>
                      <option value="Maintenance" className="bg-zinc-900 text-white">Maintenance</option>
                      <option value="General" className="bg-zinc-900 text-white">General</option>
                    </select>
                  </div>

                  {/* 2. Shift Timing / Preset Dropdown */}
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 px-2 py-1 rounded">
                    <span className="text-[10px] font-bold uppercase text-zinc-400">Shift:</span>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleBulkApplyShiftPreset(e.target.value as any);
                          e.target.value = '';
                        }
                      }}
                      className="bg-transparent text-xs font-bold text-amber-300 outline-none cursor-pointer uppercase max-w-[150px]"
                    >
                      <option value="" disabled className="bg-zinc-900 text-zinc-300">Apply Timing...</option>
                      <option value="opening" className="bg-zinc-900 text-white">Opening Shift (08:30 AM – 10:00 AM)</option>
                      <option value="rush" className="bg-zinc-900 text-white">Rush / Mid-Day (12:30 PM – 03:00 PM)</option>
                      <option value="closing" className="bg-zinc-900 text-white">Closing Shift (09:30 PM – 11:00 PM)</option>
                      <option value="allday" className="bg-zinc-900 text-white">All-Day / Continuous (09:00 AM – 06:00 PM)</option>
                    </select>
                  </div>

                  {/* 3. Reassign Checklist Sub-Header Dropdown */}
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 px-2 py-1 rounded">
                    <span className="text-[10px] font-bold uppercase text-zinc-400">Move:</span>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleBulkReassignChecklistHeader(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="bg-transparent text-xs font-bold text-purple-300 outline-none cursor-pointer uppercase max-w-[140px]"
                    >
                      <option value="" disabled className="bg-zinc-900 text-zinc-300">Move Checklist...</option>
                      {allAvailableHeaders.map((hdr) => (
                        <option key={`bulk-hdr-${hdr}`} value={hdr} className="bg-zinc-900 text-white">
                          {hdr}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 4. Photo Proof Controls */}
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 p-0.5 rounded">
                    <button
                      type="button"
                      onClick={() => handleBulkSetPhotoProof(true)}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded transition cursor-pointer flex items-center gap-1"
                      title="Set Photo Proof Mandatory for selected tasks"
                    >
                      <Camera className="w-3 h-3" /> + Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkSetPhotoProof(false)}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase rounded transition cursor-pointer"
                      title="Remove Photo Proof requirement for selected tasks"
                    >
                      - Photo
                    </button>
                  </div>

                  {/* 5. Video Proof Controls */}
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 p-0.5 rounded">
                    <button
                      type="button"
                      onClick={() => handleBulkSetVideoProof(true)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase rounded transition cursor-pointer flex items-center gap-1"
                      title="Set Video Proof Mandatory for selected tasks"
                    >
                      <Video className="w-3 h-3" /> + Video
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkSetVideoProof(false)}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase rounded transition cursor-pointer"
                      title="Remove Video Proof requirement for selected tasks"
                    >
                      - Video
                    </button>
                  </div>

                  {/* 6. Delete Selected Button */}
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider rounded flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow shrink-0"
                    title="Delete all selected task rows"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Delete ({selectedRowIds.size})</span>
                  </button>

                  {/* Clear Selection Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedRowIds(new Set())}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition cursor-pointer shrink-0"
                    title="Deselect All"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Action Footer */}
          <div className="p-3.5 sm:p-5 bg-zinc-950 text-white flex items-center justify-between gap-3 border-t-2 border-zinc-800">
            <div className="text-xs font-bold text-zinc-400">
              Total Checklist Items: <strong>{editableRows.length}</strong> ({deletedIds.size} queued for deletion)
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase rounded cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteSaveAll}
                disabled={isSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-md shadow-lg flex items-center gap-2 transition active:scale-95 cursor-pointer"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save All Changes'}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Reset Confirmation Dialog */}
        {confirmReset && (
          <div className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-4">
            <div
              className={`w-full max-w-md p-6 border-4 border-amber-500 rounded-lg shadow-2xl space-y-4 ${
                isLightMode ? 'bg-white text-zinc-900' : 'bg-zinc-950 text-white'
              }`}
            >
              <div className="flex items-center gap-2 text-amber-500">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
                <h3 className="text-base font-black uppercase">Reset {bundle.title}?</h3>
              </div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Are you sure you want to reset <strong>{bundle.title}</strong> to its default operational tasks? Any unsaved edits will be replaced with the default master template.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-3.5 py-2 text-xs font-bold uppercase bg-zinc-700 text-white hover:bg-zinc-600 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteResetToDefault}
                  className="px-4 py-2 text-xs font-black uppercase bg-amber-600 hover:bg-amber-500 text-white rounded shadow cursor-pointer"
                >
                  Confirm Reset to Default
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
