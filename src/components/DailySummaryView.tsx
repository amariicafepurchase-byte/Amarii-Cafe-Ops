import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  TrendingUp,
  Building2,
  Calendar,
  Zap,
  ShieldCheck,
  Search,
  Filter,
  FileDown,
  Utensils,
  Coffee,
  Sparkles,
  ConciergeBell,
  CreditCard,
  Briefcase,
  ChevronRight,
  UserCheck,
  Image as ImageIcon,
  Check,
  AlertCircle,
} from 'lucide-react';
import { TaskItem, StaffMember } from '../types';
import { useTheme } from '../context/ThemeContext';
import {
  aggregateDailyShiftSummary,
  calculateTaskDurationMinutes,
  formatMinutesToHuman,
  resolveTaskStation,
  CAFE_STATIONS,
} from '../utils/shiftAnalytics';

interface DailySummaryViewProps {
  tasks: TaskItem[];
  staffList?: StaffMember[];
  activeOutlet?: string;
  onOpenPdfModal?: () => void;
  onBackToOverview?: () => void;
}

const STATION_ICONS: Record<string, React.ReactNode> = {
  Kitchen: <Utensils className="w-4 h-4 stroke-[2.5]" />,
  Bar: <Coffee className="w-4 h-4 stroke-[2.5]" />,
  Billing: <CreditCard className="w-4 h-4 stroke-[2.5]" />,
  Service: <ConciergeBell className="w-4 h-4 stroke-[2.5]" />,
  Housekeeping: <Sparkles className="w-4 h-4 stroke-[2.5]" />,
  Management: <Briefcase className="w-4 h-4 stroke-[2.5]" />,
};

