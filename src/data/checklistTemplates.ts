import { TaskDepartment } from '../types';

export interface TemplateTaskDef {
  title: string;
  details?: string;
  section?: string;
  department: TaskDepartment;
  stationId?: string;
  categoryHeader?: string;
  subCategory?: string;
  priority: 'urgent' | 'pending' | 'normal';
  timeEstimate?: string;
  isPhotoMandatory?: boolean;
  isVideoMandatory?: boolean;
  isNoteMandatory?: boolean;
  mandatoryMedia?: 'photo' | 'video' | 'none';
  notesPlaceholder?: string;
}

// Hardcoded dummy checklist templates are disabled so only user-created checklists exist.
export const PREDEFINED_CHECKLIST_TEMPLATES: Record<string, TemplateTaskDef[]> = {};

export const STATION_DEFAULT_HEADERS: Record<string, string[]> = {};
