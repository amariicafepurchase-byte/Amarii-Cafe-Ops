export type TaskPriority = 'urgent' | 'today' | 'pending';

export type TaskDepartment =
  | 'Kitchen'
  | 'Bar'
  | 'Housekeeping'
  | 'Service'
  | 'Billing'
  | 'Management'
  | 'Inventory'
  | 'Maintenance'
  | 'General'
  | 'Cashier & Front of House (FOH)'
  | 'Barista & Beverage Station'
  | 'Kitchen & Food Prep'
  | 'Closing & Maintenance';

export type RoleType = 'manager' | 'employee';

export interface Outlet {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  isDefault?: boolean;
  createdAt?: string;
}

export const INITIAL_OUTLETS: Outlet[] = [
  {
    id: 'outlet-kothrud',
    name: 'Amarii Cafe Kothrud',
    address: 'near apple salon mayur colony kothrud',
    phone: '',
    isDefault: true,
  },
  {
    id: 'outlet-aundh',
    name: 'Amarii Cafe Aundh',
    address: 'Aundh, Pune',
    phone: '',
    isDefault: false,
  },
];

export const OUTLETS = [
  'Amarii Cafe Kothrud',
  'Amarii Cafe Aundh',
] as const;

export type OutletName = typeof OUTLETS[number] | string;
export const DEFAULT_OUTLET: OutletName = 'Amarii Cafe Kothrud';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  outlet: string;
  password?: string;
  isActive: boolean;
  department: TaskDepartment;
  designation: string;
  roleType: RoleType;
  avatarColor?: string;
  active?: boolean;
  pin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskMedia {
  id: string;
  type: 'photo' | 'video';
  url: string; // base64 or blob URL
  name: string;
  size?: string;
  uploadedAt: string;
}

export type ChecklistHeader =
  | 'Kitchen Opening Checklist'
  | 'Kitchen Closing Checklist'
  | 'Bar Opening Checklist'
  | 'Bar Closing Checklist'
  | 'Cashier Opening/Closing'
  | 'Service Opening/Closing'
  | 'Housekeeping Opening/Closing'
  | 'General Operations';

export const CHECKLIST_HEADERS: ChecklistHeader[] = [
  'Kitchen Opening Checklist',
  'Kitchen Closing Checklist',
  'Bar Opening Checklist',
  'Bar Closing Checklist',
  'Cashier Opening/Closing',
  'Service Opening/Closing',
  'Housekeeping Opening/Closing',
  'General Operations',
];

export const HEADER_TIME_SUGGESTIONS: Record<string, { start: string; end: string }> = {
  'Kitchen Opening Checklist': { start: '08:30 AM', end: '10:00 AM' },
  'Kitchen Closing Checklist': { start: '10:00 PM', end: '11:30 PM' },
  'Bar Opening Checklist': { start: '09:00 AM', end: '10:30 AM' },
  'Bar Closing Checklist': { start: '10:00 PM', end: '11:15 PM' },
  'Cashier Opening/Closing': { start: '09:30 AM', end: '11:30 PM' },
  'Service Opening/Closing': { start: '09:30 AM', end: '11:00 PM' },
  'Housekeeping Opening/Closing': { start: '08:00 AM', end: '11:30 PM' },
  'General Operations': { start: '09:00 AM', end: '06:00 PM' },
};

export interface SubTaskItem {
  id: string;
  title: string;
  isDone: boolean;
  isPhotoMandatory?: boolean;
  isVideoMandatory?: boolean;
  isNoteMandatory?: boolean;
  mandatoryMedia?: 'photo' | 'video' | 'none'; // backwards compatibility
  completedAt?: string;
  completedBy?: string;
  media?: TaskMedia[];
  notes?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  details?: string;
  priority: TaskPriority;
  department?: TaskDepartment | string;
  completed: boolean;
  deadline?: string;
  checklistHeader?: ChecklistHeader | string;
  startTime?: string;
  endTime?: string;
  subTasks?: SubTaskItem[];
  assignee?: string;
  assigneeId?: string;
  assigneeDesignation?: string;
  assigneeRoleType?: RoleType;
  media?: TaskMedia[];
  notes?: string;
  sourceRaw?: string;
  completedAt?: string;
  completedBy?: string;
  isPhotoMandatory?: boolean;
  isVideoMandatory?: boolean;
  isNoteMandatory?: boolean;
  mandatoryMedia?: 'photo' | 'video' | 'none';
  outlet?: string;
  approvalStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface AnalysisResult {
  summary: string;
  urgentTasks: TaskItem[];
  todayChecklist: TaskItem[];
  pendingFollowUps: TaskItem[];
  closingQuestion: string;
  rawText: string;
  analyzedAt: string;
}

export interface ReportCardData {
  title: string;
  generatedAt: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  urgentTasks: number;
  completionRate: number;
  station: string;
  outlet: string;
  summary: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  completedTaskIds?: string[];
  uncompletedTaskIds?: string[];
  addedTasks?: TaskItem[];
  reportData?: ReportCardData;
}

export interface ShiftRecord {
  id: string;
  timestamp: string;
  label: string;
  totalTasks: number;
  completedTasks: number;
  result: AnalysisResult;
}

export type AuthRole = 'admin' | 'manager' | 'staff';

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  role: AuthRole;
  department?: TaskDepartment | string;
  designation: string;
  avatarColor?: string;
  stationLocked?: boolean;
  outlet?: string;
  isActive?: boolean;
  phone?: string;
}

