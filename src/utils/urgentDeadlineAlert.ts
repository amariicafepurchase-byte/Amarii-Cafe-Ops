import { TaskItem } from '../types';
import { parseTimeToMinutes } from './timeEvaluation';

export interface UrgentAlertData {
  task: TaskItem;
  minutesRemaining: number;
  deadlineDisplay: string;
  isOverdue: boolean;
  timeLabel: string;
}

// Set of already notified task-milestone keys to prevent spamming
const notifiedAlertKeys = new Map<string, number>();

// Snoozed tasks mapping (taskId -> timestamp until when alert is snoozed)
const snoozedAlerts = new Map<string, number>();

/**
 * Snooze a specific task alert for given minutes (default 5 mins)
 */
export const snoozeUrgentAlert = (taskId: string, snoozeMinutes = 5) => {
  const until = Date.now() + snoozeMinutes * 60 * 1000;
  snoozedAlerts.set(taskId, until);
};

/**
 * Check if a task alert is currently snoozed
 */
export const isUrgentAlertSnoozed = (taskId: string): boolean => {
  const snoozedUntil = snoozedAlerts.get(taskId);
  if (!snoozedUntil) return false;
  if (Date.now() < snoozedUntil) {
    return true;
  }
  snoozedAlerts.delete(taskId);
  return false;
};

/**
 * Requests desktop notification permission from user
 */
export const requestDesktopNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[UrgentAlert] Notification permission request error:', err);
    return 'denied';
  }
};

/**
 * Plays a crisp, professional dual-tone desktop chime alert using Web Audio API
 */
export const playUrgentAlertChime = () => {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // First tone (587.33 Hz - D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Second tone (880 Hz - A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.3, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);

    // Third high attention tone (1174.66 Hz - D6)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(1174.66, now + 0.25);
    gain3.gain.setValueAtTime(0.35, now + 0.25);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.25);
    osc3.stop(now + 0.75);

    // Subtle vibration on mobile devices
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([250, 100, 350]);
      } catch {}
    }
  } catch (err) {
    console.warn('[UrgentAlert] Chime playback notice:', err);
  }
};

/**
 * Resolves minutes remaining until deadline from various time strings
 */
export const calculateMinutesToDeadline = (
  timeStr?: string,
  referenceDate: Date = new Date()
): { minutesRemaining: number; deadlineDisplay: string } | null => {
  if (!timeStr || !timeStr.trim()) return null;
  const raw = timeStr.trim();

  // 1. Check if raw is a full ISO date string (e.g. 2026-09-27T10:30:00)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const parsedDate = new Date(raw);
    if (!isNaN(parsedDate.getTime())) {
      const diffMs = parsedDate.getTime() - referenceDate.getTime();
      const mins = Math.floor(diffMs / 60000);
      const display = parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return { minutesRemaining: mins, deadlineDisplay: display };
    }
  }

  // 2. Parse standard 12-hour or 24-hour time strings
  const endMinutes = parseTimeToMinutes(raw);
  if (endMinutes === null) return null;

  const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
  let minutesRemaining = endMinutes - currentMinutes;

  // Handle midnight shift wrap-around
  if (minutesRemaining < -720) {
    minutesRemaining += 1440;
  } else if (minutesRemaining > 720) {
    minutesRemaining -= 1440;
  }

  return { minutesRemaining, deadlineDisplay: raw };
};

/**
 * Resolves deadline for a task
 */
export const resolveTaskDeadline = (
  task: TaskItem,
  referenceDate: Date = new Date()
): { minutesRemaining: number; deadlineDisplay: string } | null => {
  if (task.deadline) {
    const res = calculateMinutesToDeadline(task.deadline, referenceDate);
    if (res !== null) return res;
  }
  if (task.endTime) {
    const res = calculateMinutesToDeadline(task.endTime, referenceDate);
    if (res !== null) return res;
  }
  if (task.startTime) {
    const res = calculateMinutesToDeadline(task.startTime, referenceDate);
    if (res !== null) return res;
  }
  return null;
};

/**
 * Sends a native Desktop / OS notification using the Web Notification API
 */
export const sendUrgentDesktopNotification = (task: TaskItem, minutesRemaining: number) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const isOverdue = minutesRemaining < 0;
    const timeText = isOverdue
      ? `OVERDUE by ${Math.abs(minutesRemaining)} min(s)!`
      : `Due in ${minutesRemaining} min(s)!`;

    const title = `🚨 URGENT TASK ALERT: ${task.title}`;
    const body = `⚠️ ${timeText} • [${task.department || 'Operations'}] • Assignee: ${
      task.assignee || 'Unassigned'
    }\nImmediate completion required within 30 minutes of deadline.`;

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: `urgent-deadline-${task.id}`,
          requireInteraction: true,
          vibrate: [400, 150, 400],
          data: {
            taskId: task.id,
            url: '/',
          },
        } as NotificationOptions);
      }).catch(() => {
        // Direct Notification fallback
        dispatchDirectNotification(title, body, task.id);
      });
    } else {
      dispatchDirectNotification(title, body, task.id);
    }
  } catch (err) {
    console.error('[UrgentAlert] Native notification dispatch error:', err);
  }
};

