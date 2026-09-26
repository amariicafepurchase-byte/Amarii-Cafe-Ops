import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ClipboardList } from 'lucide-react';
import { TaskItem, StaffMember, TaskMedia } from '../types';
import { useTheme } from '../context/ThemeContext';
import { TaskRegisterView } from './TaskRegisterView';

interface TaskRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  staffList: StaffMember[];
  onEditTask?: (task: TaskItem) => void;
  onApproveTask?: (taskId: string) => void;
  onRejectTask?: (taskId: string, reason: string) => void;
  onViewMedia?: (media: TaskMedia) => void;
}

export const TaskRegisterModal: React.FC<TaskRegisterModalProps> = ({
  isOpen,
  onClose,
  tasks,
  staffList,
  onEditTask,
  onApproveTask,
  onRejectTask,
  onViewMedia,
}) => {
  const { isLightMode } = useTheme();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="task-register-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-register-modal-title"
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className={`w-full max-w-7xl max-h-[92vh] flex flex-col border-2 sm:border-4 shadow-2xl overflow-hidden ${
            isLightMode ? 'bg-[#F4F6F0] border-zinc-950 text-zinc-950' : 'bg-[#111F17] border-zinc-700 text-white'
          }`}
        >
          {/* Top Bar */}
          <div className="p-3 sm:p-4 bg-zinc-950 text-white flex items-center justify-between border-b-2 border-zinc-800">
            <div className="flex items-center gap-2.5">
              <ClipboardList className="w-5 h-5 text-red-500 stroke-[2.5]" />
              <h2 id="task-register-modal-title" className="text-sm sm:text-base font-black uppercase tracking-tight">
                Amarii Café Master Task Register & Historical Audit
              </h2>
            </div>

            <button
              type="button"
              id="close-task-register-modal-btn"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white transition cursor-pointer"
              aria-label="Close Task Register"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5">
            <TaskRegisterView
              tasks={tasks}
              staffList={staffList}
              onEditTask={onEditTask}
              onApproveTask={onApproveTask}
              onRejectTask={onRejectTask}
              onViewMedia={onViewMedia}
              onClose={onClose}
              isModalMode={true}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
