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
} from 'lucide-react';
import { TaskItem, StaffMember, TaskDepartment, TaskMedia } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth, isHemenDas } from '../context/AuthContext';
import { evaluateTaskTimeStatus } from '../utils/timeEvaluation';
import { exportReportAsPdf, exportReportAsExcel, exportReportAsDoc } from '../utils/reportExport';

interface TaskRegisterViewProps {
  tasks: TaskItem[];
  staffList: StaffMember[];
  onEditTask?: (task: TaskItem) => void;
  onApproveTask?: (taskId: string) => void;
  onRejectTask?: (taskId: string, reason: string) => void;
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
        className={`border-2 sm:border-4 shadow-xl overflow-hidden ${
          isLightMode ? 'bg-white border-zinc-950' : 'bg-zinc-950 border-zinc-800'
        }`}
      >
        <div className="p-3 sm:p-4 bg-zinc-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-red-500 stroke-[2.5]" />
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider">
              Register Entries ({filteredEntries.length} Records Found)
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase text-zinc-400">
            Auto-saved in Firestore
          </span>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-base sm:text-lg font-black uppercase">No Register Entries Match Your Filters</h3>
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
              className="px-4 py-2 bg-zinc-900 text-white text-xs font-black uppercase tracking-tight hover:bg-black transition cursor-pointer mt-2"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredEntries.map((entry, idx) => {
              const { task, timeStatus, assignedDate, staff, isBreached } = entry;
              const hasPhotos = task.media && task.media.some((m) => m.type === 'photo');
              const hasVideos = task.media && task.media.some((m) => m.type === 'video');

              return (
                <div
                  key={task.id}
                  className={`p-4 sm:p-5 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60 ${
                    isBreached && !task.completed
                      ? 'bg-red-950/10 border-l-4 border-l-red-600'
                      : task.completed
                      ? 'bg-emerald-950/5'
                      : ''
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left Column: Index, Task Title, Assigned To & Given By, Time window */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-[10px] font-mono font-black text-zinc-400 bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5">
                          #{idx + 1}
                        </span>

                        {/* Department Badge */}
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-200">
                          {task.department || 'General'}
                        </span>

                        {/* Checklist Header */}
                        {task.checklistHeader && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                            {task.checklistHeader}
                          </span>
                        )}

                        {/* Priority */}
                        {task.priority === 'urgent' && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-red-600 text-white flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 stroke-[3]" />
                            URGENT
                          </span>
                        )}

                        {/* Mention Time Badge */}
                        <span
                          className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 border flex items-center gap-1 ${
                            isBreached && !task.completed
                              ? 'bg-red-600 text-white border-red-600 animate-pulse'
                              : isLightMode
                              ? 'bg-zinc-100 text-zinc-900 border-zinc-300'
                              : 'bg-zinc-800 text-zinc-200 border-zinc-700'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>Mention Time: {timeStatus.timeDisplay}</span>
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm sm:text-base font-black uppercase tracking-tight text-zinc-950 dark:text-white">
                        {task.title}
                      </h4>

                      {/* Audit Details: Kab Diya, Kisko Diya, Kisne Diya */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                        {/* 1. Kab Diya (Assigned Time) */}
                        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span>
                            <strong>Kab Diya:</strong>{' '}
                            {new Date(assignedDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            at{' '}
                            {new Date(assignedDate).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* 2. Kisko Diya (Assignee) */}
                        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                          <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>
                            <strong>Kisko Diya:</strong>{' '}
                            <span className="font-bold text-zinc-900 dark:text-white">
                              {task.assignee || staff?.name || 'Department Shift Staff'}
                            </span>
                            {staff?.designation ? ` (${staff.designation})` : ''}
                          </span>
                        </div>

                        {/* 3. Kisne Diya (Assigner) */}
                        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>
                            <strong>Kisne Diya:</strong>{' '}
                            <span className="font-bold text-zinc-900 dark:text-white">
                              {task.assignedBy || 'Hemen Das (Owner & GM)'}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Notes / Rejection reasons */}
                      {task.notes && (
                        <p className="text-xs bg-zinc-100 dark:bg-zinc-900 p-2 border-l-2 border-zinc-400 dark:border-zinc-700 italic">
                          "{task.notes}"
                        </p>
                      )}
                      {task.rejectionReason && (
                        <p className="text-xs bg-red-950/80 text-red-200 p-2 border-l-2 border-red-500 font-bold">
                          ❌ Rejection Reason: "{task.rejectionReason}"
                        </p>
                      )}
                    </div>

                    {/* Right Column: "Unka Kya Hua" (Status, Proofs, Action Buttons) */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 flex-shrink-0">
                      {/* Status Badges */}
                      <div className="space-y-1 text-left lg:text-right">
                        <span className="text-[10px] font-black uppercase text-zinc-400 block">
                          Unka Kya Hua (Outcome):
                        </span>
                        {task.completed ? (
                          <div className="space-y-0.5">
                            <span
                              className={`px-2.5 py-1 text-xs font-black uppercase flex items-center gap-1.5 ${
                                isBreached
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {isBreached ? 'Completed Late (Breached)' : 'Completed On-Time'}
                            </span>
                            {task.completedAt && (
                              <span className="text-[10px] font-mono text-zinc-500 block">
                                Done: {new Date(task.completedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} by {task.submittedBy || 'Staff'}
                              </span>
                            )}
                          </div>
                        ) : isBreached ? (
                          <span className="px-2.5 py-1 text-xs font-black uppercase bg-red-600 text-white flex items-center gap-1.5 animate-pulse shadow">
                            <AlertTriangle className="w-3.5 h-3.5 stroke-[3]" />
                            🚨 TIME BREACH (SLA Missed)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-black uppercase bg-zinc-800 text-amber-400 border border-amber-500/50 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            ⏳ Pending / In Progress
                          </span>
                        )}

                        {/* Approval Status */}
                        {task.approvalStatus === 'approved' && (
                          <span className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-1 lg:justify-end">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Approved by Hemen Das
                          </span>
                        )}
                        {task.approvalStatus === 'rejected' && (
                          <span className="text-[10px] font-black uppercase text-red-500 flex items-center gap-1 lg:justify-end">
                            <XCircle className="w-3.5 h-3.5" />
                            Rejected by Hemen Das
                          </span>
                        )}
                      </div>

                      {/* Media Proof Preview Thumbnails */}
                      {task.media && task.media.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {task.media.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => onViewMedia && onViewMedia(m)}
                              className="relative w-9 h-9 border border-zinc-600 overflow-hidden hover:opacity-80 transition cursor-pointer"
                              title={`View attached ${m.type} proof`}
                            >
                              {m.type === 'photo' ? (
                                <img src={m.url} alt="Proof" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-white">
                                  <Video className="w-4 h-4" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Admin Quick Approval / Rejection buttons for Hemen Das */}
                      {isAdmin && (
                        <div className="flex items-center gap-1.5 pt-1">
                          {task.approvalStatus !== 'approved' && onApproveTask && (
                            <button
                              type="button"
                              onClick={() => onApproveTask(task.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-tight flex items-center gap-1 transition cursor-pointer"
                              title="Officially Approve Task"
                            >
                              <Check className="w-3 h-3" />
                              Approve
                            </button>
                          )}
                          {task.approvalStatus !== 'rejected' && onRejectTask && (
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingTaskId(task.id);
                                setRejectionReason('');
                              }}
                              className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-tight flex items-center gap-1 transition cursor-pointer"
                              title="Reject Task"
                            >
                              <XCircle className="w-3 h-3" />
                              Reject
                            </button>
                          )}
                          {onEditTask && (
                            <button
                              type="button"
                              onClick={() => onEditTask(task)}
                              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-tight transition cursor-pointer"
                            >
                              Edit
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
