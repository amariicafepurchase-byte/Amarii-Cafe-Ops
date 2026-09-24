import React from 'react';
import { AnimatePresence } from 'motion/react';
import { AlertCircle, CheckSquare, Clock, CheckCheck, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { TaskItem, TaskPriority, TaskMedia, StaffMember } from '../types';
import { TaskCard } from './TaskCard';
import { useTheme } from '../context/ThemeContext';

interface SectionBlockProps {
  title: string;
  subtitle: string;
  priority: TaskPriority;
  tasks: TaskItem[];
  startIndex: number;
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
  onAddTaskToSection?: (priority: TaskPriority) => void;
  blockedTaskId?: string | null;
}

export const SectionBlock: React.FC<SectionBlockProps> = ({
  title,
  subtitle,
  priority,
  tasks = [],
  startIndex,
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
  onAddTaskToSection,
  blockedTaskId = null,
}) => {
  const { isLightMode } = useTheme();
  const [isExpanded, setIsExpanded] = React.useState(true);

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const completedCount = safeTasks.filter((t) => t?.completed).length;
  const isAllCompleted = safeTasks.length > 0 && completedCount === safeTasks.length;

  const getHeaderProps = () => {
    switch (priority) {
      case 'urgent':
        return {
          titleClass: isLightMode ? 'text-red-600' : 'text-red-500',
          dot: <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-600 rounded-full flex-shrink-0 animate-pulse" />,
          badgeClass: 'bg-red-600 text-white font-black',
        };
      case 'pending':
        return {
          titleClass: isLightMode ? 'text-zinc-700' : 'text-zinc-400',
          dot: null,
          badgeClass: isLightMode
            ? 'bg-amber-200 text-amber-950 font-black'
            : 'bg-zinc-800 text-zinc-400 font-black',
        };
      case 'today':
      default:
        return {
          titleClass: isLightMode ? 'text-zinc-950' : 'text-white',
          dot: null,
          badgeClass: isLightMode
            ? 'bg-zinc-950 text-white font-black'
            : 'bg-white text-black font-black',
        };
    }
  };

  const headerProps = getHeaderProps();

  return (
    <section
      id={`section-block-${priority}`}
      className={`flex flex-col p-3.5 sm:p-6 transition-all rounded-sm border ${
        isLightMode ? 'bg-white border-zinc-300 shadow-sm' : 'bg-zinc-950 border-zinc-800'
      }`}
    >
      {/* Section Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3 pb-3 sm:pb-4 border-b ${
          isLightMode ? 'border-zinc-200' : 'border-zinc-800'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 sm:gap-3">
            {headerProps.dot}
            <h2 className={`text-xl sm:text-4xl font-black uppercase tracking-tighter ${headerProps.titleClass}`}>
              {title}
            </h2>
            <span className={`px-2 py-0.5 text-[11px] sm:text-xs uppercase tracking-wider ${headerProps.badgeClass}`}>
              {completedCount}/{tasks.length}
            </span>
          </div>
          <p
            className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider mt-0.5 sm:mt-1 ${
              isLightMode ? 'text-zinc-600' : 'text-zinc-400'
            }`}
          >
            {subtitle}
          </p>
        </div>

        {/* Section Actions */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {onAddTaskToSection && (
            <button
              type="button"
              onClick={() => onAddTaskToSection(priority)}
              className={`text-[11px] sm:text-xs font-black uppercase tracking-tight px-2.5 sm:px-3 py-1.5 transition flex items-center gap-1 cursor-pointer active:scale-95 ${
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
            className={`p-1.5 transition cursor-pointer border ${
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

      {/* Task List */}
      {isExpanded && (
        <div className="pt-3 sm:pt-4 space-y-2.5 sm:space-y-3">
          {tasks.length === 0 ? (
            <div
              className={`py-6 sm:py-8 text-center text-xs font-bold uppercase tracking-wider border border-dashed ${
                isLightMode
                  ? 'text-zinc-600 bg-zinc-50 border-zinc-300'
                  : 'text-zinc-500 bg-zinc-900/40 border-zinc-800'
              }`}
            >
              No tasks in this category. Click "+ Add Task" to assign one.
            </div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {tasks.map((task, idx) => (
                <TaskCard
                  key={task.id ? `section-task-${priority}-${task.id}-${startIndex + idx}` : `section-task-${priority}-${startIndex + idx}`}
                  task={task}
                  index={startIndex + idx}
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