const dispatchDirectNotification = (title: string, body: string, taskId: string) => {
  try {
    const notif = new Notification(title, {
      body,
      icon: '/icon.svg',
      tag: `urgent-deadline-${taskId}`,
      requireInteraction: true,
    } as NotificationOptions);

    notif.onclick = () => {
      window.focus();
      notif.close();
      const el = document.getElementById(`task-item-${taskId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-red-500');
        setTimeout(() => el.classList.remove('ring-4', 'ring-red-500'), 3500);
      }
    };
  } catch (e) {
    console.warn('[UrgentAlert] Direct notification failed:', e);
  }
};

/**
 * Gets all current incomplete Urgent tasks that are within 30 minutes of their deadline
 */
export const getIncompleteUrgentTasksNearDeadline = (
  tasks: TaskItem[],
  referenceDate: Date = new Date()
): UrgentAlertData[] => {
  if (!tasks || tasks.length === 0) return [];

  const results: UrgentAlertData[] = [];

  tasks.forEach((task) => {
    // 1. Task must be incomplete
    if (!task || task.completed) return;

    // 2. Task must be marked as 'urgent'
    if (task.priority !== 'urgent') return;

    // 3. Skip if currently snoozed by the user
    if (isUrgentAlertSnoozed(task.id)) return;

    // 4. Resolve task deadline
    const deadlineInfo = resolveTaskDeadline(task, referenceDate);
    if (!deadlineInfo) return;

    const { minutesRemaining, deadlineDisplay } = deadlineInfo;

    // Condition: Task is within 30 minutes of its deadline (e.g. <= 30 mins) or overdue by up to 60 mins
    if (minutesRemaining <= 30 && minutesRemaining >= -60) {
      const isOverdue = minutesRemaining < 0;
      const timeLabel = isOverdue
        ? `${Math.abs(minutesRemaining)}m overdue`
        : `${minutesRemaining}m remaining`;

      results.push({
        task,
        minutesRemaining,
        deadlineDisplay,
        isOverdue,
        timeLabel,
      });
    }
  });

  // Sort by most urgent first (overdue first, then closest deadline)
  return results.sort((a, b) => a.minutesRemaining - b.minutesRemaining);
};

/**
 * Evaluates tasks and triggers desktop notification & in-app alert when entering the 30-min window
 */
export const checkUrgentDeadlineAlerts = (
  tasks: TaskItem[],
  onTriggerAlert: (alerts: UrgentAlertData[]) => void,
  referenceDate: Date = new Date()
) => {
  const matchingAlerts = getIncompleteUrgentTasksNearDeadline(tasks, referenceDate);
  if (matchingAlerts.length === 0) {
    onTriggerAlert([]);
    return;
  }

  // Update in-app alert state with current qualifying alerts
  onTriggerAlert(matchingAlerts);

  // Check if any matching alert should dispatch a desktop notification / audio chime
  const now = Date.now();
  matchingAlerts.forEach((alert) => {
    const { task, minutesRemaining } = alert;
    const isOverdue = minutesRemaining < 0;
    const milestone = isOverdue
      ? 'overdue'
      : minutesRemaining <= 10
      ? 'critical-10'
      : 'warning-30';

    const alertKey = `${task.id}-${referenceDate.toDateString()}-${milestone}`;
    const lastNotified = notifiedAlertKeys.get(alertKey);

    // Notify at most once per 4 minutes per milestone to prevent spamming
    if (!lastNotified || now - lastNotified > 4 * 60 * 1000) {
      notifiedAlertKeys.set(alertKey, now);

      // Play audio chime
      playUrgentAlertChime();

      // Send OS-level Desktop notification
      sendUrgentDesktopNotification(task, minutesRemaining);
    }
  });
};

/**
 * Manually trigger a test Urgent Deadline Alert for verification
 */
export const triggerTestUrgentDeadlineAlert = (
  sampleTask?: Partial<TaskItem>,
  onTriggerAlert?: (alerts: UrgentAlertData[]) => void
) => {
  const testTask: TaskItem = {
    id: `urgent-test-${Date.now()}`,
    title: sampleTask?.title || 'Kitchen Line Check & Temperature Audit',
    department: sampleTask?.department || 'Kitchen',
    checklistHeader: sampleTask?.checklistHeader || 'Kitchen Opening Checklist',
    priority: 'urgent',
    completed: false,
    deadline: '11:00 AM',
    endTime: '11:00 AM',
    startTime: '10:00 AM',
    assignee: sampleTask?.assignee || 'Aditya',
    ...sampleTask,
  };

  playUrgentAlertChime();
  sendUrgentDesktopNotification(testTask, 24);

  if (onTriggerAlert) {
    onTriggerAlert([
      {
        task: testTask,
        minutesRemaining: 24,
        deadlineDisplay: '11:00 AM',
        isOverdue: false,
        timeLabel: '24m remaining',
      },
    ]);
  }
};
