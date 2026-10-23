import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, AuthRole, TaskDepartment } from '../types';

export interface AuthContextType {
  currentUser: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
  // Permissions - ONLY Hemen Das has tool and management access
  canAccessTools: boolean;
  canViewAllDepartments: boolean;
  canAddTask: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
  canOverrideMandatory: boolean;
  canSwitchStations: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isManager: boolean;
  staffStation: string | undefined;
}

const STORAGE_KEY_AUTH = 'amarii_auth_session_v1';

export const isHemenDas = (user?: { name?: string; email?: string; id?: string; role?: string } | null): boolean => {
  if (!user) return false;
  const name = (user.name || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  const id = (user.id || '').toLowerCase();
  const role = (user.role || '').toLowerCase();
  return (
    name.includes('hemen') ||
    name.includes('arjun') ||
    email.includes('hemen') ||
    email.includes('arjun') ||
    role === 'admin' ||
    role === 'owner' ||
    email === 'admin@amarii.cafe' ||
    email === 'hemen@amarii.cafe' ||
    email === 'hemen.das@amarii.cafe' ||
    email === 'amariicafe.purchase@gmail.com' ||
    id === 'staff-admin-hemen' ||
    id === 'user-admin'
  );
};

export const PRESET_USERS: AuthUser[] = [
  {
    id: 'staff-admin-hemen',
    name: 'Hemen Das',
    email: 'admin@amarii.cafe',
    role: 'admin',
    designation: 'General Manager & Owner',
    department: 'Management',
    avatarColor: 'bg-zinc-900 text-white',
    outlet: 'Amarii Cafe Kothrud',
  },
  {
    id: 'staff-chef-aditya',
    name: 'Aditya',
    email: 'aditya123@gmail.com',
    role: 'staff',
    designation: 'Head Chef',
    department: 'Kitchen',
    avatarColor: 'bg-red-500 text-white',
    stationLocked: true,
    outlet: 'Amarii Cafe Kothrud',
  },
  {
    id: 'staff-manager-abhinash',
    name: 'Abhinash Dcosta',
    email: 'abhinashdcosta@yahoo.com',
    phone: '9123935207',
    role: 'manager',
    designation: 'Manager',
    department: 'Management',
    avatarColor: 'bg-red-500 text-white',
    stationLocked: false,
    outlet: 'Amarii Cafe Kothrud',
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      if (saved) {
        return JSON.parse(saved) as AuthUser;
      }
    } catch (e) {
      console.warn('Failed to parse auth session:', e);
    }
    // Initially unauthenticated so full-screen login screen appears first
    return null;
  });

  const login = (user: AuthUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to persist auth session:', e);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    } catch (e) {
      console.warn('Failed to clear auth session:', e);
    }
  };

  // Sync session state across multiple open tabs in real-time
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_AUTH) {
        if (e.newValue) {
          try {
            setCurrentUser(JSON.parse(e.newValue));
          } catch {}
        } else {
          setCurrentUser(null);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const isCurrentUserHemenDas = isHemenDas(currentUser);
  const userRole = (currentUser?.role || (currentUser as any)?.roleType || (currentUser as any)?.roleCategory || '').toLowerCase();
  
  const isAdmin = isCurrentUserHemenDas || userRole === 'admin' || userRole === 'owner';
  const isManager = !isAdmin && (
    userRole === 'manager' ||
    userRole === 'lead' ||
    userRole.includes('manager') ||
    (currentUser?.designation && (
      currentUser.designation.toLowerCase().includes('manager') ||
      currentUser.designation.toLowerCase().includes('lead')
    ))
  );
  const isStaff = !isAdmin && !isManager;

  // Permissions:
  // - Admin (Hemen Das): Full direct control over everything (editing tasks, creating templates, system config)
  // - Manager / Lead: View & switch all stations, complete/submit checklists for all departments, access tools, but CANNOT directly edit core task templates (triggers Edit Request proposal)
  // - Staff / Employee: Locked to primary station, fill out assigned station checklist
  const canAccessTools = isAdmin || isManager;
  const canViewAllDepartments = isAdmin || isManager;
  const canSwitchStations = isAdmin || isManager;
  const canAddTask = isAdmin;
  const canEditTask = isAdmin; // Direct edit restricted strictly to Admin
  const canDeleteTask = isAdmin;
  const canOverrideMandatory = isAdmin || isManager;

  // Map staff department to station
  const staffStation = currentUser?.department;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        isAuthenticated: !!currentUser,
        canAccessTools,
        canViewAllDepartments,
        canAddTask,
        canEditTask,
        canDeleteTask,
        canOverrideMandatory,
        canSwitchStations,
        isStaff,
        isAdmin,
        isManager,
        staffStation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
