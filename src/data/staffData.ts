import { StaffMember, TaskDepartment } from '../types';

export const INITIAL_STAFF: StaffMember[] = [
  // 1. General Management & Admin - Hemen Das (Owner & Sole Controller)
  {
    id: 'staff-admin-hemen',
    name: 'Hemen Das',
    email: 'admin@amarii.cafe',
    phone: '+91 98765 43260',
    outlet: 'Amarii Cafe Kothrud',
    password: 'admin123',
    pin: '9987',
    isActive: true,
    department: 'Management',
    designation: 'General Manager & Owner',
    roleType: 'manager',
    avatarColor: 'bg-zinc-900 text-white',
    active: true,
  },

  // 2. Kitchen Department Head Chef - Aditya
  {
    id: 'staff-chef-aditya',
    name: 'Aditya',
    email: 'aditya123@gmail.com',
    phone: '99876543210',
    outlet: 'Amarii Cafe Kothrud',
    password: 'chef123',
    pin: '1234',
    isActive: true,
    department: 'Kitchen',
    designation: 'Head Chef',
    roleType: 'employee',
    avatarColor: 'bg-red-500 text-white',
    active: true,
  },

  // 3. Manager - Abhinash Dcosta (from Firestore database staff collection)
  {
    id: 'staff-manager-abhinash',
    name: 'Abhinash Dcosta',
    email: 'abhinashdcosta@yahoo.com',
    phone: '9123935207',
    outlet: 'Amarii Cafe Kothrud',
    password: '2255',
    pin: '2255',
    isActive: true,
    department: 'Management',
    designation: 'Manager',
    roleType: 'manager',
    avatarColor: 'bg-red-500 text-white',
    active: true,
  },
];

export const DEPARTMENTS: TaskDepartment[] = [
  'Kitchen',
  'Bar',
  'Housekeeping',
  'Service',
  'Billing',
  'Management',
  'Cashier & Front of House (FOH)',
  'Barista & Beverage Station',
  'Kitchen & Food Prep',
  'Closing & Maintenance',
  'Inventory',
  'Maintenance',
  'General',
];

export const DEPARTMENT_COLORS: Record<TaskDepartment, { bg: string; text: string; border: string; badge: string }> = {
  'Cashier & Front of House (FOH)': {
    bg: 'bg-amber-950/40',
    text: 'text-amber-400',
    border: 'border-amber-700/60',
    badge: 'bg-amber-400 text-black font-black',
  },
  'Barista & Beverage Station': {
    bg: 'bg-purple-950/40',
    text: 'text-purple-400',
    border: 'border-purple-700/60',
    badge: 'bg-purple-500 text-white font-black',
  },
  'Kitchen & Food Prep': {
    bg: 'bg-red-950/40',
    text: 'text-red-400',
    border: 'border-red-700/60',
    badge: 'bg-red-500 text-white font-black',
  },
  'Closing & Maintenance': {
    bg: 'bg-teal-950/40',
    text: 'text-teal-400',
    border: 'border-teal-700/60',
    badge: 'bg-teal-500 text-black font-black',
  },
  Kitchen: {
    bg: 'bg-red-950/40',
    text: 'text-red-400',
    border: 'border-red-800/60',
    badge: 'bg-red-500 text-black',
  },
  Bar: {
    bg: 'bg-purple-950/40',
    text: 'text-purple-400',
    border: 'border-purple-800/60',
    badge: 'bg-purple-500 text-white',
  },
  Housekeeping: {
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-400',
    border: 'border-emerald-800/60',
    badge: 'bg-emerald-500 text-black',
  },
  Service: {
    bg: 'bg-blue-950/40',
    text: 'text-blue-400',
    border: 'border-blue-800/60',
    badge: 'bg-blue-500 text-white',
  },
  Billing: {
    bg: 'bg-amber-950/40',
    text: 'text-amber-400',
    border: 'border-amber-800/60',
    badge: 'bg-amber-400 text-black',
  },
  Management: {
    bg: 'bg-zinc-900',
    text: 'text-white',
    border: 'border-white',
    badge: 'bg-white text-black',
  },
  Inventory: {
    bg: 'bg-orange-950/40',
    text: 'text-orange-400',
    border: 'border-orange-800/60',
    badge: 'bg-orange-500 text-black',
  },
  Maintenance: {
    bg: 'bg-yellow-950/40',
    text: 'text-yellow-400',
    border: 'border-yellow-800/60',
    badge: 'bg-yellow-500 text-black',
  },
  General: {
    bg: 'bg-zinc-900',
    text: 'text-zinc-300',
    border: 'border-zinc-700',
    badge: 'bg-zinc-700 text-white',
  },
};
