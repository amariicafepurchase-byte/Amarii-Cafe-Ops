import React, { useEffect, useState } from 'react';
import {
  BellRing,
  Volume2,
  VolumeX,
  Clock,
  MapPin,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  X,
  Radio,
} from 'lucide-react';
import { TaskItem } from '../types';
import { stopExtremeLoudAlarm, playExtremeLoudAlarm } from '../utils/preTaskAlarm';

interface PreTaskAlarmModalProps {
  task: TaskItem | null;
  minutesRemaining: number;
  isOpen: boolean;
  onClose: () => void;
  onJumpToTask?: (taskId: string) => void;
}

export const PreTaskAlarmModal: React.FC<PreTaskAlarmModalProps> = ({
  task,
  minutesRemaining,
  isOpen,
  onClose,
  onJumpToTask,
}) => {
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMuted(false);
    }
  }, [isOpen]);

  if (!isOpen || !task) return null;

  const handleMute = () => {
    stopExtremeLoudAlarm();
    setIsMuted(true);
  };

  const handleReplay = () => {
    setIsMuted(false);
    playExtremeLoudAlarm(task.title, task.department as string);
  };

  const handleDismiss = () => {
    stopExtremeLoudAlarm();
    onClose();
  };

  const handleJump = () => {
    stopExtremeLoudAlarm();
    onClose();
    if (onJumpToTask && task.id) {
      onJumpToTask(task.id);
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alarm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-zinc-950 border-4 border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.6)] text-white overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Flashing Siren Top Bar */}
        <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-white text-red-600 rounded-xs">
              <Radio className="w-5 h-5 stroke-[3] animate-spin" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-black/40 px-1.5 py-0.5 rounded-xs">
                CRITICAL OPERATIONS REMINDER
              </span>
              <h2 id="alarm-modal-title" className="text-base sm:text-lg font-black uppercase tracking-tight leading-none mt-0.5">
                🚨 10-MIN TASK ALERT
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 hover:bg-red-700 text-white transition cursor-pointer"
            aria-label="Close alarm"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Alarm Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Minutes Countdown Badge */}
          <div className="flex items-center justify-between gap-3 p-3 bg-red-950/60 border-2 border-red-500/80">
            <div className="flex items-center gap-2.5">
              <Clock className="w-6 h-6 text-red-400 stroke-[2.5] animate-bounce" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-red-300">
                  Starts In Approximately
                </p>
                <p className="text-xl sm:text-2xl font-black uppercase text-red-400 font-mono leading-none">
                  {minutesRemaining} {minutesRemaining === 1 ? 'MINUTE' : 'MINUTES'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-wider bg-red-600 text-white px-2 py-0.5">
                Scheduled: {task.startTime || 'Soon'}
              </span>
            </div>
          </div>

          {/* Task Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[11px] font-black uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                📍 {task.department || 'Operations'}
              </span>
              {task.checklistHeader && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-zinc-900 text-zinc-400 border border-zinc-800 truncate">
                  {task.checklistHeader}
                </span>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white leading-tight uppercase">
              {task.title}
            </h3>

            {task.assignee && (
              <p className="text-xs text-zinc-400">
                👤 Assigned To:{' '}
                <span className="text-zinc-200 font-bold">{task.assignee}</span>
              </p>
            )}
          </div>

          {/* Audio Status & Sound Control */}
          <div className="p-3 bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {!isMuted ? (
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-black uppercase tracking-tight">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span>Extreme Loud Siren Playing</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-zinc-400 text-xs font-bold uppercase tracking-tight">
                  <VolumeX className="w-4 h-4" />
                  <span>Alarm Sound Silenced</span>
                </div>
              )}
            </div>

            {!isMuted ? (
              <button
                type="button"
                onClick={handleMute}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 border border-zinc-600"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Silence Audio</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReplay}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Play Again</span>
              </button>
            )}
          </div>

          {/* Mobile Screen Native Notification Notice */}
          <p className="text-[11px] text-zinc-400">
            📱 Direct native mobile notification has been dispatched to your device lock screen with loud vibration.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              type="button"
              id="jump-to-alarm-task-btn"
              onClick={handleJump}
              className="w-full sm:flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black uppercase tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
            >
              <span>Go to Task & Station</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>

            <button
              type="button"
              id="dismiss-alarm-btn"
              onClick={handleDismiss}
              className="w-full sm:w-auto px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-black uppercase tracking-wider transition cursor-pointer border border-zinc-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
