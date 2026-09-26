import React from 'react';
import { AnimatePresence } from 'motion/react';
import {
  Utensils,
  Coffee,
  Sparkles,
  ConciergeBell,
  CreditCard,
  Briefcase,
  Layers,
  Wrench,
  Package,
  Plus,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { TaskItem, TaskDepartment, TaskMedia, StaffMember } from '../types';
import { DEPARTMENT_COLORS } from '../data/staffData';
import { TaskCard } from './TaskCard';
import { useTheme } from '../context/ThemeContext';
import { evaluateTaskTimeStatus } from '../utils/timeEvaluation';

interface DepartmentChecklistSectionProps {
  department: TaskDepartment;
  tasks: TaskItem[];
  onToggleTask: (id: string) => void;
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
  onAddTaskToDepartment?: (department: TaskDepartment) => void;
  blockedTaskId?: string | null;
}

export const DepartmentChecklistSection: React.FC<DepartmentChecklistSectionProps> = ({
  department,
  tasks = [],
  onToggleTask,
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
  onAddTaskToDepartment,
  blockedTaskId = null,
}) => {
  const { isLightMode } = useTheme();
  const [isExpanded, setIsExpanded] = React.useState(true);

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const completedCount = safeTasks.filter((t) => t?.completed).length;
  const isAllCompleted = safeTasks.length > 0 && completedCount === safeTasks.length;
  const urgentCount = safeTasks.filter((t) => t?.priority === 'urgent' && !t?.completed).length;
  const breachedTasks = safeTasks.filter((t) => !t?.completed && evaluateTaskTimeStatus(t).isOverdue);
  const breachedCount = breachedTasks.length;
  const percentage = safeTasks.length > 0 ? Math.round((completedCount / safeTasks.length) * 100) : 0;

  const deptStyle = DEPARTMENT_COLORS[department] || DEPARTMENT_COLORS.General;

  const getDeptIcon = (dept: TaskDepartment) => {
    switch (dept) {
      case 'Kitchen':
        return <Utensils className="w-5 h-5" />;
      case 'Bar':
        return <Coffee className="w-5 h-5" />;
      case 'Housekeeping':
        return <Sparkles className="w-5 h-5" />;
      case 'Service':
        return <ConciergeBell className="w-5 h-5" />;
      case 'Billing':
        return <CreditCard className="w-5 h-5" />;
      case 'Management':
        return <Briefcase className="w-5 h-5" />;
      case 'Inventory':
        return <Package className="w-5 h-5" />;
      case 'Maintenance':
        return <Wrench className="w-5 h-5" />;
      default:
        return <Layers className="w-5 h-5" />;
    }
  };

  const getDeptSubtitle = (dept: TaskDepartment) => {
    switch (dept) {
      case 'Kitchen':
        return 'Food prep, line stations, recipe consistency, hygiene & temperature checks';
      case 'Bar':
        return 'Espresso station, coffee bean stock, beverage prep, ice & machine maintenance';
      case 'Housekeeping':
        return 'Dining floor scrubbing, table sanitization, restroom hygiene & trash disposal';
      case 'Service':
        return 'Table service setup, cutlery polishing, guest orders & captain checks';
      case 'Billing':
        return 'POS settlement, cash float verification, daily Z-report & EDC machine sync';
      case 'Management':
        return 'Shift handover, vendor bills clearance, staff roster & audit compliance';
      default:
        return 'Daily operations and departmental checklists';
    }
  };

  return (
    <section
      id={`dept-checklist-${department.toLowerCase()}`}
      className={`flex flex-col p-3.5 sm:p-5 transition-all rounded-sm border-2 shadow-md ${
        isLightMode ? 'bg-white border-zinc-300' : 'bg-zinc-950 border-zinc-800'
      }`}
    >
      {/* Department Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b ${
          isLightMode ? 'border-zinc-200' : 'border-zinc-800'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div className={`p-2 sm:p-2.5 ${deptStyle.badge} flex-shrink-0 font-black shadow`}>
            {getDeptIcon(department)}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className={`text-lg sm:text-2xl font-black uppercase tracking-tight ${
                  isLightMode ? 'text-zinc-950' : 'text-white'
                }`}
              >
                {department} Daily Checklist
              </h2>
              <span className={`px-2 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider ${deptStyle.badge}`}>
                {completedCount}/{tasks.length} Done ({percentage}%)
              </span>
              {breachedCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-red-600 text-white animate-pulse flex items-center gap-1 shadow">
                  <AlertCircle className="w-3 h-3 stroke-[3]" />
                  🚨 {breachedCount} Time Breach!
                </span>
              )}
              {urgentCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-red-600 text-white animate-pulse flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 stroke-[3]" />
                  {urgentCount} Urgent
                </span>
              )}
            </div>
            <p
              className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider mt-0.5 ${
                isLightMode ? 'text-zinc-600' : 'text-zinc-400'
              }`}
            >
              {getDeptSubtitle(department)}
            </p>
          </div>
        </div>

        {/* Section Actions */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-start sm:self-auto">
          {onAddTaskToDepartment && (
            <button
              type="button"
              id={`add-task-to-${department.toLowerCase()}-btn`}
              onClick={() => onAddTaskToDepartment(department)}
              className={`text-[11px] sm:text-xs font-black uppercase tracking-tight px-3 py-1.5 transition flex items-center gap-1 cursor-pointer active:scale-95 min-h-[36px] ${
                isLightMode
                  ? 'bg-zinc-950 text-white hover:bg-zinc-800'
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ Add Task</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center border ${
              isLightMode
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-950 border-zinc-300'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border-zinc-800'
            }`}
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Department Progress Bar */}
      <div className={`w-full h-1.5 my-2.5 overflow-hidden ${isLightMode ? 'bg-zinc-200' : 'bg-zinc-900'}`}>
        <div
          className={`h-full transition-all duration-300 ${
            percentage === 100
              ? 'bg-emerald-600'
              : isLightMode
              ? 'bg-zinc-950'
              : 'bg-white'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Task List */}
      {isExpanded && (
        <div className="pt-2 space-y-2.5 sm:space-y-3">
          {/* Department SLA Breach Banner */}
          {breachedCount > 0 && (
            <div className="p-3 bg-red-950 text-red-100 border-2 border-red-600 shadow-md flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 stroke-[2.5]" />
                <div>
                  <span className="text-xs font-black uppercase text-red-300 block">
                    🚨 {department} Department SLA Breach Alert: {breachedCount} Task(s) Missed Deadline!
                  </span>
                  <span className="text-[11px] text-zinc-300">
                    Scheduled completion time has passed without submission. Department staff must take immediate action.
                  </span>
                </div>
              </div>
            </div>
          )}

          {tasks.length === 0 ? (
            <div
              className={`py-6 text-center text-xs font-bold uppercase tracking-wider border border-dashed ${
                isLightMode
                  ? 'text-zinc-600 bg-zinc-50 border-zinc-300'
                  : 'text-zinc-500 bg-zinc-900/40 border-zinc-800'
              }`}
            >
              No tasks in {department} checklist yet. Click "+ Add Task" to create one with photo, video & notes.
            </div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {tasks.map((task, idx) => (
                <TaskCard
                  key={task.id ? `dept-task-${department}-${task.id}-${idx}` : `dept-task-${department}-${idx}`}
                  task={task}
                  index={idx}
                  onToggle={onToggleTask}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                  onViewMedia={onViewMedia}
                  onAddMediaToTask={onAddMediaToTask}
                  onUpdateTaskNote={onUpdateTaskNote}
                  onToggleSubTask={onToggleSubTask}
                  onAddSubTaskMedia={onAddSubTaskMedia}
                  onUpdateSubTaskNote={onUpdateSubTaskNote}
                  onApproveTask={onApproveTask}
                  onRejectTask={onRejectTask}
                  staffList={staffList}
                  isBlocked={blockedTaskId === task.id}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      )}
    </section>
  );
};
