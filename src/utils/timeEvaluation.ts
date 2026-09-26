import { TaskItem, TaskDepartment } from '../types';

export interface TaskTimeStatus {
  isOverdue: boolean;
  isDueSoon: boolean; // within 30 mins of deadline
  isInWindow: boolean;
  isUpcoming: boolean;
  statusLabel: string;
  timeDisplay: string;
  statusColor: {
    bg: string;
    text: string;
    border: string;
    badge: string;
  };
}

/**
 * Parses time strings like "10:00 AM", "08:30 PM", "14:30", "10:00", etc.
 * Converts to minutes from midnight (0 - 1439).
 */
export const parseTimeToMinutes = (timeStr?: string): number | null => {
  if (!timeStr) return null;
  const clean = timeStr.trim();

  // Match 12-hour format: "10:30 AM" or "08:00 PM"
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridian = match12[3].toUpperCase();
    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Match 24-hour format: "14:30" or "09:00"
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  return null;
};

/**
 * Evaluates the real-time status of a task based on its scheduled window (startTime, endTime, deadline)
 * and whether it has been completed or time has passed.
 */
export const evaluateTaskTimeStatus = (
  task: TaskItem,
  referenceDate: Date = new Date()
): TaskTimeStatus => {
  const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();

  // Determine end time minutes
  let endMinutes = parseTimeToMinutes(task.endTime);
  if (endMinutes === null) {
    endMinutes = parseTimeToMinutes(task.deadline);
  }

  // Determine start time minutes
  const startMinutes = parseTimeToMinutes(task.startTime);

  // Time display label
  const timeDisplay = task.startTime && task.endTime
    ? `${task.startTime} – ${task.endTime}`
    : task.deadline
    ? `By ${task.deadline}`
    : task.startTime
    ? `From ${task.startTime}`
    : 'Anytime';

  // If completed
  if (task.completed) {
    let wasLate = false;
    if (task.completedAt && endMinutes !== null) {
      try {
        const compDate = new Date(task.completedAt);
        const compMinutes = compDate.getHours() * 60 + compDate.getMinutes();
        if (compMinutes > endMinutes + 5) {
          wasLate = true;
        }
      } catch {}
    }

    if (wasLate) {
      return {
        isOverdue: false,
        isDueSoon: false,
        isInWindow: false,
        isUpcoming: false,
        statusLabel: 'Completed Late (Breached)',
        timeDisplay,
        statusColor: {
          bg: 'bg-amber-950/40',
          text: 'text-amber-400',
          border: 'border-amber-600',
          badge: 'bg-amber-600 text-white',
        },
      };
    }

    return {
      isOverdue: false,
      isDueSoon: false,
      isInWindow: false,
      isUpcoming: false,
      statusLabel: 'Completed On-Time',
      timeDisplay,
      statusColor: {
        bg: 'bg-emerald-950/40',
        text: 'text-emerald-400',
        border: 'border-emerald-600',
        badge: 'bg-emerald-600 text-white',
      },
    };
  }

  // Task is Incomplete: Check if time has passed
  if (endMinutes !== null) {
    // Overdue condition: current time > scheduled end time
    if (currentMinutes > endMinutes) {
      const minutesOverdue = currentMinutes - endMinutes;
      const overdueText = minutesOverdue >= 60
        ? `${Math.floor(minutesOverdue / 60)}h ${minutesOverdue % 60}m overdue`
        : `${minutesOverdue}m overdue`;

      return {
        isOverdue: true,
        isDueSoon: false,
        isInWindow: false,
        isUpcoming: false,
        statusLabel: `⚠️ TIME BREACH (${overdueText})`,
        timeDisplay,
        statusColor: {
          bg: 'bg-red-950/80',
          text: 'text-red-300',
          border: 'border-red-600',
          badge: 'bg-red-600 text-white animate-pulse',
        },
      };
    }

    // Due Soon condition: within 30 minutes of deadline
    if (currentMinutes >= endMinutes - 30 && currentMinutes <= endMinutes) {
      const minsLeft = endMinutes - currentMinutes;
      return {
        isOverdue: false,
        isDueSoon: true,
        isInWindow: true,
        isUpcoming: false,
        statusLabel: `⏳ Due in ${minsLeft}m`,
        timeDisplay,
        statusColor: {
          bg: 'bg-amber-950/60',
          text: 'text-amber-300',
          border: 'border-amber-500',
          badge: 'bg-amber-500 text-black font-black',
        },
      };
    }
  }

  // Check if inside active window
  if (startMinutes !== null && endMinutes !== null) {
    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return {
        isOverdue: false,
        isDueSoon: false,
        isInWindow: true,
        isUpcoming: false,
        statusLabel: '🟢 Active Window',
        timeDisplay,
        statusColor: {
          bg: 'bg-blue-950/50',
          text: 'text-blue-300',
          border: 'border-blue-500',
          badge: 'bg-blue-600 text-white',
        },
      };
    } else if (currentMinutes < startMinutes) {
      return {
        isOverdue: false,
        isDueSoon: false,
        isInWindow: false,
        isUpcoming: true,
        statusLabel: 'Upcoming Window',
        timeDisplay,
        statusColor: {
          bg: 'bg-zinc-800/60',
          text: 'text-zinc-400',
          border: 'border-zinc-700',
          badge: 'bg-zinc-700 text-zinc-300',
        },
      };
    }
  }

  // Default pending
  return {
    isOverdue: false,
    isDueSoon: false,
    isInWindow: false,
    isUpcoming: false,
    statusLabel: task.priority === 'urgent' ? '🚨 Urgent Action' : 'Pending',
    timeDisplay,
    statusColor: {
      bg: 'bg-zinc-900/60',
      text: 'text-zinc-300',
      border: 'border-zinc-700',
      badge: task.priority === 'urgent' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-300',
    },
  };
};

/**
 * Audio / chime notification helper using Web Audio API for department breach alert
 */
export const playBreachAlertSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Create double alert beep
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    playTone(880, 0, 0.15); // A5
    playTone(587.33, 0.18, 0.25); // D5
  } catch (e) {
    console.warn('Audio alert note:', e);
  }
};