export const DailySummaryView: React.FC<DailySummaryViewProps> = ({
  tasks,
  staffList = [],
  activeOutlet = 'Amarii Cafe Kothrud',
  onOpenPdfModal,
  onBackToOverview,
}) => {
  const { isLightMode } = useTheme();

  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'completed' | 'all' | 'pending'>('completed');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Automatically aggregate daily shift metrics across all stations
  const summary = useMemo(() => {
    return aggregateDailyShiftSummary(tasks);
  }, [tasks]);

  // Filter tasks based on status, station, and search query
  const filteredList = useMemo(() => {
    let list: TaskItem[] = [];
    if (taskStatusFilter === 'completed') {
      list = summary.completedTasksList;
    } else if (taskStatusFilter === 'pending') {
      list = summary.pendingTasksList;
    } else {
      list = tasks;
    }

    if (selectedStationFilter !== 'all') {
      list = list.filter((t) => resolveTaskStation(t) === selectedStationFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.checklistHeader && t.checklistHeader.toLowerCase().includes(q)) ||
          (t.assignee && t.assignee.toLowerCase().includes(q)) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          (t.department && t.department.toLowerCase().includes(q))
      );
    }

    return list;
  }, [summary, tasks, taskStatusFilter, selectedStationFilter, searchQuery]);

  // Format today's date
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header & Context Banner */}
      <div
        className={`p-4 sm:p-5 rounded-sm border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isLightMode ? 'bg-white border-zinc-900 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xs bg-[#2E7559] text-white">
            <Building2 className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider">
                Daily Operations Summary across All Stations
              </h2>
              <span className="px-2 py-0.5 rounded-xs text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                Live Shift Aggregation
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
              <span>{todayFormatted}</span>
              <span>•</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{activeOutlet}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenPdfModal && (
            <button
              type="button"
              id="daily-summary-export-pdf-btn"
              onClick={onOpenPdfModal}
              className="px-3.5 py-2 text-xs font-black uppercase tracking-tight flex items-center gap-1.5 transition cursor-pointer border-2 shadow-sm bg-[#E05A47] hover:bg-[#D44A35] text-white border-[#E05A47]"
              title="Download Daily Operations PDF Summary"
            >
              <FileDown className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Export PDF Shift Report</span>
            </button>
          )}

          {onBackToOverview && (
            <button
              type="button"
              onClick={onBackToOverview}
              className={`px-3 py-2 text-xs font-bold uppercase tracking-tight transition cursor-pointer border rounded-xs ${
                isLightMode
                  ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
              }`}
            >
              View Analytics Charts
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Display Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Shift Completion Rate */}
        <div
          className={`p-5 rounded-sm border-2 transition-all relative overflow-hidden ${
            isLightMode
              ? 'bg-gradient-to-br from-white to-emerald-50/50 border-emerald-600 shadow-sm'
              : 'bg-gradient-to-br from-zinc-950 to-emerald-950/20 border-emerald-500'
          }`}
        >
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Shift Completion Rate
            </span>
            <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              {summary.shiftCompletionRate}%
            </span>
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              ({summary.completedTasks} / {summary.totalTasks} tasks)
            </span>
          </div>

          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-700"
              style={{ width: `${summary.shiftCompletionRate}%` }}
            />
          </div>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2.5 font-mono flex items-center justify-between">
            <span>Progress across all 6 stations</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {summary.pendingTasks} remaining
            </span>
          </p>
        </div>

        {/* Card 2: Total Time Spent on Tasks */}
        <div
          className={`p-5 rounded-sm border-2 transition-all ${
            isLightMode
              ? 'bg-gradient-to-br from-white to-amber-50/40 border-amber-500 shadow-sm'
              : 'bg-gradient-to-br from-zinc-950 to-amber-950/20 border-amber-500/80'
          }`}
        >
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Total Time Spent
            </span>
            <div className="p-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
              {summary.totalTimeSpentFormatted}
            </span>
            <span className="text-xs font-semibold text-zinc-500">logged</span>
          </div>

          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-700"
              style={{
                width: `${
                  summary.totalPlannedTimeMinutes > 0
                    ? Math.min(
                        100,
                        Math.round((summary.totalTimeSpentMinutes / summary.totalPlannedTimeMinutes) * 100)
                      )
                    : 0
                }%`,
              }}
            />
          </div>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2.5 font-mono flex items-center justify-between">
            <span>Total planned: {summary.totalPlannedTimeFormatted}</span>
            <span>{Math.round(summary.totalTimeSpentMinutes)} mins</span>
          </p>
        </div>

        {/* Card 3: Urgent Task Resolution */}
        <div
          className={`p-5 rounded-sm border-2 transition-all ${
            isLightMode ? 'bg-white border-zinc-300 shadow-xs' : 'bg-zinc-950 border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#E05A47]">
              Urgent Station Tasks
            </span>
            <div className="p-1.5 rounded-full bg-red-500/10 text-[#E05A47]">
              <Zap className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-[#E05A47] font-mono tracking-tight">
              {summary.urgentCompletionRate}%
            </span>
            <span className="text-xs font-semibold text-zinc-500">
              ({summary.urgentCompleted} / {summary.urgentTotal} done)
            </span>
          </div>

          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-[#E05A47] h-full rounded-full transition-all duration-700"
              style={{ width: `${summary.urgentCompletionRate}%` }}
            />
          </div>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2.5 font-mono flex items-center justify-between">
            <span>Critical health & hygiene</span>
            <span>
              {summary.urgentTotal - summary.urgentCompleted === 0 ? 'All cleared' : 'Action required'}
            </span>
          </p>
        </div>

        {/* Card 4: Verified Proof Compliance */}
        <div
          className={`p-5 rounded-sm border-2 transition-all ${
            isLightMode ? 'bg-white border-zinc-300 shadow-xs' : 'bg-zinc-950 border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Photo & Media Audited
            </span>
            <div className="p-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
              {summary.mediaVerificationRate}%
            </span>
            <span className="text-xs font-semibold text-zinc-500">
              ({summary.mediaVerifiedCount} verified)
            </span>
          </div>

          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${summary.mediaVerificationRate}%` }}
            />
          </div>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2.5 font-mono flex items-center justify-between">
            <span>Visual proofs on shift</span>
            <span>Manager verified</span>
          </p>
        </div>
      </div>

      {/* Station Aggregation Cards */}
      <div
        className={`p-5 rounded-sm border-2 ${
          isLightMode ? 'bg-white border-zinc-300' : 'bg-zinc-950 border-zinc-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-black uppercase tracking-wider">
                Shift Completion Rate & Time Spent by Station
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Click any station to isolate its completed operational tasks below
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span>6 Stations Connected</span>
          </div>
        </div>

        {/* Station Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {summary.stationMetrics.map((sm) => {
            const isSelected = selectedStationFilter === sm.station;
            const icon = STATION_ICONS[sm.station] || <Building2 className="w-4 h-4" />;
            const timeSpentHuman = formatMinutesToHuman(sm.timeSpentMinutes);

            return (
              <button
                key={sm.station}
                type="button"
                onClick={() =>
                  setSelectedStationFilter((prev) => (prev === sm.station ? 'all' : sm.station))
                }
                className={`text-left p-4 rounded-xs border-2 transition cursor-pointer relative ${
                  isSelected
                    ? isLightMode
                      ? 'border-zinc-900 bg-zinc-100/90 shadow-md ring-2 ring-zinc-900/10'
                      : 'border-white bg-zinc-900 shadow-md ring-2 ring-white/10'
                    : isLightMode
                    ? 'border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="p-1.5 rounded-xs text-white"
                      style={{ backgroundColor: sm.color }}
                    >
                      {icon}
                    </span>
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-tight">{sm.department}</h4>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {sm.completedTasks} of {sm.totalTasks} completed
                      </span>
                    </div>
                  </div>

                  <span
                    className="text-lg font-black font-mono"
                    style={{ color: sm.color }}
                  >
                    {sm.completionRate}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-2.5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${sm.completionRate}%`, backgroundColor: sm.color }}
                  />
                </div>

                {/* Sub metrics: Time spent + urgent */}
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                  <span className="flex items-center gap-1 font-semibold text-zinc-800 dark:text-zinc-200">
                    <Clock className="w-3 h-3 text-amber-500" />
                    <span>{timeSpentHuman} spent</span>
                  </span>
                  <span>
                    {sm.urgentTotal > 0 ? (
                      <span className="text-[#E05A47] font-bold">
                        {sm.urgentCompleted}/{sm.urgentTotal} urgent
                      </span>
                    ) : (
                      <span>{sm.mediaCount} media files</span>
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aggregated Completed Tasks List Across All Stations */}
      <div
        className={`p-5 rounded-sm border-2 ${
          isLightMode ? 'bg-white border-zinc-300' : 'bg-zinc-950 border-zinc-800'
        }`}
      >
        {/* Controls and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2E7559]" />
              <h3 className="text-sm font-black uppercase tracking-wider">
                {taskStatusFilter === 'completed'
                  ? 'All Completed Tasks Across Stations'
                  : taskStatusFilter === 'pending'
                  ? 'Remaining In-Progress Tasks'
                  : 'All Tasks on Shift'}
              </h3>
              <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                {filteredList.length}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Individual task time window, duration logged, station attribution, and proof status
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Tabs */}
            <div
              className={`inline-flex p-0.5 border rounded-xs text-xs font-bold uppercase ${
                isLightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-900 border-zinc-800'
              }`}
            >
              <button
                type="button"
                onClick={() => setTaskStatusFilter('completed')}
                className={`px-3 py-1 transition cursor-pointer rounded-xs ${
                  taskStatusFilter === 'completed'
                    ? isLightMode
                      ? 'bg-zinc-950 text-white shadow-xs'
                      : 'bg-[#F7F4EB] text-[#16281E] font-black shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Completed ({summary.completedTasks})
              </button>
              <button
                type="button"
                onClick={() => setTaskStatusFilter('pending')}
                className={`px-3 py-1 transition cursor-pointer rounded-xs ${
                  taskStatusFilter === 'pending'
                    ? isLightMode
                      ? 'bg-zinc-950 text-white shadow-xs'
                      : 'bg-[#F7F4EB] text-[#16281E] font-black shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Pending ({summary.pendingTasks})
              </button>
              <button
                type="button"
                onClick={() => setTaskStatusFilter('all')}
                className={`px-3 py-1 transition cursor-pointer rounded-xs ${
                  taskStatusFilter === 'all'
                    ? isLightMode
                      ? 'bg-zinc-950 text-white shadow-xs'
                      : 'bg-[#F7F4EB] text-[#16281E] font-black shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                All ({summary.totalTasks})
              </button>
            </div>
          </div>
        </div>

        {/* Station Filter Chips + Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          {/* Station Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedStationFilter('all')}
              className={`px-2.5 py-1 text-xs font-bold uppercase transition cursor-pointer border rounded-xs whitespace-nowrap ${
                selectedStationFilter === 'all'
                  ? isLightMode
                    ? 'bg-zinc-950 text-white border-zinc-950'
                    : 'bg-[#F7F4EB] text-[#16281E] border-white'
                  : 'text-zinc-500 border-zinc-300 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              All Stations
            </button>
            {CAFE_STATIONS.map((station) => (
              <button
                key={station.id}
                type="button"
                onClick={() => setSelectedStationFilter(station.id)}
                className={`px-2.5 py-1 text-xs font-bold uppercase transition cursor-pointer border rounded-xs whitespace-nowrap flex items-center gap-1.5 ${
                  selectedStationFilter === station.id
                    ? isLightMode
                      ? 'bg-zinc-950 text-white border-zinc-950'
                      : 'bg-[#F7F4EB] text-[#16281E] border-white'
                    : 'text-zinc-500 border-zinc-300 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: station.color }}
                />
                <span>{station.id}</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search task, staff, notes..."
              className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xs border outline-none font-mono ${
                isLightMode
                  ? 'bg-zinc-50 border-zinc-300 focus:border-zinc-900 text-zinc-900'
                  : 'bg-zinc-900 border-zinc-700 focus:border-zinc-300 text-zinc-100'
              }`}
            />
          </div>
        </div>

        {/* Task Items Table / List */}
        {filteredList.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-xs my-3">
            <CheckCircle2 className="w-8 h-8 text-zinc-400 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold uppercase text-zinc-600 dark:text-zinc-400">
              No tasks found
            </p>
            <p className="text-xs text-zinc-500 mt-1 font-mono">
              {searchQuery
                ? 'Try adjusting your search criteria or station filter.'
                : 'No tasks matching the selected criteria.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border-t border-b border-zinc-200 dark:border-zinc-800">
            {filteredList.map((task) => {
              const stationName = resolveTaskStation(task);
              const stationDef = CAFE_STATIONS.find((s) => s.id === stationName);
              const durationMinutes = calculateTaskDurationMinutes(task);
              const durationHuman = formatMinutesToHuman(durationMinutes);
              const completedSubtasksCount = task.subTasks
                ? task.subTasks.filter((st) => st.isDone).length
                : 0;
              const totalSubtasksCount = task.subTasks ? task.subTasks.length : 0;

              return (
                <div
                  key={task.id}
                  className={`py-3.5 px-2.5 sm:px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    task.completed
                      ? isLightMode
                        ? 'hover:bg-emerald-50/40'
                        : 'hover:bg-emerald-950/10'
                      : isLightMode
                      ? 'hover:bg-zinc-50'
                      : 'hover:bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Status Checkbox or Indicator */}
                    <div className="pt-0.5">
                      {task.completed ? (
                        <div className="w-6 h-6 rounded-xs bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-xs border-2 border-zinc-400 dark:border-zinc-600 flex items-center justify-center text-zinc-400">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    {/* Task Details */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Station Tag */}
                        <span
                          className="px-2 py-0.5 text-[10px] font-black uppercase rounded-xs tracking-wider text-white"
                          style={{ backgroundColor: stationDef?.color || '#6B7280' }}
                        >
                          {stationName}
                        </span>

                        {/* Checklist Header */}
                        {task.checklistHeader && (
                          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                            {task.checklistHeader}
                          </span>
                        )}

                        {/* Priority Badge if urgent */}
                        {task.priority === 'urgent' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-black uppercase bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 rounded-xs">
                            Urgent
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-sm font-bold tracking-tight ${
                          task.completed
                            ? 'text-zinc-900 dark:text-white'
                            : 'text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        {task.title}
                      </h4>

                      {/* Details or notes */}
                      {task.details && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                          {task.details}
                        </p>
                      )}

                      {/* Subtasks summary */}
                      {totalSubtasksCount > 0 && (
                        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                          <span>
                            {completedSubtasksCount} / {totalSubtasksCount} subtasks completed
                          </span>
                          {totalSubtasksCount === completedSubtasksCount && (
                            <span className="text-emerald-600 font-bold">✓ Complete</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Meta Column: Time, Assignee, Proof */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 text-xs font-mono shrink-0 pl-9 sm:pl-0">
                    {/* Time Window & Duration */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {task.startTime && task.endTime
                          ? `${task.startTime} – ${task.endTime}`
                          : task.deadline || 'Standard Shift'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-[10px] border border-amber-500/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{durationHuman}</span>
                      </span>
                    </div>

                    {/* Assignee & Proof status */}
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      {task.assignee && (
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-emerald-500" />
                          <span className="truncate max-w-[140px]">{task.assignee}</span>
                        </span>
                      )}

                      {task.media && task.media.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px] border border-blue-500/30 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          <span>{task.media.length} photo</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
