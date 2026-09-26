import React, { useState, useEffect, useRef } from 'react';
import {
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Clock,
  History,
  FileText,
  PlusCircle,
  Share2,
  Check,
  Users,
  Plus,
  Zap,
  Download,
  Utensils,
  Layers,
  Smartphone,
  Flame,
  Lock,
  ChevronDown,
  Bot,
  Sun,
  Moon,
  LogOut,
  Shield,
  ShieldCheck,
  BarChart3,
  Building2,
  MapPin,
  Trash2,
  SlidersHorizontal,
  MoreHorizontal,
  Wifi,
  WifiOff,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import { TaskItem, StaffMember, TaskDepartment } from '../types';
import { StationMode } from './StationSelectorModal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useOutlet } from '../context/OutletContext';

interface HeaderProps {
  tasks: TaskItem[];
  staffList: StaffMember[];
  activeStaff: StaffMember | null;
  currentStation: StationMode;
  onOpenStationModal: () => void;
  onOpenInstallModal: () => void;
  isInstallable: boolean;
  isFirebaseConnected: boolean;
  onOpenPasteModal?: () => void;
  onOpenHistoryModal: () => void;
  onOpenAssignModal?: () => void;
  onOpenStaffModal: () => void;
  onToggleViewMode: () => void;
  isScannableMode: boolean;
  onCopyBrief: () => void;
  copied: boolean;
  onToggleAnalytics?: () => void;
  isAnalyticsActive?: boolean;
  onOpenPdfModal?: () => void;
  onOpenDataCleanup?: () => void;
  onOpenTaskDirectory?: () => void;
  pendingQueueCount?: number;
  isOnline?: boolean;
  isQueueSyncing?: boolean;
  onTriggerQueueSync?: () => void;
  onOpenDiagnostics?: () => void;
  firestoreConnectionState?: 'connected' | 'connecting' | 'error' | 'offline';
  onOpenAdminApprovals?: () => void;
  pendingApprovalCount?: number;
  onOpenTaskRegister?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tasks = [],
  staffList = [],
  activeStaff,
  currentStation,
  onOpenStationModal,
  onOpenInstallModal,
  isInstallable,
  isFirebaseConnected,
  onOpenPasteModal,
  onOpenHistoryModal,
  onOpenAssignModal,
  onOpenStaffModal,
  onToggleViewMode,
  isScannableMode,
  onCopyBrief,
  copied,
  onToggleAnalytics,
  isAnalyticsActive = false,
  onOpenPdfModal,
  onOpenDataCleanup,
  onOpenTaskDirectory,
  pendingQueueCount = 0,
  isOnline = true,
  isQueueSyncing = false,
  onTriggerQueueSync,
  onOpenDiagnostics,
  firestoreConnectionState = 'connected',
  onOpenAdminApprovals,
  pendingApprovalCount = 0,
  onOpenTaskRegister,
}) => {
  const { theme, isLightMode, toggleTheme } = useTheme();
  const {
    currentUser,
    logout,
    canAddTask,
    canSwitchStations,
    isAdmin,
    isManager,
    isStaff,
    canAccessTools,
  } = useAuth();
  const {
    activeOutlet,
    setActiveOutlet,
    availableOutlets,
    isOutletLocked,
    outlets,
    openOutletModal,
  } = useOutlet();
  const [isOutletDropdownOpen, setIsOutletDropdownOpen] = useState(false);
  const outletDropdownRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (outletDropdownRef.current && !outletDropdownRef.current.contains(event.target as Node)) {
        setIsOutletDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOutletDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
      );
      setCurrentDate(
        now
          .toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' })
          .toUpperCase()
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const totalCount = safeTasks.length;
  const completedCount = safeTasks.filter((t) => t?.completed).length;
  const urgentCount = safeTasks.filter((t) => t?.priority === 'urgent' && !t?.completed).length;
  const pendingCount = safeTasks.filter((t) => t?.priority === 'pending' && !t?.completed).length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Active staff count
  const activeStaffCount = Array.isArray(staffList)
    ? staffList.filter((s) => s && s.isActive !== false && s.active !== false).length
    : 2;

  // Active departments count
  const depts = new Set(safeTasks.map((t) => t?.department || 'General'));

  // Determine current shift based on hour
  const getShiftName = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) return 'ALPHA — MORNING PREP';
    if (hour >= 11 && hour < 16) return 'BRAVO — LUNCH RUSH';
    if (hour >= 16 && hour < 19) return 'CHARLIE — INVENTORY';
    if (hour >= 19 && hour < 23) return 'DELTA — DINNER PEAK';
    return 'OMEGA — NIGHT AUDIT';
  };

  const getStationBadgeColor = () => {
    switch (currentStation) {
      case 'Kitchen':
        return 'bg-red-500 text-black border-red-500';
      case 'Bar':
        return 'bg-purple-500 text-white border-purple-500';
      case 'Housekeeping':
        return 'bg-emerald-500 text-black border-emerald-500';
      case 'Service':
        return 'bg-blue-500 text-white border-blue-500';
      case 'Billing':
        return 'bg-amber-400 text-black border-amber-400';
      default:
        return isLightMode ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-black border-white';
    }
  };

  return (
    <header
      id="app-header"
      className={`border-b-4 sm:border-b-6 pb-3 sm:pb-5 pt-3 sm:pt-6 px-3.5 sm:px-6 max-w-7xl mx-auto w-full shadow-lg transition-colors duration-200 ${
        isLightMode
          ? 'bg-white text-zinc-950 border-zinc-900'
          : 'bg-[#16281E] text-[#F7F4EB] border-[#244332]'
      }`}
    >
      {/* 1. Top Meta Bar: Outlet on left; Theme, Logout & Clock on right (Guaranteed 0 overlap) */}
      <div
        className={`flex items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b mb-2.5 sm:mb-3 text-xs ${
          isLightMode ? 'border-zinc-200' : 'border-[#244332]'
        }`}
      >
        {/* Left: Outlet Selector */}
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
          {/* Outlet Selector Dropdown or Location Badge */}
          {!isOutletLocked && (isAdmin || isManager) ? (
            <div className="relative flex-shrink-0" ref={outletDropdownRef}>
              <button
                type="button"
                id="header-outlet-selector-btn"
                onClick={() => setIsOutletDropdownOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 text-xs font-black uppercase tracking-tight border shadow-xs transition cursor-pointer rounded-xs hover:opacity-95 active:scale-95 flex-shrink-0 ${
                  isLightMode
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-400'
                    : 'bg-amber-950/70 hover:bg-amber-900/80 text-amber-200 border-amber-600/70'
                }`}
                title="Switch Active Outlet Branch"
              >
                <Building2 className="w-3.5 h-3.5 text-[#E05A47] flex-shrink-0" />
                <span className="max-w-[110px] sm:max-w-[200px] truncate">
                  {activeOutlet.replace(/^Amarii\s*[-–]\s*/i, '')}
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 flex-shrink-0 ${
                    isOutletDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOutletDropdownOpen && (
                <div
                  id="header-outlet-dropdown-menu"
                  className={`absolute left-0 mt-1.5 w-60 border-2 shadow-2xl z-50 p-1.5 rounded-sm ${
                    isLightMode
                      ? 'bg-white border-zinc-400 text-zinc-900'
                      : 'bg-[#111F17] border-[#244332] text-white'
                  }`}
                >
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 mb-1 flex items-center justify-between">
                    <span>Active Outlet Branch</span>
                    <span className="font-mono text-zinc-400">{availableOutlets.length} total</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-0.5 modal-scroll-area">
                    {availableOutlets.map((outlet) => {
                      const isSelected = outlet === activeOutlet;
                      return (
                        <button
                          key={outlet}
                          type="button"
                          id={`outlet-dropdown-item-${outlet.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                          onClick={() => {
                            setActiveOutlet(outlet);
                            setIsOutletDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs font-bold text-left cursor-pointer transition rounded-xs ${
                            isSelected
                              ? 'bg-[#E05A47] text-white font-black'
                              : isLightMode
                              ? 'hover:bg-zinc-100 text-zinc-800'
                              : 'hover:bg-[#1A3024] text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <MapPin
                              className={`w-3.5 h-3.5 flex-shrink-0 ${
                                isSelected ? 'text-white' : 'text-[#E05A47]'
                              }`}
                            />
                            <span className="truncate">{outlet}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {isAdmin && (
                    <div className="pt-1.5 mt-1 border-t border-zinc-200 dark:border-zinc-800">
                      <button
                        type="button"
                        id="header-outlet-dropdown-manage-btn"
                        onClick={() => {
                          setIsOutletDropdownOpen(false);
                          openOutletModal();
                        }}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-black cursor-pointer transition rounded-xs"
                      >
                        <Plus className="w-3 h-3 stroke-[3]" />
                        <span>Manage Outlets</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              id="header-outlet-staff-locked-badge"
              className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold border rounded-xs select-none flex-shrink-0 ${
                isLightMode
                  ? 'bg-zinc-100 text-zinc-800 border-zinc-300'
                  : 'bg-[#111F17] text-zinc-300 border-[#244332]'
              }`}
              title={`Physical Location: ${activeOutlet}`}
            >
              <MapPin className="w-3.5 h-3.5 text-[#E05A47] flex-shrink-0" />
              <span className="truncate max-w-[110px] sm:max-w-[160px] font-semibold">
                {activeOutlet.replace(/^Amarii\s*[-–]\s*/i, '')}
              </span>
            </div>
          )}
        </div>

        {/* Right: Theme Icon + Logout Icon + Clock */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Clean Theme Toggle Icon Button */}
          <button
            type="button"
            id="header-theme-toggle-icon-btn"
            onClick={toggleTheme}
            className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center border rounded-xs transition cursor-pointer active:scale-95 shadow-xs flex-shrink-0 ${
              isLightMode
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-300'
                : 'bg-[#111F17] hover:bg-[#1D3528] text-amber-300 border-[#244332]'
            }`}
            title={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            aria-label={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {isLightMode ? (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-zinc-900 stroke-zinc-900" />
            ) : (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 stroke-[2.5]" />
            )}
          </button>

          {/* Clean Logout Icon Button */}
          <button
            type="button"
            id="header-logout-icon-btn"
            onClick={logout}
            className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center border rounded-xs transition cursor-pointer active:scale-95 shadow-xs flex-shrink-0 ${
              isLightMode
                ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:border-red-400'
                : 'bg-red-950/40 hover:bg-red-900/60 text-red-300 border-red-900/50 hover:border-red-700'
            }`}
            title="Logout and lock screen"
            aria-label="Logout"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
          </button>

          {/* Digital Clock */}
          <span
            className={`text-xs sm:text-sm font-black tabular-nums font-mono pl-0.5 sm:pl-1 flex-shrink-0 whitespace-nowrap ${
              isLightMode ? 'text-zinc-950' : 'text-zinc-200'
            }`}
          >
            {currentTime ? currentTime.replace(/:\d{2}\s/, ' ') : '12:00 PM'}
          </span>
        </div>
      </div>

      {/* 2. Main Brand Row: Title + Shift Subtitle + Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        {/* Brand Title & Shift Subtitle (Plain text - no duplicate modal trigger) */}
        <div>
          <h1
            className={`text-2xl sm:text-4xl lg:text-5xl font-black uppercase leading-none tracking-tight ${
              isLightMode ? 'text-zinc-950' : 'text-white'
            }`}
          >
            AMARII CAFÉ <span className="text-[#E05A47]">OPS</span>
          </h1>
          <p
            className={`mt-0.5 sm:mt-1 font-bold tracking-wider uppercase text-[10px] sm:text-xs flex items-center gap-1.5 ${
              isLightMode ? 'text-zinc-600' : 'text-[#EDE8DC]/80'
            }`}
          >
            <span>
              {currentStation === 'Manager'
                ? `${getShiftName()} • Master Operations Hub`
                : `${getShiftName()} • ${currentStation} Station`}
            </span>
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
          </p>
        </div>

        {/* Action Controls: Staff Button + Admin Profile Badge + Live Icon */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap overflow-x-auto no-scrollbar py-0.5">
          {/* Staff Icon Button with Count - HEMEN DAS ONLY */}
          {canAccessTools && (
            <button
              type="button"
              id="header-staff-btn"
              onClick={onOpenStaffModal}
              className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-black uppercase tracking-tight transition cursor-pointer border rounded-xs shadow-xs flex-shrink-0 ${
                isLightMode
                  ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-950 border-zinc-300'
                  : 'bg-[#111F17] hover:bg-[#1D3528] text-white border-[#244332]'
              }`}
              title="Manage Staff & Shift Roster (Hemen Das)"
              aria-label="Staff Members"
            >
              <Users className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="font-mono font-black text-xs">({activeStaffCount})</span>
            </button>
          )}

          {/* Authenticated User / Admin Profile Badge (Moved here to eliminate top bar overlap) */}
          {currentUser && (
            <div
              id="header-user-profile-badge"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border rounded-xs flex-shrink-0 shadow-xs ${
                isLightMode
                  ? 'bg-zinc-100 text-zinc-950 border-zinc-300'
                  : 'bg-[#111F17] text-white border-[#244332]'
              }`}
              title={`Logged in as ${currentUser.name} (${currentUser.role})`}
            >
              <span
                className={`text-[9px] sm:text-[10px] font-black uppercase px-1.5 py-0.5 rounded-xs tracking-wider flex-shrink-0 leading-tight ${
                  isAdmin
                    ? 'bg-red-600 text-white'
                    : isManager
                    ? 'bg-purple-600 text-white'
                    : 'bg-amber-400 text-black'
                }`}
              >
                {currentUser.role}
              </span>
              <span className="font-black text-xs whitespace-nowrap text-inherit">
                {currentUser.name}
              </span>
            </div>
          )}

          {/* Clean Live Sync Status Icon with Diagnostic Modal Integration */}
          <button
            type="button"
            id="header-task-queue-status-btn"
            onClick={() => {
              if (onOpenDiagnostics) {
                onOpenDiagnostics();
              } else if (onTriggerQueueSync) {
                onTriggerQueueSync();
              }
            }}
            disabled={isQueueSyncing}
            className={`w-8 h-8 flex items-center justify-center text-xs font-black uppercase tracking-tight transition cursor-pointer border rounded-xs shadow-xs flex-shrink-0 ${
              firestoreConnectionState === 'error' || !isOnline
                ? isLightMode
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-400'
                  : 'bg-amber-950/70 hover:bg-amber-900 text-amber-200 border-amber-700'
                : pendingQueueCount > 0
                ? isLightMode
                  ? 'bg-blue-100 hover:bg-blue-200 text-blue-950 border-blue-400'
                  : 'bg-blue-950/70 hover:bg-blue-900 text-blue-200 border-blue-700'
                : isLightMode
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-emerald-950/50 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
            }`}
            title={
              !isOnline
                ? `Offline: ${pendingQueueCount} pending task(s) - Click for Firestore Diagnostics`
                : pendingQueueCount > 0
                ? `Syncing: ${pendingQueueCount} task(s) queued - Click for Firestore Diagnostics`
                : 'Cloud Database Connected & Synced - Click for Firestore Diagnostics'
            }
            aria-label="Live sync status & diagnostics"
          >
            {!isOnline || firestoreConnectionState === 'error' ? (
              <WifiOff className="w-4 h-4 text-amber-500 animate-pulse" />
            ) : pendingQueueCount > 0 ? (
              <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
            ) : (
              <div className="relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="absolute w-4 h-4 rounded-full bg-emerald-400/40 animate-ping" />
              </div>
            )}
          </button>

          {/* Admin Task Approval Queue Button (Hemen Das / Owner Only) */}
          {(isAdmin || isManager) && onOpenAdminApprovals && (
            <button
              type="button"
              id="header-admin-approvals-btn"
              onClick={onOpenAdminApprovals}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 font-black uppercase text-xs tracking-tight transition shadow-xs cursor-pointer border rounded-xs flex-shrink-0 relative ${
                (pendingApprovalCount || 0) > 0
                  ? 'bg-amber-500 hover:bg-amber-400 text-black border-amber-600 animate-pulse'
                  : isLightMode
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border-emerald-300'
                  : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-800'
              }`}
              title="Inspect Photo Proofs & Approve Staff Tasks"
            >
              <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Admin Approvals</span>
              {(pendingApprovalCount || 0) > 0 && (
                <span className="px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-mono font-black rounded-full ml-0.5">
                  {pendingApprovalCount}
                </span>
              )}
            </button>
          )}

          {/* Master Task Register & Ledger Button (Hemen Das & Managers) */}
          {(isAdmin || isManager) && onOpenTaskRegister && (
            <button
              type="button"
              id="header-task-register-btn"
              onClick={onOpenTaskRegister}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 font-black uppercase text-xs tracking-tight transition shadow-xs cursor-pointer border rounded-xs flex-shrink-0 ${
                isLightMode
                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-700'
                  : 'bg-red-600 hover:bg-red-500 text-white border-red-500'
              }`}
              title="Open Master Task Register & Historical Audit (Hemen Das)"
            >
              <ClipboardList className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>📋 Task Register</span>
            </button>
          )}

          {/* Task Directory Button (Hemen Das Only) */}
          {canAccessTools && onOpenTaskDirectory && (
            <button
              type="button"
              id="header-task-directory-btn"
              onClick={onOpenTaskDirectory}
              className={`hidden sm:inline-flex items-center justify-center gap-1.5 px-3 py-1.5 font-black uppercase text-xs tracking-tight transition shadow-xs cursor-pointer border rounded-xs flex-shrink-0 ${
                isLightMode
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-300 hover:border-blue-500'
                  : 'bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border-blue-800/60 hover:border-blue-500'
              }`}
              title="Manage Master Task Directory"
            >
              <ClipboardList className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Task Directory</span>
            </button>
          )}
        </div>
      </div>

      {/* High-Contrast Daily Checklist Status Bar */}
      {totalCount > 0 && (
        <div
          className={`mt-3 sm:mt-6 pt-3 sm:pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-bold uppercase tracking-wider ${
            isLightMode ? 'border-zinc-300' : 'border-zinc-800'
          }`}
        >
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 border ${
                isLightMode
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-950'
                  : 'bg-zinc-900 border-zinc-800 text-white'
              }`}
            >
              <ClipboardList className={`w-3.5 h-3.5 ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`} />
              <span className={`font-black ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>
                {completedCount}/{totalCount} Done
              </span>
              <span className={`font-mono ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                ({percentage}%)
              </span>
            </div>

            {currentStation === 'Manager' ? (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 border ${
                  isLightMode
                    ? 'bg-zinc-100 border-zinc-300 text-zinc-900'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                }`}
              >
                <Layers className={`w-3.5 h-3.5 ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`} />
                <span>{depts.size} Departments Active</span>
              </div>
            ) : (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 border ${
                  isLightMode
                    ? 'bg-zinc-100 border-zinc-300 text-zinc-900'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-red-500" />
                <span>{currentStation} Tasks Only</span>
              </div>
            )}

            {urgentCount > 0 ? (
              <div
                className={`flex items-center gap-1 px-2.5 py-1 sm:py-1.5 font-black animate-pulse ${
                  isLightMode ? 'bg-red-600 text-white' : 'bg-red-500 text-black'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 stroke-[3]" />
                <span>{urgentCount} Urgent</span>
              </div>
            ) : (
              <div
                className={`flex items-center gap-1 border px-2.5 py-1 sm:py-1.5 ${
                  isLightMode
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black'
                    : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All Urgent Cleared</span>
              </div>
            )}

            {pendingCount > 0 && (
              <div
                className={`flex items-center gap-1 border px-2.5 py-1 sm:py-1.5 ${
                  isLightMode
                    ? 'bg-amber-100 text-amber-900 border-amber-300 font-black'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{pendingCount} Pending Approval</span>
              </div>
            )}
          </div>

          {/* Progress Velocity Bar */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span
              className={`text-[10px] sm:text-[11px] whitespace-nowrap ${
                isLightMode ? 'text-zinc-600 font-bold' : 'text-zinc-400'
              }`}
            >
              Completion
            </span>
            <div
              className={`flex-1 sm:w-32 h-2 sm:h-2.5 border overflow-hidden ${
                isLightMode ? 'bg-zinc-200 border-zinc-400' : 'bg-zinc-900 border-zinc-800'
              }`}
            >
              <div
                className={`h-full transition-all duration-300 ${
                  isLightMode ? 'bg-zinc-950' : 'bg-white'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span
              className={`text-[10px] font-mono sm:hidden ${
                isLightMode ? 'text-zinc-950 font-black' : 'text-white'
              }`}
            >
              {percentage}%
            </span>
          </div>
        </div>
      )}
    </header>
  );
};

