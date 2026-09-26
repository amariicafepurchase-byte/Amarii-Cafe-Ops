import { TaskItem } from '../types';
import { parseTimeToMinutes } from './timeEvaluation';

let sharedAudioCtx: AudioContext | null = null;
let currentAlarmInterval: number | null = null;
let isAlarmCurrentlyPlaying = false;

/**
 * Ensures AudioContext is created and unlocked on user interaction
 */
export const getUnlockedAudioContext = (): AudioContext => {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioCtx = new AudioCtxClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch((err) => console.warn('[Alarm] AudioContext resume failed:', err));
  }
  return sharedAudioCtx;
};

// Auto unlock audio on any touch / click across the app
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getUnlockedAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch {}
  };
  window.addEventListener('click', unlockAudio, { once: false, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: false, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: false, passive: true });
}

/**
 * Extreme Loud Dual-Oscillator Siren Alarm Sound Generator
 * Uses Web Audio API with high gain boosting, dual square/sawtooth waves & rapid frequency sweep
 */
export const playExtremeLoudAlarm = (taskTitle: string, department?: string) => {
  try {
    stopExtremeLoudAlarm();
    isAlarmCurrentlyPlaying = true;
    const ctx = getUnlockedAudioContext();

    // Trigger physical heavy vibration pattern on Android / Mobile devices
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([600, 200, 600, 200, 1000, 300, 1000]);
      } catch {}
    }

    let cycleCount = 0;
    const maxCycles = 14; // Alarm sounds for ~12-14 seconds if not silenced

    const playSirenPulse = () => {
      if (!isAlarmCurrentlyPlaying || cycleCount >= maxCycles) {
        stopExtremeLoudAlarm();
        return;
      }
      cycleCount++;

      const now = ctx.currentTime;

      // Master High-Gain Booster Node (Extreme Loud Volume)
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(2.4, now); // 240% gain boost
      masterGain.connect(ctx.destination);

      // Primary High-Pitch Piercing Siren (880Hz -> 1480Hz)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1480, now + 0.35);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.7);

      const osc1Gain = ctx.createGain();
      osc1Gain.gain.setValueAtTime(0.95, now);
      osc1Gain.gain.exponentialRampToValueAtTime(0.01, now + 0.75);

      osc1.connect(osc1Gain);
      osc1Gain.connect(masterGain);

      // Secondary Low-Frequency Urgency Buzzer (440Hz -> 880Hz)
      const osc2 = ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(660, now + 0.2);
      osc2.frequency.setValueAtTime(880, now + 0.4);

      const osc2Gain = ctx.createGain();
      osc2Gain.gain.setValueAtTime(0.85, now);
      osc2Gain.gain.exponentialRampToValueAtTime(0.01, now + 0.75);

      osc2.connect(osc2Gain);
      osc2Gain.connect(masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.8);
      osc2.stop(now + 0.8);
    };

    // Play immediate pulse, then repeat every 850ms
    playSirenPulse();
    currentAlarmInterval = window.setInterval(playSirenPulse, 850);

    // Text-to-Speech Vocal Siren Alert
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const speechText = `Attention ${department || 'Team'}! Task ${taskTitle} starts in 10 minutes. Prepare your station now!`;
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.volume = 1.0;
        utterance.rate = 1.05;
        utterance.pitch = 1.15;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[Alarm] Speech synthesis error:', err);
      }
    }
  } catch (err) {
    console.error('[Alarm] Extreme alarm playback error:', err);
  }
};

/**
 * Stops any ongoing alarm sound and voice announcements
 */
export const stopExtremeLoudAlarm = () => {
  isAlarmCurrentlyPlaying = false;
  if (currentAlarmInterval !== null) {
    clearInterval(currentAlarmInterval);
    currentAlarmInterval = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {}
  }
};

/**
 * Requests native browser/PWA notification permission
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[Notification] Permission request error:', err);
    return 'default';
  }
};

/**
 * Sends a native PWA / Web notification directly to user's mobile screen
 */
