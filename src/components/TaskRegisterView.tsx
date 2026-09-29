import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  Calendar,
  Clock,
  User,
  Filter,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Tag,
  ArrowUpDown,
  ChevronDown,
  RefreshCw,
  Camera,
  Video,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Eye,
  Check,
  Flame,
  Table,
  List,
  Share2,
  Loader2,
  Trash2,
  X,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';
import { TaskItem, StaffMember, TaskDepartment, TaskMedia } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth, isHemenDas } from '../context/AuthContext';
import { evaluateTaskTimeStatus } from '../utils/timeEvaluation';
import { exportReportAsPdf, exportReportAsExcel, exportReportAsDoc } from '../utils/reportExport';
import { ChecklistAuditModal } from './ChecklistAuditModal';
import { generateChecklistAuditPdf } from '../utils/checklistPdfGenerator';

interface TaskRegisterViewProps {
  tasks: TaskItem[];
  staffList: StaffMember[];
  onEditTask?: (task: TaskItem) => void;
  onApproveTask?: (taskId: string) => void;
  onRejectTask?: (taskId: string, reason: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onBatchDeleteTasks?: (taskIds: string[]) => void;
  onBatchApproveTasks?: (taskIds: string[]) => void;
  onViewMedia?: (media: TaskMedia) => void;
  onClose?: () => void;
  isModalMode?: boolean;
}

export const TaskRegisterView: React.FC<TaskRegisterViewProps> = ({
  tasks,
  staffList,
  onEditTask,
  onApproveTask,
  onRejectTask,
  onDeleteTask,
  onBatchDeleteTasks,
  onBatchApproveTasks,
  onViewMedia,
  onClose,
  isModalMode = false,
}) => {
  const { isLightMode } = useTheme();
  const { currentUser, isAdmin } = useAuth();
  const isHemen = isHemenDas(currentUser);

  // Filter States
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateQuickFilter, setDateQuickFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<'all' | 'morning' | 'evening' | 'night' | 'breached'>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'completed_ontime' | 'breached' | 'pending' | 'rejected' | 'approved'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'priority' | 'status'>('date_desc');

  // Modern Register Layout Mode: Table or List
  const [registerLayout, setRegisterLayout] = useState<'table' | 'list'>('table');
  const [shareToastMsg, setShareToastMsg] = useState<string | null>(null);
  const [downloadingTaskId, setDownloadingTaskId] = useState<string | null>(null);

  // Bulk Selection & Deletion Management States
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = useState<boolean>(false);

  // Exact Read-Only Audit Mode Modal State
  const [auditModalData, setAuditModalData] = useState<{
    isOpen: boolean;
    checklistHeader: string;
    tasks: TaskItem[];
    submittedBy?: string;
    submittedAt?: string;
    department?: string;
  } | null>(null);

  // Rejection modal inside register
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Available unique months from task records
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-09"
    monthsSet.add(currentMonth);

    tasks.forEach((t) => {
      const dateStr = t.assignedAt || t.createdAt || t.completedAt || t.submittedAt;
      if (dateStr && dateStr.length >= 7) {
        monthsSet.add(dateStr.slice(0, 7));
      }
    });

    return Array.from(monthsSet).sort().reverse();
  }, [tasks]);

  // Handle Quick Date changes
  const handleQuickDate = (type: 'all' | 'today' | 'yesterday' | 'week' | 'month') => {
    setDateQuickFilter(type);
    const now = new Date();
    if (type === 'all') {
      setSelectedDate('');
    } else if (type === 'today') {
      setSelectedDate(now.toISOString().slice(0, 10));
    } else if (type === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      setSelectedDate(y.toISOString().slice(0, 10));
    } else if (type === 'month') {
      setSelectedMonth(now.toISOString().slice(0, 7));
      setSelectedDate('');
    } else {
      setSelectedDate('');
    }
  };

  // Filter and evaluate tasks
  const registeredEntries = useMemo(() => {
    return tasks.map((task) => {
      const timeStatus = evaluateTaskTimeStatus(task);
      const assignedDate = task.assignedAt || task.createdAt || task.submittedAt || new Date().toISOString();
      const dateOnly = assignedDate.slice(0, 10);
      const monthOnly = assignedDate.slice(0, 7);

      // Match staff
      const staff = staffList.find(
        (s) => s.id === task.assigneeId || (task.assignee && s.name.toLowerCase() === task.assignee.toLowerCase())
      );

      return {
        task,
        timeStatus,
        assignedDate,
        dateOnly,
        monthOnly,
        staff,
        isBreached: timeStatus.isOverdue || timeStatus.statusLabel.includes('Breach') || timeStatus.statusLabel.includes('Late'),
        completedOnTime: task.completed && !timeStatus.statusLabel.includes('Late'),
      };
    });
  }, [tasks, staffList]);

  // Filtered List
  const filteredEntries = useMemo(() => {
    return registeredEntries.filter((item) => {
      const { task, timeStatus, dateOnly, monthOnly, staff, isBreached } = item;

      // Month Filter
      if (selectedMonth !== 'all' && monthOnly !== selectedMonth) {
        return false;
      }

      // Exact Date Filter
      if (selectedDate && dateOnly !== selectedDate) {
        return false;
      }

      // Time Slot Filter
      if (selectedTimeSlot === 'breached' && !isBreached) {
        return false;
      }
      if (selectedTimeSlot === 'morning') {
        const header = (task.checklistHeader || '').toLowerCase();
        const start = (task.startTime || '').toLowerCase();
        if (!header.includes('opening') && !start.includes('am') && !header.includes('morning')) {
          return false;
        }
      }
      if (selectedTimeSlot === 'evening') {
        const header = (task.checklistHeader || '').toLowerCase();
        const start = (task.startTime || '').toLowerCase();
        if (!header.includes('closing') && !start.includes('pm') && !header.includes('evening')) {
          return false;
        }
      }
      if (selectedTimeSlot === 'night') {
        const header = (task.checklistHeader || '').toLowerCase();
        const time = (task.endTime || task.deadline || '').toLowerCase();
        if (!header.includes('closing') && !time.includes('10:') && !time.includes('11:') && !time.includes('12:')) {
          return false;
        }
      }

      // Department Filter
      if (selectedDepartment !== 'all' && task.department !== selectedDepartment) {
        return false;
      }

      // Staff Filter
      if (selectedStaffId !== 'all') {
        if (staff?.id !== selectedStaffId && task.assigneeId !== selectedStaffId && task.assignee !== selectedStaffId) {
          return false;
        }
      }

      // Status Filter
      if (selectedStatus === 'completed_ontime' && (!task.completed || isBreached)) return false;
      if (selectedStatus === 'breached' && !isBreached) return false;
      if (selectedStatus === 'pending' && task.completed) return false;
      if (selectedStatus === 'rejected' && task.approvalStatus !== 'rejected') return false;
      if (selectedStatus === 'approved' && task.approvalStatus !== 'approved') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDept = (task.department || '').toLowerCase().includes(q);
        const matchesStaff = (task.assignee || staff?.name || '').toLowerCase().includes(q);
        const matchesNotes = (task.notes || '').toLowerCase().includes(q);
        const matchesReason = (task.rejectionReason || '').toLowerCase().includes(q);
        const matchesHeader = (task.checklistHeader || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDept && !matchesStaff && !matchesNotes && !matchesReason && !matchesHeader) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'priority') {
        const pOrder = { urgent: 0, today: 1, pending: 2 };
        return (pOrder[a.task.priority] ?? 2) - (pOrder[b.task.priority] ?? 2);
      }
      if (sortBy === 'status') {
        if (a.task.completed === b.task.completed) return 0;
        return a.task.completed ? 1 : -1;
      }
      if (sortBy === 'date_asc') {
        return a.assignedDate.localeCompare(b.assignedDate);
      }
      return b.assignedDate.localeCompare(a.assignedDate);
    });
  }, [
    registeredEntries,
    selectedMonth,
    selectedDate,
    selectedTimeSlot,
    selectedDepartment,
    selectedStaffId,
    selectedStatus,
    searchQuery,
    sortBy,
  ]);

  // Key Register Metrics for filtered dataset
  const metrics = useMemo(() => {
    const total = filteredEntries.length;
    const completed = filteredEntries.filter((e) => e.task.completed).length;
    const breached = filteredEntries.filter((e) => e.isBreached).length;
    const pending = filteredEntries.filter((e) => !e.task.completed).length;
    const approved = filteredEntries.filter((e) => e.task.approvalStatus === 'approved').length;
    const rejected = filteredEntries.filter((e) => e.task.approvalStatus === 'rejected').length;
    const onTimeRate = total > 0 ? Math.round(((completed - breached) / total) * 100) : 0;

    return { total, completed, breached, pending, approved, rejected, onTimeRate: Math.max(0, onTimeRate) };
  }, [filteredEntries]);

  // Bulk Selection Computed States & Helpers
  const isAllSelected = useMemo(() => {
    return filteredEntries.length > 0 && filteredEntries.every((e) => selectedRecordIds.has(e.task.id));
  }, [filteredEntries, selectedRecordIds]);

  const isSomeSelected = useMemo(() => {
    return filteredEntries.some((e) => selectedRecordIds.has(e.task.id));
  }, [filteredEntries, selectedRecordIds]);

  const toggleSelectRecord = (id: string) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRecordIds(new Set());
    } else {
      const allIds = filteredEntries.map((e) => e.task.id).filter(Boolean);
      setSelectedRecordIds(new Set(allIds));
    }
  };

  const handleSingleDelete = (taskId: string) => {
    if (onDeleteTask) {
      onDeleteTask(taskId);
      setSelectedRecordIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      setShareToastMsg('✓ Record permanently deleted.');
      setTimeout(() => setShareToastMsg(null), 3500);
    }
    setConfirmDeleteId(null);
  };

  const handleExecuteBulkDelete = () => {
    const ids = Array.from(selectedRecordIds);
    if (ids.length === 0) return;

    if (onBatchDeleteTasks) {
      onBatchDeleteTasks(ids);
    } else if (onDeleteTask) {
      ids.forEach((id) => onDeleteTask(id));
    }

    setSelectedRecordIds(new Set());
    setIsConfirmingBulkDelete(false);
    setShareToastMsg(`✓ ${ids.length} records permanently deleted.`);
    setTimeout(() => setShareToastMsg(null), 3500);
  };

  const handleExecuteBulkApprove = () => {
    const ids = Array.from(selectedRecordIds);
    if (ids.length === 0) return;

    if (onBatchApproveTasks) {
      onBatchApproveTasks(ids);
    } else if (onApproveTask) {
      ids.forEach((id) => onApproveTask(id));
    }

    setSelectedRecordIds(new Set());
    setShareToastMsg(`✓ ${ids.length} records approved by Hemen Das.`);
    setTimeout(() => setShareToastMsg(null), 3500);
  };

  // Export handlers
  const handleExportPdf = () => {
    const exportTasks = filteredEntries.map((e) => e.task);
    exportReportAsPdf(exportTasks, {
      title: 'Amarii Café Official Task Register Ledger',
      reportType: 'detailed',
      isHemenDas: isHemen,
      notes: `Filtered by: Month (${selectedMonth}), Date (${selectedDate || 'All'}), Dept (${selectedDepartment}), Staff (${selectedStaffId})`,
    });
  };

  const handleExportExcel = () => {
    const exportTasks = filteredEntries.map((e) => e.task);
    exportReportAsExcel(exportTasks, {
      title: 'Amarii Café Master Task Register',
      reportType: 'detailed',
      isHemenDas: isHemen,
      notes: `Task Register Audit Export for ${selectedMonth}`,
    });
  };

  const handleExportDoc = () => {
    const exportTasks = filteredEntries.map((e) => e.task);
    exportReportAsDoc(exportTasks, {
      title: 'Amarii Café Task Register Official Audit',
      reportType: 'detailed',
      isHemenDas: isHemen,
      notes: `Official Register Ledger created for Hemen Das`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleViewForm = (entry: (typeof registeredEntries)[0]) => {
    const { task } = entry;
    const header = task.checklistHeader || (task.department ? `${task.department} Checklist` : 'General Operations');

    // 1. Gather all sibling tasks belonging to this submission batch
    let relatedTasks: TaskItem[] = [];
    const match = task.id?.match(/finalized-shift-(\d+)-/);
    if (match) {
      const timestampKey = match[1];
      relatedTasks = tasks.filter((t) => t.id?.includes(`finalized-shift-${timestampKey}-`));
    }

    // 2. If no timestamp match, gather tasks matching checklistHeader and submittedAt
    if (relatedTasks.length === 0 && task.submittedAt) {
      relatedTasks = tasks.filter(
        (t) =>
          (t.checklistHeader === header || t.department === task.department) &&
          t.submittedAt === task.submittedAt
      );
    }

    // 3. Fallback: gather all tasks sharing this checklist header
    if (relatedTasks.length === 0) {
      relatedTasks = tasks.filter((t) => t.checklistHeader === header);
    }

    // Ensure the clicked task is in the list
    if (!relatedTasks.some((t) => t.id === task.id)) {
      relatedTasks = [task, ...relatedTasks];
    }

    setAuditModalData({
      isOpen: true,
      checklistHeader: header,
      tasks: relatedTasks,
      submittedBy: task.submittedBy || task.assignee || entry.staff?.name || 'Staff Member',
      submittedAt: task.submittedAt || task.completedAt || entry.assignedDate,
      department: (task.department || 'General Operations') as string,
    });
  };

  const handleDownloadPdf = async (entry: (typeof registeredEntries)[0]) => {
    const { task } = entry;
    const header = task.checklistHeader || (task.department ? `${task.department} Checklist` : 'General Operations');

    setDownloadingTaskId(task.id);
    try {
      let relatedTasks: TaskItem[] = [];
      const match = task.id?.match(/finalized-shift-(\d+)-/);
      if (match) {
        const timestampKey = match[1];
        relatedTasks = tasks.filter((t) => t.id?.includes(`finalized-shift-${timestampKey}-`));
      }

      if (relatedTasks.length === 0 && task.submittedAt) {
        relatedTasks = tasks.filter(
          (t) =>
            (t.checklistHeader === header || t.department === task.department) &&
            t.submittedAt === task.submittedAt
        );
      }

      if (relatedTasks.length === 0) {
        relatedTasks = tasks.filter((t) => t.checklistHeader === header);
      }

      if (!relatedTasks.some((t) => t.id === task.id)) {
        relatedTasks = [task, ...relatedTasks];
      }

      const pdfResult = await generateChecklistAuditPdf({
        checklistHeader: header,
        department: (task.department || 'General Operations') as string,
        submittedBy: task.submittedBy || task.assignee || entry.staff?.name || 'Staff Member',
        submittedAt: task.submittedAt || task.completedAt || entry.assignedDate,
        tasks: relatedTasks,
      });

      pdfResult.download();
      setShareToastMsg(`✓ Downloaded ${pdfResult.filename}`);
      setTimeout(() => setShareToastMsg(null), 4000);
    } catch (err) {
      console.error('Checklist PDF download error:', err);
      setShareToastMsg('❌ Failed to generate PDF');
      setTimeout(() => setShareToastMsg(null), 4000);
    } finally {
      setDownloadingTaskId(null);
    }
  };

  return (
    <div
      id="task-register-master-container"
      className={`space-y-4 sm:space-y-6 ${
        isModalMode
          ? 'p-4 sm:p-6'
          : 'max-w-7xl mx-auto'
      }`}
    >
      {/* 1. Header Banner & Identity */}
      <div
        className={`p-4 sm:p-6 border-2 sm:border-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isLightMode
            ? 'bg-white border-zinc-950 text-zinc-950'
            : 'bg-zinc-950 border-zinc-700 text-white'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-zinc-950 text-white dark:bg-white dark:text-black font-black flex-shrink-0 shadow-md">
            <ClipboardList className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest bg-red-600 text-white px-2 py-0.5">
                👑 HEMEN DAS MASTER AUDIT
              </span>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider bg-zinc-800 text-amber-300 px-2 py-0.5 border border-amber-500/50">
                ऑल-टाइम टास्क रजिस्टर
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tight mt-1">
              Amarii Café Task Register & Audit Ledger
            </h1>
            <p
              className={`text-xs sm:text-sm font-semibold mt-0.5 ${
                isLightMode ? 'text-zinc-600' : 'text-zinc-400'
              }`}
            >
              Complete record of all tasks: Kis time pe diya gaya, Kisko diya gaya, Kisne diya, aur Unka kya hua (Status, Proofs, Approvals).
            </p>
          </div>
        </div>

        {/* 1-Click Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportPdf}
            className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-tight flex items-center gap-1.5 transition cursor-pointer shadow"
            title="Download Register as Professional PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.PDF Export</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-tight flex items-center gap-1.5 transition cursor-pointer shadow"
            title="Download Register as Excel Spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>.XLS Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportDoc}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-tight flex items-center gap-1.5 transition cursor-pointer shadow"
            title="Download Register as Word Document"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>.DOC Word</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className={`px-3 py-2 text-xs font-black uppercase tracking-tight flex items-center gap-1.5 transition cursor-pointer border ${
              isLightMode
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-400'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div
          className={`p-3 sm:p-4 border-2 shadow-xs ${
            isLightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-800'
          }`}
        >
          <span className="text-[10px] font-black uppercase text-zinc-500 block">Total In Register</span>
          <span className="text-2xl sm:text-3xl font-black">{metrics.total}</span>
        </div>

        <div
          className={`p-3 sm:p-4 border-2 shadow-xs ${
            isLightMode ? 'bg-emerald-50 border-emerald-400 text-emerald-950' : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
          }`}
        >
          <span className="text-[10px] font-black uppercase block">Completed Tasks</span>
          <span className="text-2xl sm:text-3xl font-black">{metrics.completed}</span>
        </div>

        <div
          className={`p-3 sm:p-4 border-2 shadow-xs ${
            isLightMode ? 'bg-red-50 border-red-400 text-red-950' : 'bg-red-950/60 border-red-700 text-red-300'
          }`}
        >
          <span className="text-[10px] font-black uppercase block flex items-center gap-1">
            <Flame className="w-3 h-3 text-red-500" />
            Time Breached (Overdue)
          </span>
          <span className="text-2xl sm:text-3xl font-black">{metrics.breached}</span>
        </div>

        <div
          className={`p-3 sm:p-4 border-2 shadow-xs ${
            isLightMode ? 'bg-amber-50 border-amber-400 text-amber-950' : 'bg-amber-950/40 border-amber-800 text-amber-300'
          }`}
        >
          <span className="text-[10px] font-black uppercase block">Pending / Active</span>
          <span className="text-2xl sm:text-3xl font-black">{metrics.pending}</span>
        </div>

        <div
          className={`p-3 sm:p-4 border-2 shadow-xs ${
            isLightMode ? 'bg-blue-50 border-blue-400 text-blue-950' : 'bg-blue-950/40 border-blue-800 text-blue-300'
          }`}
        >
          <span className="text-[10px] font-black uppercase block">Approved by Hemen</span>
          <span className="text-2xl sm:text-3xl font-black">{metrics.approved}</span>
        </div>

        <div
          className={`p-3 sm:p-4 border-2 shadow-xs ${
            isLightMode ? 'bg-zinc-100 border-zinc-400 text-zinc-900' : 'bg-zinc-800 border-zinc-700 text-white'
          }`}
        >
          <span className="text-[10px] font-black uppercase block">On-Time SLA Rate</span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-500">{metrics.onTimeRate}%</span>
        </div>
      </div>

      {/* 3. Comprehensive Multi-Dimension Filters (Month, Date, Time Window, Department, Staff, Status) */}
      <div
        className={`p-4 sm:p-5 border-2 shadow-md space-y-4 ${
          isLightMode ? 'bg-zinc-50 border-zinc-300 text-zinc-950' : 'bg-zinc-900/90 border-zinc-800 text-white'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-red-500 stroke-[2.5]" />
            <h3 className="text-sm font-black uppercase tracking-wider">Register Search & Multi-Level Filters</h3>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-black uppercase text-zinc-400">Quick Date:</span>
            {(['all', 'today', 'yesterday', 'month'] as const).map((qf) => (
              <button
                key={qf}
                type="button"
                onClick={() => handleQuickDate(qf)}
                className={`px-2.5 py-1 text-[11px] font-black uppercase border transition cursor-pointer ${
                  dateQuickFilter === qf
                    ? 'bg-red-600 text-white border-red-600'
                    : isLightMode
                    ? 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                }`}
              >
                {qf === 'all' ? 'All Time' : qf === 'today' ? 'Today' : qf === 'yesterday' ? 'Yesterday' : 'This Month'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Month Filter */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
              📅 Month / Year
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setDateQuickFilter('all');
              }}
              className={`w-full px-2.5 py-2 text-xs font-bold border rounded-none uppercase transition cursor-pointer ${
                isLightMode
                  ? 'bg-white border-zinc-300 text-zinc-900 focus:border-black'
                  : 'bg-zinc-800 border-zinc-700 text-white focus:border-white'
              }`}
            >
              <option value="all">All Months</option>
              {availableMonths.map((m) => {
                const [year, month] = m.split('-');
                const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                });
                return (
                  <option key={m} value={m}>
                    {monthName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. Specific Date Selector */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
              🗓️ Specific Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setDateQuickFilter('all');
              }}
              className={`w-full px-2.5 py-1.5 text-xs font-bold border rounded-none uppercase transition ${
                isLightMode
                  ? 'bg-white border-zinc-300 text-zinc-900'
                  : 'bg-zinc-800 border-zinc-700 text-white'
              }`}
            />
          </div>

          {/* 3. Time Window / Shift */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
              ⏰ Time Window / Shift
            </label>
            <select
              value={selectedTimeSlot}
              onChange={(e) => setSelectedTimeSlot(e.target.value as any)}
              className={`w-full px-2.5 py-2 text-xs font-bold border rounded-none uppercase transition cursor-pointer ${
                isLightMode
                  ? 'bg-white border-zinc-300 text-zinc-900'
                  : 'bg-zinc-800 border-zinc-700 text-white'
              }`}
            >
              <option value="all">All Shifts & Times</option>
              <option value="morning">Morning Shift (08:00 AM – 04:00 PM)</option>
              <option value="evening">Evening Shift (04:00 PM – 11:30 PM)</option>
              <option value="night">Night Closing (10:00 PM – 12:00 AM)</option>
              <option value="breached">🚨 Time Breached Only</option>
            </select>
          </div>

          {/* 4. Department */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
              🏢 Department / Station
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className={`w-full px-2.5 py-2 text-xs font-bold border rounded-none uppercase transition cursor-pointer ${
                isLightMode
                  ? 'bg-white border-zinc-300 text-zinc-900'
                  : 'bg-zinc-800 border-zinc-700 text-white'
              }`}
            >
              <option value="all">All Departments</option>
              <option value="Kitchen">Kitchen</option>
              <option value="Bar">Bar</option>
              <option value="Housekeeping">Housekeeping</option>
              <option value="Service">Service</option>
              <option value="Billing">Billing</option>
              <option value="Management">Management</option>
            </select>
          </div>

          {/* 5. Assigned Staff */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
              👤 Assigned Staff (Kisko Diya)
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className={`w-full px-2.5 py-2 text-xs font-bold border rounded-none uppercase transition cursor-pointer ${
                isLightMode
                  ? 'bg-white border-zinc-300 text-zinc-900'
                  : 'bg-zinc-800 border-zinc-700 text-white'
              }`}
            >
              <option value="all">All Staff Members</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.department})
                </option>
              ))}
            </select>
          </div>

          {/* 6. Status */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
              📌 Status (Unka Kya Hua)
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className={`w-full px-2.5 py-2 text-xs font-bold border rounded-none uppercase transition cursor-pointer ${
                isLightMode
                  ? 'bg-white border-zinc-300 text-zinc-900'
                  : 'bg-zinc-800 border-zinc-700 text-white'
              }`}
            >
              <option value="all">All Statuses</option>
              <option value="completed_ontime">✅ Completed On-Time</option>
              <option value="breached">🚨 Time Breached / Late</option>
              <option value="pending">⏳ Pending / In-Progress</option>
              <option value="approved">🛡️ Approved by Hemen Das</option>
              <option value="rejected">❌ Rejected</option>
            </select>
          </div>
        </div>

        {/* Search Bar & Sorting */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by task title, staff name, notes, rejection reasons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 text-xs font-medium border rounded-none transition ${
                isLightMode
                  ? 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
                  : 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500'
              }`}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-zinc-400 whitespace-nowrap">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`px-3 py-2 text-xs font-bold border rounded-none uppercase transition cursor-pointer ${
                isLightMode
                  ? 'bg-white border-zinc-300 text-zinc-900'
                  : 'bg-zinc-800 border-zinc-700 text-white'
              }`}
            >
              <option value="date_desc">Latest Assigned First</option>
              <option value="date_asc">Oldest First</option>
              <option value="priority">Priority (Urgent First)</option>
              <option value="status">Status (Pending First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Task Register Ledger Table & Cards */}
      <div
        className={`rounded-lg border shadow-xl overflow-hidden ${
          isLightMode ? 'bg-white border-zinc-200' : 'bg-[#1a231e] border-zinc-800'
        }`}
      >
        {/* Ledger Header with Table / Cards View Switcher */}
        <div className="p-3 sm:p-4 bg-zinc-950 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#673ab7] stroke-[2.5]" />
            <div>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider block">
                Master Task Register ({filteredEntries.length} Records Found)
              </span>
              <span className="text-[10px] text-zinc-400">
                Official Operational Audit Register • Permanent Log
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* View Mode Toggle: Modern Table vs Modern Cards */}
            <div className="flex items-center bg-zinc-900 border border-zinc-700 p-0.5 rounded-md">
              <button
                type="button"
                id="register-view-mode-table"
                onClick={() => setRegisterLayout('table')}
                className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition cursor-pointer ${
                  registerLayout === 'table'
                    ? 'bg-[#673ab7] text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table Layout</span>
              </button>
              <button
                type="button"
                id="register-view-mode-list"
                onClick={() => setRegisterLayout('list')}
                className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition cursor-pointer ${
                  registerLayout === 'list'
                    ? 'bg-[#673ab7] text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards Layout</span>
              </button>
            </div>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-base sm:text-lg font-black uppercase text-zinc-900 dark:text-zinc-100">
              No Register Entries Match Your Filters
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Try adjusting the month, date, time slot, or department filters to view more tasks.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedMonth('all');
                setSelectedDate('');
                setSelectedTimeSlot('all');
                setSelectedDepartment('all');
                setSelectedStaffId('all');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-[#673ab7] text-white text-xs font-bold uppercase tracking-tight hover:bg-[#58309e] transition cursor-pointer mt-2 rounded"
            >
              Reset All Filters
            </button>
          </div>
        ) : registerLayout === 'table' ? (
          /* ======================================================== */
          /* 1. MODERN TABLE LAYOUT WITH STICKY HEADERS */
          /* ======================================================== */
          <div className="overflow-x-auto overflow-y-auto max-h-[68vh] sm:max-h-[75vh] relative rounded-b border border-zinc-200 dark:border-zinc-800 shadow-inner">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-20 shadow-xs">
                <tr
                  className={`border-b-2 text-[11px] font-black uppercase tracking-wider ${
                    isLightMode
                      ? 'bg-zinc-100 text-zinc-800 border-zinc-300'
                      : 'bg-zinc-900 text-zinc-200 border-zinc-700'
                  }`}
                >
                  <th className={`sticky top-0 z-20 py-3 px-3 sm:px-4 w-10 text-center ${isLightMode ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
                    <input
                      type="checkbox"
                      aria-label="Select all records"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-zinc-400 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                    />
                  </th>
                  <th className={`sticky top-0 z-20 py-3 px-3 sm:px-4 ${isLightMode ? 'bg-zinc-100' : 'bg-zinc-900'}`}>Date & Time</th>
                  <th className={`sticky top-0 z-20 py-3 px-3 sm:px-4 ${isLightMode ? 'bg-zinc-100' : 'bg-zinc-900'}`}>Checklist & Question</th>
                  <th className={`sticky top-0 z-20 py-3 px-3 sm:px-4 ${isLightMode ? 'bg-zinc-100' : 'bg-zinc-900'}`}>Staff Name</th>
                  <th className={`sticky top-0 z-20 py-3 px-3 sm:px-4 ${isLightMode ? 'bg-zinc-100' : 'bg-zinc-900'}`}>Status & Outcome</th>
                  <th className={`sticky top-0 z-20 py-3 px-3 sm:px-4 text-right ${isLightMode ? 'bg-zinc-100' : 'bg-zinc-900'}`}>Audit Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                {filteredEntries.map((entry, idx) => {
                  const { task, timeStatus, assignedDate, staff, isBreached } = entry;
                  const checklistTitle =
                    task.checklistHeader ||
                    (task.department ? `${task.department} Checklist` : 'General Operations');
                  const staffDisplay =
                    task.submittedBy || task.assignee || staff?.name || 'Shift Staff';
                  const designation = staff?.designation || task.assigneeDesignation;

                  const dateStr = new Date(assignedDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  const timeStr = new Date(assignedDate).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });

                  const isSelected = selectedRecordIds.has(task.id);

                  return (
                    <tr
                      key={`register-row-${task.id || 'no-id'}-${idx}`}
                      className={`transition-colors duration-150 ${
                        isSelected
                          ? isLightMode
                            ? 'bg-red-50/70'
                            : 'bg-red-950/40'
                          : isLightMode
                          ? 'hover:bg-purple-50/40 text-zinc-900'
                          : 'hover:bg-purple-950/20 text-zinc-100'
                      } ${
                        isBreached && !task.completed
                          ? 'bg-red-500/5'
                          : task.completed
                          ? 'bg-emerald-500/5'
                          : ''
                      }`}
                    >
                      {/* 0. Selection Checkbox Column */}
                      <td className="py-3 px-3 sm:px-4 align-top text-center w-10">
                        <input
                          type="checkbox"
                          aria-label={`Select record ${task.title}`}
                          checked={isSelected}
                          onChange={() => toggleSelectRecord(task.id)}
                          className="w-4 h-4 rounded border-zinc-400 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                        />
                      </td>

                      {/* 1. Date & Time */}
                      <td className="py-3 px-3 sm:px-4 align-top whitespace-nowrap">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{dateStr}</div>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                          <Clock className="w-3 h-3 text-[#673ab7] shrink-0" />
                          <span>{timeStr}</span>
                        </div>
                      </td>

                      {/* 2. Checklist Name & Task Title */}
                      <td className="py-3 px-3 sm:px-4 align-top max-w-[280px] sm:max-w-md">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="font-black text-[10px] uppercase px-2 py-0.5 rounded bg-purple-100 text-[#673ab7] dark:bg-purple-950/80 dark:text-purple-300 font-mono border border-purple-200 dark:border-purple-800">
                            {checklistTitle}
                          </span>
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                            {task.department || 'General'}
                          </span>
                          {task.priority === 'urgent' && (
                            <span className="text-[9px] font-black uppercase px-1 py-0.2 bg-red-600 text-white rounded">
                              Urgent
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-xs sm:text-[13px] leading-tight text-zinc-950 dark:text-white">
                          {task.title}
                        </p>
                        {task.notes && (
                          <p className="text-[11px] italic text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">
                            Note: "{task.notes}"
                          </p>
                        )}
                      </td>

                      {/* 3. Staff Name */}
                      <td className="py-3 px-3 sm:px-4 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[#673ab7] dark:text-purple-400 shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 block">
                              {staffDisplay}
                            </span>
                            {designation && (
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">
                                {designation}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Status & Outcome */}
                      <td className="py-3 px-3 sm:px-4 align-top whitespace-nowrap">
                        <div className="space-y-1">
                          {task.completed ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold ${
                                isBreached
                                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                              <span>{isBreached ? 'Completed Late' : 'Completed On-Time'}</span>
                            </span>
                          ) : isBreached ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-black uppercase bg-red-600 text-white animate-pulse">
                              <AlertTriangle className="w-3 h-3 stroke-[3]" />
                              <span>Time Breached</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <Clock className="w-3 h-3" />
                              <span>Pending Response</span>
                            </span>
                          )}

                          {/* Media Proof Preview Chips */}
                          {task.media && task.media.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-zinc-500 pt-0.5">
                              <Camera className="w-3 h-3 text-emerald-500" />
                              <span>{task.media.length} proof attached</span>
                            </div>
                          )}

                          {/* Approval Status */}
                          {task.approvalStatus === 'approved' && (
                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Approved</span>
                            </div>
                          )}
                          {task.approvalStatus === 'rejected' && (
                            <div className="text-[10px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              <span>Rejected</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. Prominent 'View Form' & Dedicated [PDF] Download Buttons */}
                      <td className="py-3 px-3 sm:px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Small Red [PDF] Download Badge/Button */}
                          <button
                            type="button"
                            id={`table-pdf-btn-${task.id}`}
                            onClick={() => handleDownloadPdf(entry)}
                            disabled={downloadingTaskId === task.id}
                            className={`px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black uppercase tracking-wider rounded shadow-xs flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0 ${
                              downloadingTaskId === task.id ? 'opacity-75 cursor-wait' : ''
                            }`}
                            title="Directly download official submitted audit PDF"
                          >
                            {downloadingTaskId === task.id ? (
                              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                            ) : (
                              <Download className="w-3 h-3 stroke-[2.5] shrink-0" />
                            )}
                            <span>PDF</span>
                          </button>

                          {/* Prominent View Form Button */}
                          <button
                            type="button"
                            id={`view-form-btn-${task.id}`}
                            onClick={() => handleViewForm(entry)}
                            className="px-3 py-1.5 bg-[#673ab7] hover:bg-[#58309e] text-white text-xs font-bold rounded-md shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
                            title="Open exact submitted Google Form read-only audit view"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Form</span>
                          </button>

                          {/* Individual Delete Option (Trash Icon) */}
                          {onDeleteTask && (
                            <button
                              type="button"
                              id={`table-del-btn-${task.id}`}
                              onClick={() => setConfirmDeleteId(task.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded transition cursor-pointer"
                              title="Permanently delete this record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Admin Quick Governance */}
                          {isAdmin && (
                            <>
                              {task.approvalStatus !== 'approved' && onApproveTask && (
                                <button
                                  type="button"
                                  onClick={() => onApproveTask(task.id)}
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer transition"
                                  title="Approve Task"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </button>
                              )}
                              {task.approvalStatus !== 'rejected' && onRejectTask && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingTaskId(task.id);
                                    setRejectionReason('');
                                  }}
                                  className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded cursor-pointer transition"
                                  title="Reject Task"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ======================================================== */
          /* 2. MODERN LIST / CARDS LAYOUT */
          /* ======================================================== */
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredEntries.map((entry, idx) => {
              const { task, timeStatus, assignedDate, staff, isBreached } = entry;
              const checklistTitle =
                task.checklistHeader ||
                (task.department ? `${task.department} Checklist` : 'General Operations');
              const staffDisplay =
                task.submittedBy || task.assignee || staff?.name || 'Shift Staff';
              const designation = staff?.designation || task.assigneeDesignation;

              const dateStr = new Date(assignedDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const timeStr = new Date(assignedDate).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              });

              const isSelected = selectedRecordIds.has(task.id);

              return (
                <div
                  key={`register-card-${task.id || 'no-id'}-${idx}`}
                  className={`p-4 sm:p-5 transition ${
                    isSelected
                      ? isLightMode
                        ? 'bg-red-50/70 border-l-4 border-l-red-600'
                        : 'bg-red-950/40 border-l-4 border-l-red-600'
                      : isBreached && !task.completed
                      ? 'border-l-4 border-l-red-600 bg-red-950/5 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                      : task.completed
                      ? 'border-l-4 border-l-emerald-600 bg-emerald-950/5 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                      : 'border-l-4 border-l-purple-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left Column: Details */}
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Top Badges Row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Top-Left Selection Checkbox */}
                        <input
                          type="checkbox"
                          aria-label={`Select record ${task.title}`}
                          checked={isSelected}
                          onChange={() => toggleSelectRecord(task.id)}
                          className="w-4 h-4 rounded border-zinc-400 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600 shrink-0"
                        />

                        <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>

                        {/* Checklist Name */}
                        <span className="text-[11px] font-bold uppercase px-2 py-0.5 bg-purple-100 text-[#673ab7] dark:bg-purple-950/80 dark:text-purple-300 rounded font-mono border border-purple-200 dark:border-purple-800">
                          {checklistTitle}
                        </span>

                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                          {task.department || 'General'}
                        </span>

                        {task.priority === 'urgent' && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-red-600 text-white rounded flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 stroke-[3]" />
                            URGENT
                          </span>
                        )}
                      </div>

                      {/* Question / Task Title */}
                      <h4 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white uppercase tracking-tight">
                        {task.title}
                      </h4>

                      {/* Key Details Grid: Date, Staff, Status */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                        {/* 1. Date */}
                        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span>
                            <strong>Date:</strong> {dateStr} at {timeStr}
                          </span>
                        </div>

                        {/* 2. Staff Name */}
                        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                          <User className="w-3.5 h-3.5 text-[#673ab7] shrink-0" />
                          <span>
                            <strong>Staff:</strong>{' '}
                            <span className="font-bold text-zinc-900 dark:text-white">
                              {staffDisplay}
                            </span>
                            {designation ? ` (${designation})` : ''}
                          </span>
                        </div>

                        {/* 3. Status */}
                        <div className="flex items-center gap-1.5">
                          {task.completed ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isBreached ? 'Completed Late' : 'Completed On-Time'}</span>
                            </span>
                          ) : isBreached ? (
                            <span className="font-bold text-red-600 flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Time Breached</span>
                            </span>
                          ) : (
                            <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pending</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Notes if any */}
                      {task.notes && (
                        <p className="text-xs bg-zinc-100 dark:bg-zinc-900 p-2 border-l-2 border-zinc-400 dark:border-zinc-700 italic rounded-r">
                          "{task.notes}"
                        </p>
                      )}
                    </div>

                    {/* Right Column: Prominent 'View Form' & [PDF] Buttons & Admin Actions */}
                    <div className="flex items-center lg:items-end justify-between lg:justify-end gap-2 shrink-0">
                      {/* Small Red [PDF] Download Badge/Button */}
                      <button
                        type="button"
                        id={`card-pdf-btn-${task.id}`}
                        onClick={() => handleDownloadPdf(entry)}
                        disabled={downloadingTaskId === task.id}
                        className={`px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-md shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                          downloadingTaskId === task.id ? 'opacity-75 cursor-wait' : ''
                        }`}
                        title="Directly download official submitted audit PDF"
                      >
                        {downloadingTaskId === task.id ? (
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        ) : (
                          <Download className="w-4 h-4 stroke-[2.5] shrink-0" />
                        )}
                        <span>PDF</span>
                      </button>

                      {/* Prominent View Form Button */}
                      <button
                        type="button"
                        id={`card-view-form-btn-${task.id}`}
                        onClick={() => handleViewForm(entry)}
                        className="px-4 py-2 bg-[#673ab7] hover:bg-[#58309e] text-white text-xs font-bold rounded-md shadow-xs flex items-center gap-2 transition active:scale-95 cursor-pointer"
                        title="Open exact submitted Google Form read-only audit view"
                      >
                        <FileText className="w-4 h-4" />
                        <span>View Form</span>
                      </button>

                      {/* Individual Delete Option (Trash Icon) */}
                      {onDeleteTask && (
                        <button
                          type="button"
                          id={`card-del-btn-${task.id}`}
                          onClick={() => setConfirmDeleteId(task.id)}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded transition cursor-pointer"
                          title="Permanently delete this record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {isAdmin && (
                        <div className="flex items-center gap-1.5">
                          {task.approvalStatus !== 'approved' && onApproveTask && (
                            <button
                              type="button"
                              onClick={() => onApproveTask(task.id)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center gap-1 transition cursor-pointer"
                              title="Approve Task"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Approve</span>
                            </button>
                          )}
                          {task.approvalStatus !== 'rejected' && onRejectTask && (
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingTaskId(task.id);
                                setRejectionReason('');
                              }}
                              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded flex items-center gap-1 transition cursor-pointer"
                              title="Reject Task"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Floating Bulk Actions Bar (Z-Index 50) */}
      <AnimatePresence>
        {selectedRecordIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-xl bg-zinc-950 text-white p-3 sm:p-4 rounded-xl shadow-2xl border-2 border-red-600 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                {selectedRecordIds.size}
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-tight">
                  {selectedRecordIds.size} {selectedRecordIds.size === 1 ? 'Record' : 'Records'} Selected
                </div>
                <div className="text-[10px] text-zinc-400 hidden sm:block">
                  Bulk governance or permanent removal
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Bulk Approve (Green) */}
              <button
                type="button"
                id="bulk-approve-action-btn"
                onClick={handleExecuteBulkApprove}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow"
                title="Approve all selected records as Hemen Das"
              >
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">Bulk Approve</span>
                <span className="sm:hidden">Approve</span>
              </button>

              {/* Bulk Delete (Red) */}
              <button
                type="button"
                id="bulk-delete-action-btn"
                onClick={() => setIsConfirmingBulkDelete(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow"
                title="Permanently delete all selected records"
              >
                <Trash2 className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">Bulk Delete</span>
                <span className="sm:hidden">Delete</span>
              </button>

              {/* Clear Selection ('X') */}
              <button
                type="button"
                id="bulk-clear-selection-btn"
                onClick={() => setSelectedRecordIds(new Set())}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition cursor-pointer"
                title="Clear Selection"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Individual Record Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md p-6 border-4 border-red-600 shadow-2xl space-y-4 rounded-lg ${
              isLightMode ? 'bg-white text-zinc-900' : 'bg-zinc-950 text-white'
            }`}
          >
            <div className="flex items-center gap-2.5 text-red-600">
              <Trash2 className="w-6 h-6 stroke-[2.5]" />
              <h3 className="text-base font-black uppercase tracking-tight">Delete Audit Record?</h3>
            </div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Are you sure you want to permanently delete this audit record from the register and Firebase? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSingleDelete(confirmDeleteId)}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white rounded shadow transition cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Strict Confirmation Dialog */}
      {isConfirmingBulkDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md p-6 border-4 border-red-600 shadow-2xl space-y-4 rounded-lg ${
              isLightMode ? 'bg-white text-zinc-900' : 'bg-zinc-950 text-white'
            }`}
          >
            <div className="flex items-center gap-2.5 text-red-600">
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              <h3 className="text-base font-black uppercase tracking-tight">Confirm Bulk Deletion</h3>
            </div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Are you sure you want to permanently delete <strong>{selectedRecordIds.size} selected audit records</strong> from the register and Firebase Cloud Database? This action is irreversible.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingBulkDelete(false)}
                className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkDelete}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white rounded shadow transition cursor-pointer"
              >
                Yes, Permanently Delete {selectedRecordIds.size} Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exact Read-Only Audit Mode Modal */}
      {auditModalData && (
        <ChecklistAuditModal
          isOpen={auditModalData.isOpen}
          onClose={() => setAuditModalData(null)}
          checklistHeader={auditModalData.checklistHeader}
          tasks={auditModalData.tasks}
          submittedBy={auditModalData.submittedBy}
          submittedAt={auditModalData.submittedAt}
          department={auditModalData.department}
          onViewMedia={onViewMedia}
          onShareFeedback={(msg) => {
            setShareToastMsg(msg);
            setTimeout(() => setShareToastMsg(null), 4000);
          }}
        />
      )}

      {/* Share Toast Notification */}
      {shareToastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          <span>{shareToastMsg}</span>
        </div>
      )}

      {/* Rejection Prompt Dialog */}
      {rejectingTaskId && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md p-5 border-4 border-red-600 shadow-2xl space-y-4 ${
              isLightMode ? 'bg-white text-black' : 'bg-zinc-950 text-white'
            }`}
          >
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              <h3 className="text-base font-black uppercase">Reject Task with Reason</h3>
            </div>
            <p className="text-xs text-zinc-400">
              Enter the specific reason for rejecting this task submission (e.g. Blurry photo, Incomplete station cleanup, Wrong time):
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Photo is too dark, please turn on lights and capture full prep counter..."
              className={`w-full p-2.5 text-xs font-medium border rounded-none ${
                isLightMode ? 'bg-zinc-100 border-zinc-400' : 'bg-zinc-900 border-zinc-700 text-white'
              }`}
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingTaskId(null);
                  setRejectionReason('');
                }}
                className="px-3 py-1.5 text-xs font-bold uppercase bg-zinc-700 text-white hover:bg-zinc-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onRejectTask && rejectingTaskId) {
                    onRejectTask(rejectingTaskId, rejectionReason.trim() || 'Verification failed quality check');
                  }
                  setRejectingTaskId(null);
                  setRejectionReason('');
                }}
                className="px-4 py-1.5 text-xs font-black uppercase bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
