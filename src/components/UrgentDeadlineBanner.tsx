import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  X,
  ArrowRight,
  CheckCircle2,
  Bell,
  Volume2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  UrgentAlertData,
  snoozeUrgentAlert,
  playUrgentAlertChime,
  requestDesktopNotificationPermission,
} from '../utils/urgentDeadlineAlert';

interface UrgentDeadlineBannerProps {
  alerts: UrgentAlertData[];
  onDismissAlert: (taskId: string) => void;
  onDismissAll: () => void;
  onJumpToTask: (taskId: string) => void;
  onCompleteTask?: (taskId: string) => void;
  isLightMode: boolean;
}

export const UrgentDeadlineBanner: React.FC<UrgentDeadlineBannerProps> = ({
  alerts,
  onDismissAlert,
  onDismissAll,
  onJumpToTask,
  onCompleteTask,
  isLightMode,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Clamp current index when alerts array length changes
  useEffect(() => {
    if (currentIndex >= alerts.length) {
      setCurrentIndex(Math.max(0, alerts.length - 1));
    }
  }, [alerts.length, currentIndex]);

  if (!alerts || alerts.length === 0) return null;

  const currentAlert = alerts[currentIndex] || alerts[0];
  if (!currentAlert) return null;

  const { task, minutesRemaining, deadlineDisplay, isOverdue, timeLabel } = currentAlert;

  const handleSnooze = () => {
    snoozeUrgentAlert(task.id, 5);
    onDismissAlert(task.id);
  };

  const handleRequestNotif = async () => {
    const perm = await requestDesktopNotificationPermission();
    setNotifPermission(perm);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : alerts.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < alerts.length - 1 ? prev + 1 : 0));
  };

  return (
    <aside
      aria-label="Urgent Task Deadline Alert"
      role="alert"
      aria-live="assertive"
      id="urgent-deadline-desktop-alert-container"
      className="fixed top-4 right-3 sm:right-6 max-w-md w-[calc(100vw-1.5rem)] sm:w-full z-50 animate-in slide-in-from-top-4 duration-300 drop-shadow-2xl"
    >
      <div
        className={`relative overflow-hidden rounded-xs border-2 sm:border-3 shadow-2xl transition-all ${
          isOverdue
            ? 'bg-red-950 border-red-600 text-white'
            : isLightMode
            ? 'bg-white border-red-600 text-zinc-950'
            : 'bg-[#181012] border-red-500 text-white'
        }`}
      >
        {/* Left vertical urgency status indicator bar */}
        <div className="absolute top-0 bottom-0 left-0 w-2.5 bg-red-600 animate-pulse" />

        <div className="p-3.5 sm:p-4 pl-5">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-red-600 text-white rounded-xs flex-shrink-0 animate-bounce">
                <AlertTriangle className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-xs flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 stroke-[2.5]" />
                    <span>URGENT DEADLINE ALERT</span>
                  </span>
                  <span
                    className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.5 border rounded-xs ${
                      isOverdue
                        ? 'bg-red-900 border-red-500 text-white'
                        : isLightMode
                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                        : 'bg-amber-950 border-amber-600 text-amber-300'
                    }`}
                  >
                    Within 30 Mins
                  </span>

                  {alerts.length > 1 && (
                    <span className="text-[10px] font-mono font-black bg-zinc-800 text-amber-300 px-1.5 py-0.5 rounded-xs">
                      {currentIndex + 1} of {alerts.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Pagination & Close Buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {alerts.length > 1 && (
                <div className="flex items-center gap-0.5 mr-1">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className={`p-1 rounded-xs transition cursor-pointer ${
                      isLightMode ? 'hover:bg-zinc-200 text-zinc-700' : 'hover:bg-zinc-800 text-zinc-300'
                    }`}
                    title="Previous urgent task"
                    aria-label="Previous urgent task"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className={`p-1 rounded-xs transition cursor-pointer ${
                      isLightMode ? 'hover:bg-zinc-200 text-zinc-700' : 'hover:bg-zinc-800 text-zinc-300'
                    }`}
                    title="Next urgent task"
                    aria-label="Next urgent task"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => onDismissAlert(task.id)}
                className={`p-1.5 rounded-xs transition cursor-pointer ${
                  isLightMode ? 'hover:bg-zinc-200 text-zinc-600' : 'hover:bg-zinc-800 text-zinc-400'
                }`}
                title="Dismiss this alert"
                aria-label="Dismiss this alert"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Task Info Content */}
          <div className="mt-2.5 space-y-1.5">
            <h4 className="text-sm sm:text-base font-black uppercase tracking-tight leading-tight line-clamp-2">
              {task.title}
            </h4>

            {/* Department, Assignee & Checklist Header */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium opacity-90">
              {task.department && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-xs ${
                    isLightMode ? 'bg-zinc-100 text-zinc-800' : 'bg-zinc-800 text-zinc-200'
                  }`}
                >
                  📍 {task.department}
                </span>
              )}
              {task.checklistHeader && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-semibold truncate max-w-[140px] rounded-xs ${
                    isLightMode ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {task.checklistHeader}
                </span>
              )}
              {task.assignee && (
                <span className="text-[11px]">
                  Assignee: <strong className={isLightMode ? 'text-zinc-900' : 'text-white'}>{task.assignee}</strong>
                </span>
              )}
            </div>

            {/* Countdown / Time remaining pill */}
            <div
              className={`p-2 rounded-xs flex items-center justify-between text-xs font-black uppercase tracking-tight ${
                isOverdue
                  ? 'bg-red-900/60 text-red-200 border border-red-600'
                  : isLightMode
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-red-950/40 text-red-300 border border-red-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Clock
                  className="w-3.5 h-3.5 stroke-[2.5] text-red-500 animate-spin"
                  style={{ animationDuration: '4s' }}
                />
                <span>
                  {isOverdue ? '⚠️ Overdue:' : '⏳ Time Remaining:'}{' '}
                  <strong className="underline decoration-red-500 underline-offset-2">{timeLabel}</strong>
                </span>
              </div>
              {deadlineDisplay && (
                <span className="text-[10px] opacity-80 font-mono">
                  Deadline: {deadlineDisplay}
                </span>
              )}
            </div>

            {/* Permission banner prompt if desktop notification permission is not granted */}
            {notifPermission !== 'granted' && typeof window !== 'undefined' && 'Notification' in window && (
              <div className="flex items-center justify-between gap-2 p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] rounded-xs">
                <div className="flex items-center gap-1 truncate">
                  <Bell className="w-3 h-3 flex-shrink-0 animate-pulse" />
                  <span className="truncate">Desktop notifications not yet allowed</span>
                </div>
                <button
                  type="button"
                  onClick={handleRequestNotif}
                  className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-[9px] rounded-xs flex-shrink-0 cursor-pointer"
                >
                  Enable OS Alerts
                </button>
              </div>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="mt-3 pt-2.5 border-t border-red-500/20 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                id="urgent-alert-snooze-btn"
                onClick={handleSnooze}
                className={`px-2.5 py-1 text-[11px] font-black uppercase tracking-tight border transition cursor-pointer rounded-xs ${
                  isLightMode
                    ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                }`}
                title="Snooze alert for 5 minutes"
              >
                ⏰ Snooze 5m
              </button>

              <button
                type="button"
                id="urgent-alert-chime-replay-btn"
                onClick={playUrgentAlertChime}
                className={`p-1.5 text-xs transition cursor-pointer rounded-xs ${
                  isLightMode ? 'hover:bg-zinc-200 text-zinc-600' : 'hover:bg-zinc-800 text-zinc-400'
                }`}
                title="Replay alert chime"
                aria-label="Replay alert chime"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {onCompleteTask && (
                <button
                  type="button"
                  id="urgent-alert-mark-done-btn"
                  onClick={() => {
                    onCompleteTask(task.id);
                    onDismissAlert(task.id);
                  }}
                  className="px-2.5 py-1 text-[11px] font-black uppercase tracking-tight bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer rounded-xs flex items-center gap-1 shadow-sm active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Done</span>
                </button>
              )}

              <button
                type="button"
                id="urgent-alert-jump-btn"
                onClick={() => {
                  onJumpToTask(task.id);
                  onDismissAlert(task.id);
                }}
                className="px-3 py-1 text-[11px] font-black uppercase tracking-tight bg-red-600 hover:bg-red-500 text-white transition cursor-pointer rounded-xs flex items-center gap-1 shadow-md active:scale-95"
              >
                <span>Jump to Task</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