export const sendTaskNativeNotification = (task: TaskItem, minutesRemaining: number) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notifTitle = `🚨 UPCOMING TASK ALERT (${minutesRemaining} MIN REMINDER)`;
    const notifBody = `📍 [${task.department || 'Operations'}] ${task.title}\n⏰ Scheduled for: ${task.startTime || 'Soon'} • Immediate Station Prep Required!`;

    // 1. If Service Worker is available, use showNotification for background PWA push
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(notifTitle, {
          body: notifBody,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: `pretask-alarm-${task.id}`,
          requireInteraction: true,
          vibrate: [600, 200, 600, 200, 1000, 300, 1000],
          data: {
            taskId: task.id,
            url: '/',
          },
        } as any);
      });
    } else {
      // 2. Direct Web Notification fallback
      const notif = new Notification(notifTitle, {
        body: notifBody,
        icon: '/icon.svg',
        tag: `pretask-alarm-${task.id}`,
        requireInteraction: true,
      } as any);

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
  } catch (err) {
    console.error('[Notification] Send notification error:', err);
  }
};

// Set of already notified task IDs for today
const notifiedTaskIds = new Set<string>();

/**
 * Evaluates all tasks and triggers the 10-minute pre-task alarm & notification
 */
export const checkPreTaskAlarms = (
  tasks: TaskItem[],
  onTriggerAlarm?: (task: TaskItem, minutesRemaining: number) => void,
  referenceDate: Date = new Date()
) => {
  if (!tasks || tasks.length === 0) return;

  const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();

  tasks.forEach((task) => {
    // Only check active incomplete tasks with a scheduled startTime
    if (task.completed || !task.startTime) return;

    const startMinutes = parseTimeToMinutes(task.startTime);
    if (startMinutes === null) return;

    // Calculate time until start
    const minutesRemaining = startMinutes - currentMinutes;

    // Trigger when 10 minutes or less remain before start time (e.g., between 1 and 10 mins)
    if (minutesRemaining > 0 && minutesRemaining <= 10) {
      const alarmKey = `${task.id}-${referenceDate.toDateString()}-10min`;

      if (!notifiedTaskIds.has(alarmKey)) {
        notifiedTaskIds.add(alarmKey);
        console.log(`[PreTaskAlarm] 🚨 Triggering 10-minute extreme alarm for task "${task.title}" (${minutesRemaining}m remaining)`);

        // 1. Play extreme loud sound & voice siren
        playExtremeLoudAlarm(task.title, task.department as string);

        // 2. Send native mobile notification
        sendTaskNativeNotification(task, minutesRemaining);

        // 3. Trigger in-app visual alarm modal
        if (onTriggerAlarm) {
          onTriggerAlarm(task, minutesRemaining);
        }
      }
    }
  });
};

/**
 * Immediate Test of the Extreme Loud Alarm & Native Mobile Notification
 */
export const triggerTestPreTaskAlarm = async (
  sampleTask?: Partial<TaskItem>,
  onTriggerAlarm?: (task: TaskItem, minutesRemaining: number) => void
) => {
  const perm = await requestNotificationPermission();

  const testTask: TaskItem = {
    id: `test-alarm-${Date.now()}`,
    title: sampleTask?.title || 'Kitchen Station Prep & Appliance Heating',
    department: sampleTask?.department || 'Kitchen',
    checklistHeader: sampleTask?.checklistHeader || 'Kitchen Opening Checklist',
    startTime: sampleTask?.startTime || '10:00 AM',
    endTime: '11:00 AM',
    priority: 'urgent',
    completed: false,
    ...sampleTask,
  };

  playExtremeLoudAlarm(testTask.title, testTask.department as string);

  if (perm === 'granted') {
    sendTaskNativeNotification(testTask, 10);
  }

  if (onTriggerAlarm) {
    onTriggerAlarm(testTask, 10);
  }
};
