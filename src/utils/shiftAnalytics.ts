import { TaskItem, TaskDepartment } from '../types';

export interface StationDailyMetric {
  station: string;
  department: TaskDepartment | string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  timeSpentMinutes: number;
  timePlannedMinutes: number;
  urgentTotal: number;
  urgentCompleted: number;
  mediaCount: number;
  color: string;
}

export interface ShiftSummaryData {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  shiftCompletionRate: number;
  totalTimeSpentMinutes: number;
  totalPlannedTimeMinutes: number;
  totalTimeSpentFormatted: string;
  totalPlannedTimeFormatted: string;
  urgentTotal: number;
  urgentCompleted: number;
  urgentCompletionRate: number;
  mediaVerifiedCount: number;
  mediaVerificationRate: number;
  stationMetrics: StationDailyMetric[];
  completedTasksList: TaskItem[];
  pendingTasksList: TaskItem[];
}

/**
 * Standard cafe stations for cross-departmental operations
 */
export const CAFE_STATIONS: Array<{
  id: string;
  label: string;
  departments: string[];
  color: string;
}> = [
  {
    id: 'Kitchen',
    label: 'Kitchen Station',
    departments: ['kitchen', 'kitchen & food prep', 'food prep', 'pantry'],
    color: '#E05A47', // Warm Terra Cotta Red
  },
  {
    id: 'Bar',
    label: 'Bar & Espresso Station',
    departments: ['bar', 'barista', 'barista & beverage station', 'beverage'],
    color: '#A855F7', // Roast Purple
  },
  {
    id: 'Billing',
    label: 'Billing & Cashier Station',
    departments: ['billing', 'cashier', 'cashier & front of house (foh)', 'accounts', 'pos'],
    color: '#E5A93C', // Amber Gold
  },
  {
    id: 'Service',
    label: 'Service & Floor Station',
    departments: ['service', 'floor', 'front of house', 'guest service', 'dining'],
    color: '#3B82F6', // Cobalt Blue
  },
  {
    id: 'Housekeeping',
    label: 'Housekeeping Station',
    departments: ['housekeeping', 'cleaning', 'hygiene', 'restroom', 'sanitation', 'maintenance'],
    color: '#22C55E', // Emerald Green
  },
  {
    id: 'Management',
    label: 'Management & Audits',
    departments: ['management', 'admin', 'manager', 'audit', 'general operations', 'general'],
    color: '#14B8A6', // Teal
  },
];

/**
 * Parse time strings like "09:00 AM", "10:30 PM", "14:00" to minutes from midnight
 */
export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3]?.toUpperCase();

  if (modifier) {
    if (hours === 12 && modifier === 'AM') {
      hours = 0;
    } else if (hours < 12 && modifier === 'PM') {
      hours += 12;
    }
  }

  return hours * 60 + minutes;
}

/**
 * Calculate task time duration in minutes from startTime and endTime / deadline.
 * Fallback to an estimated reasonable duration if times are omitted or invalid.
 */
export function calculateTaskDurationMinutes(task: TaskItem): number {
  const startMin = parseTimeToMinutes(task.startTime);
  const endMin = parseTimeToMinutes(task.endTime || task.deadline);

  if (startMin !== null && endMin !== null) {
    let diff = endMin - startMin;
    if (diff < 0) {
      // Handles shift crossing midnight (e.g. 10:30 PM to 01:00 AM)
      diff += 1440;
    }
    if (diff > 0 && diff <= 480) {
      return diff;
    }
  }

  // Fallback estimation based on subtasks or default 30 mins
  if (task.subTasks && task.subTasks.length > 0) {
    return Math.min(15 + task.subTasks.length * 10, 90);
  }

  return 30;
}

/**
 * Format minutes into human-readable hours and minutes (e.g., "3h 45m" or "40m")
 */
export function formatMinutesToHuman(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${mins}m`;
}

/**
 * Map a task to one of the standard Cafe Stations
 */
export function resolveTaskStation(task: TaskItem): string {
  const dept = (task.department || '').toLowerCase();
  const header = (task.checklistHeader || '').toLowerCase();
  const title = (task.title || '').toLowerCase();

  for (const station of CAFE_STATIONS) {
    if (station.departments.some((d) => dept.includes(d))) {
      return station.id;
    }
  }

  // Secondary checklist header matching
  if (header.includes('kitchen')) return 'Kitchen';
  if (header.includes('bar')) return 'Bar';
  if (header.includes('cashier') || header.includes('billing')) return 'Billing';
  if (header.includes('service') || header.includes('floor')) return 'Service';
  if (header.includes('housekeeping') || header.includes('clean')) return 'Housekeeping';
  if (header.includes('management') || header.includes('general')) return 'Management';

  // Title keywords matching
  if (title.includes('kitchen') || title.includes('cook') || title.includes('prep')) return 'Kitchen';
  if (title.includes('espresso') || title.includes('coffee') || title.includes('bar') || title.includes('beverage')) return 'Bar';
  if (title.includes('pos') || title.includes('cash') || title.includes('float') || title.includes('edc')) return 'Billing';
  if (title.includes('table') || title.includes('dining') || title.includes('guest')) return 'Service';
  if (title.includes('mop') || title.includes('restroom') || title.includes('trash') || title.includes('clean')) return 'Housekeeping';

  return 'Management';
}

/**
 * Aggregate daily tasks across all stations to produce comprehensive shift metrics
 */
export function aggregateDailyShiftSummary(tasks: TaskItem[]): ShiftSummaryData {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const totalTasks = safeTasks.length;
  const completedTasksList = safeTasks.filter((t) => t.completed);
  const pendingTasksList = safeTasks.filter((t) => !t.completed);

  const completedCount = completedTasksList.length;
  const pendingCount = pendingTasksList.length;
  const shiftCompletionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // Time spent on completed tasks
  const totalTimeSpentMinutes = completedTasksList.reduce(
    (acc, t) => acc + calculateTaskDurationMinutes(t),
    0
  );

  // Total planned time across all shift tasks
  const totalPlannedTimeMinutes = safeTasks.reduce(
    (acc, t) => acc + calculateTaskDurationMinutes(t),
    0
  );

  // Urgent metrics
  const urgentTasks = safeTasks.filter((t) => t.priority === 'urgent');
  const urgentCompleted = urgentTasks.filter((t) => t.completed).length;
  const urgentCompletionRate =
    urgentTasks.length > 0 ? Math.round((urgentCompleted / urgentTasks.length) * 100) : 100;

  // Media proofs
  const mediaVerifiedCount = completedTasksList.filter(
    (t) => t.media && t.media.length > 0
  ).length;
  const mediaVerificationRate =
    completedCount > 0 ? Math.round((mediaVerifiedCount / completedCount) * 100) : 0;

  // Aggregate per Station
  const stationMetrics: StationDailyMetric[] = CAFE_STATIONS.map((stationDef) => {
    const stationTasks = safeTasks.filter((t) => resolveTaskStation(t) === stationDef.id);
    const sTotal = stationTasks.length;
    const sCompletedList = stationTasks.filter((t) => t.completed);
    const sCompleted = sCompletedList.length;
    const sRate = sTotal > 0 ? Math.round((sCompleted / sTotal) * 100) : 0;

    const sTimeSpent = sCompletedList.reduce(
      (acc, t) => acc + calculateTaskDurationMinutes(t),
      0
    );
    const sTimePlanned = stationTasks.reduce(
      (acc, t) => acc + calculateTaskDurationMinutes(t),
      0
    );

    const sUrgent = stationTasks.filter((t) => t.priority === 'urgent');
    const sUrgentDone = sUrgent.filter((t) => t.completed).length;
    const sMedia = sCompletedList.reduce(
      (acc, t) => acc + (t.media ? t.media.length : 0),
      0
    );

    return {
      station: stationDef.id,
      department: stationDef.label,
      totalTasks: sTotal,
      completedTasks: sCompleted,
      completionRate: sRate,
      timeSpentMinutes: sTimeSpent,
      timePlannedMinutes: sTimePlanned,
      urgentTotal: sUrgent.length,
      urgentCompleted: sUrgentDone,
      mediaCount: sMedia,
      color: stationDef.color,
    };
  });

  return {
    totalTasks,
    completedTasks: completedCount,
    pendingTasks: pendingCount,
    shiftCompletionRate,
    totalTimeSpentMinutes,
    totalPlannedTimeMinutes,
    totalTimeSpentFormatted: formatMinutesToHuman(totalTimeSpentMinutes),
    totalPlannedTimeFormatted: formatMinutesToHuman(totalPlannedTimeMinutes),
    urgentTotal: urgentTasks.length,
    urgentCompleted,
    urgentCompletionRate,
    mediaVerifiedCount,
    mediaVerificationRate,
    stationMetrics,
    completedTasksList,
    pendingTasksList,
  };
}
