import React, { useState } from 'react';
import {
  Utensils,
  Coffee,
  Sparkles,
  ConciergeBell,
  CreditCard,
  Briefcase,
  Lock,
  Check,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Users,
} from 'lucide-react';
import { TaskDepartment, StaffMember } from '../types';
import { useTheme } from '../context/ThemeContext';

export type StationMode = TaskDepartment | 'Manager';

interface StationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStation: StationMode;
  onSelectStation: (station: StationMode) => void;
  taskCountsByDept: Record<string, { total: number; completed: number }>;
  activeStaff: StaffMember | null;
  staffList: StaffMember[];
  onSelectActiveStaff: (staff: StaffMember | null) => void;
  isManagerUnlocked: boolean;
  onManagerUnlock: (pin: string) => boolean;
  isLightMode?: boolean;
}

const STATIONS: Array<{
  id: StationMode;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  accentBg: string;
  borderClass: string;
  badgeClass: string;
  description: string;
}> = [
  {
    id: 'Kitchen',
    title: 'Kitchen Station',
    subtitle: 'Food Prep, Cooking & Hygiene',
    icon: <Utensils className="w-5 h-5 stroke-[2.5]" />,
    color: '#E05A47',
    accentBg: 'bg-[#E05A47]/10 hover:bg-[#E05A47]/20',
    borderClass: 'border-[#E05A47]',
    badgeClass: 'bg-[#E05A47] text-white',
    description: 'Displays ONLY Kitchen tasks. Locked for Kitchen staff.',
  },
  {
    id: 'Bar',
    title: 'Bar Station',
    subtitle: 'Espresso, Beverages & Cocktails',
    icon: <Coffee className="w-5 h-5 stroke-[2.5]" />,
    color: '#A855F7',
    accentBg: 'bg-purple-500/10 hover:bg-purple-500/20',
    borderClass: 'border-purple-500',
    badgeClass: 'bg-purple-500 text-white',
    description: 'Displays ONLY Bar & Coffee station tasks. Locked for Bar staff.',
  },
  {
    id: 'Housekeeping',
    title: 'Housekeeping Station',
    subtitle: 'Cleaning, Restrooms & Hygiene',
    icon: <Sparkles className="w-5 h-5 stroke-[2.5]" />,
    color: '#22C55E',
    accentBg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    borderClass: 'border-emerald-500',
    badgeClass: 'bg-emerald-500 text-black',
    description: 'Displays ONLY Housekeeping tasks. Cleanliness logs & hygiene.',
  },
  {
    id: 'Service',
    title: 'Service Station',
    subtitle: 'Floor, Tables & Guest Experience',
    icon: <ConciergeBell className="w-5 h-5 stroke-[2.5]" />,
    color: '#3B82F6',
    accentBg: 'bg-blue-500/10 hover:bg-blue-500/20',
    borderClass: 'border-blue-500',
    badgeClass: 'bg-blue-500 text-white',
    description: 'Displays ONLY Service & Floor tasks. Table prep & guest orders.',
  },
  {
    id: 'Billing',
    title: 'Billing Station',
    subtitle: 'Cash Register, POS & Accounts',
    icon: <CreditCard className="w-5 h-5 stroke-[2.5]" />,
    color: '#E5A93C',
    accentBg: 'bg-amber-500/10 hover:bg-amber-500/20',
    borderClass: 'border-amber-500',
    badgeClass: 'bg-amber-400 text-black',
    description: 'Displays ONLY Billing & Cash register tasks.',
  },
  {
    id: 'Manager',
    title: 'Manager / Master Hub',
    subtitle: 'All Departments & Full Operations',
    icon: <Briefcase className="w-5 h-5 stroke-[2.5]" />,
    color: '#F7F4EB',
    accentBg: 'bg-white/10 hover:bg-white/20',
    borderClass: 'border-[#EDE8DC]',
    badgeClass: 'bg-[#EDE8DC] text-black',
    description: 'Manager master view with all departments (Requires Manager PIN).',
  },
];

export const StationSelectorModal: React.FC<StationSelectorModalProps> = ({
  isOpen,
  onClose,
  currentStation,
  onSelectStation,
  taskCountsByDept = {},
  activeStaff,
  staffList = [],
  onSelectActiveStaff,
  isManagerUnlocked,
  onManagerUnlock,
  isLightMode: isLightModeProp,
}) => {
  const { isLightMode: themeIsLightMode } = useTheme();
  const isLightMode = isLightModeProp ?? themeIsLightMode;
  const [tab, setTab] = useState<'station' | 'staff'>('station');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [targetStationToUnlock, setTargetStationToUnlock] = useState<StationMode | null>(null);

  if (!isOpen) return null;

  const safeStaffList = Array.isArray(staffList) ? staffList : [];
  const safeTaskCounts = taskCountsByDept || {};

  const isStaffEmployee = activeStaff && activeStaff.roleType === 'employee';
  const isLockedForEmployee = isStaffEmployee && !isManagerUnlocked;

  const handleStationClick = (stationId: StationMode) => {
    // If staff is an employee and trying to switch to a different department or manager hub
    if (isStaffEmployee && activeStaff.department !== stationId && !isManagerUnlocked) {
      setTargetStationToUnlock(stationId);
      setShowPinDialog(true);
      setPinError(`Station is locked for ${activeStaff.name} (${activeStaff.department}). Enter Manager PIN to switch.`);
      return;
    }

    onSelectStation(stationId);
    onClose();
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;

    const success = onManagerUnlock(pinInput.trim());
    if (success) {
      setPinError('');
      setShowPinDialog(false);
      if (targetStationToUnlock) {
        onSelectStation(targetStationToUnlock);
        setTargetStationToUnlock(null);
      }
      onClose();
    } else {
      setPinError('Incorrect Manager PIN. Authorization failed.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="station-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-hidden"
    >
      <div
        className={`border-2 sm:border-4 w-full max-w-xl shadow-2xl max-h-[92vh] overflow-y-auto modal-scroll-area rounded-sm transition-colors ${
          isLightMode
            ? 'bg-white border-zinc-400 text-zinc-950'
            : 'bg-[#16281E] border-[#244332] text-[#F7F4EB]'
        }`}
      >
        {/* Header */}
        <div className="bg-[#E05A47] text-white p-3.5 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 sm:p-2 bg-black/30 rounded">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 id="station-modal-title" className="text-sm sm:text-base font-black uppercase tracking-tight">
                Department Station & Staff Lock
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/80 font-mono">
                Amarii Café • Assigned Staff Isolation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white hover:bg-black/20 font-black text-xl transition cursor-pointer rounded"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher: Station vs Staff Login */}
        <div
          className={`flex border-b text-xs font-black uppercase tracking-tight ${
            isLightMode
              ? 'bg-zinc-100 border-zinc-200'
              : 'bg-[#111F17] border-[#244332]'
          }`}
        >
          <button
            type="button"
            onClick={() => setTab('station')}
            className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 flex items-center justify-center gap-2 border-r transition cursor-pointer ${
              isLightMode ? 'border-zinc-200' : 'border-[#244332]'
            } ${
              tab === 'station'
                ? isLightMode
                  ? 'bg-white text-[#E05A47] border-b-2 border-b-[#E05A47] font-black shadow-xs'
                  : 'bg-[#16281E] text-[#E05A47] border-b-2 border-b-[#E05A47]'
                : isLightMode
                ? 'text-zinc-600 hover:text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Station View
          </button>
          <button
            type="button"
            onClick={() => setTab('staff')}
            className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 flex items-center justify-center gap-2 transition cursor-pointer ${
              tab === 'staff'
                ? isLightMode
                  ? 'bg-white text-[#E05A47] border-b-2 border-b-[#E05A47] font-black shadow-xs'
                  : 'bg-[#16281E] text-[#E05A47] border-b-2 border-b-[#E05A47]'
                : isLightMode
                ? 'text-zinc-600 hover:text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Active Staff Login ({activeStaff ? activeStaff.name.split(' ')[0] : 'None'})
          </button>
        </div>

        {/* Active Staff Lock Banner */}
        <div
          className={`px-4 sm:px-5 py-2.5 border-b flex items-center justify-between text-xs ${
            isLightMode
              ? 'bg-zinc-50 border-zinc-200'
              : 'bg-[#111F17] border-[#244332]'
          }`}
        >
          <div className="flex items-center gap-2">
            {isLockedForEmployee ? (
              <ShieldAlert className="w-4 h-4 text-[#E05A47] shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
            <div>
              <span className={`font-bold ${isLightMode ? 'text-zinc-700' : 'text-zinc-200'}`}>
                Active Staff: <span className={`font-black ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>{activeStaff ? `${activeStaff.name} (${activeStaff.designation})` : 'Master Admin / Unassigned'}</span>
              </span>
              {isLockedForEmployee && (
                <p className="text-[10px] text-[#E05A47] font-semibold">
                  🔒 Locked to {activeStaff.department} tasks only. Cannot view other departments without Manager PIN.
                </p>
              )}
            </div>
          </div>
          {isLockedForEmployee && (
            <button
              type="button"
              onClick={() => {
                setShowPinDialog(true);
                setPinError('');
              }}
              className="px-2.5 py-1 bg-[#E05A47] text-white text-[10px] font-black uppercase tracking-tight hover:bg-[#D44A35] transition cursor-pointer shrink-0 rounded-xs"
            >
              Manager Unlock
            </button>
          )}
        </div>

        {/* PIN Override Modal / Box */}
        {showPinDialog && (
          <div
            className={`p-3.5 sm:p-4 border-b-2 border-[#E05A47] animate-fade-in ${
              isLightMode ? 'bg-amber-50' : 'bg-black/60'
            }`}
          >
            <form onSubmit={handleVerifyPin} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#E05A47] flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" /> Enter Manager PIN
                </span>
                <button
                  type="button"
                  onClick={() => setShowPinDialog(false)}
                  className={`text-xs ${isLightMode ? 'text-zinc-600 hover:text-black' : 'text-zinc-400 hover:text-white'}`}
                >
                  Cancel
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Manager PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className={`flex-1 border px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-[#E05A47] rounded-xs ${
                    isLightMode
                      ? 'bg-white border-zinc-300 text-zinc-950 placeholder-zinc-400'
                      : 'bg-[#16281E] border-[#244332] text-white'
                  }`}
                  maxLength={10}
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#E05A47] hover:bg-[#D44A35] text-white font-black text-xs uppercase cursor-pointer rounded-xs"
                >
                  Authorize
                </button>
              </div>
              {pinError && <p className="text-[11px] text-red-500 font-semibold">{pinError}</p>}
            </form>
          </div>
        )}

        {/* Tab 1: Stations */}
        {tab === 'station' && (
          <div className="p-3.5 sm:p-5 space-y-2.5 sm:space-y-3">
            {STATIONS.map((st) => {
              const isSelected = currentStation === st.id;
              const stats = safeTaskCounts[st.id] || { total: 0, completed: 0 };
              const isRestrictedForUser = isStaffEmployee && activeStaff.department !== st.id && !isManagerUnlocked;

              return (
                <div
                  key={st.id}
                  role="button"
                  tabIndex={0}
                  id={`station-card-${st.id.toLowerCase()}`}
                  onClick={() => handleStationClick(st.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleStationClick(st.id);
                    }
                  }}
                  className={`p-3 sm:p-3.5 border-2 transition cursor-pointer text-left relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xs ${
                    isSelected
                      ? isLightMode
                        ? `${st.borderClass} bg-amber-50/70 ring-2 ring-[#E05A47]/40 shadow-sm`
                        : `${st.borderClass} bg-[#1D3528] ring-2 ring-[#E05A47]/40 shadow-lg`
                      : isRestrictedForUser
                      ? isLightMode
                        ? 'border-zinc-200 bg-zinc-50/80 opacity-75 hover:opacity-100 hover:border-[#E05A47]/40'
                        : 'border-[#244332]/50 bg-[#111F17]/80 opacity-75 hover:opacity-100 hover:border-[#E05A47]/40'
                      : isLightMode
                      ? 'border-zinc-200 bg-white hover:border-[#E05A47]/60 hover:bg-zinc-50 shadow-xs'
                      : 'border-[#244332] bg-[#16281E] hover:border-[#E05A47]/60 hover:bg-[#1D3528]'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className="p-2 sm:p-2.5 shrink-0 text-white font-black rounded-xs shadow-xs"
                      style={{ backgroundColor: st.color }}
                    >
                      {st.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className={`text-xs sm:text-sm font-black uppercase tracking-tight ${
                            isLightMode ? 'text-zinc-950' : 'text-white'
                          }`}
                        >
                          {st.title}
                        </h3>
                        {isSelected && (
                          <span className="px-1.5 sm:px-2 py-0.5 bg-[#E05A47] text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 rounded-xs">
                            <Check className="w-3 h-3 stroke-[3]" /> Active Station
                          </span>
                        )}
                        {isRestrictedForUser && (
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-mono flex items-center gap-1 rounded-xs ${
                              isLightMode ? 'bg-zinc-200 text-zinc-700' : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            <Lock className="w-2.5 h-2.5" /> PIN Required
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] sm:text-xs mt-0.5 ${isLightMode ? 'text-zinc-600 font-medium' : 'text-zinc-300'}`}>
                        {st.subtitle}
                      </p>
                      <p className={`text-[10px] sm:text-[11px] mt-0.5 max-w-sm ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {st.description}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`flex items-center sm:flex-col sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 gap-1 shrink-0 ${
                      isLightMode ? 'border-zinc-200' : 'border-[#244332]'
                    }`}
                  >
                    {st.id !== 'Manager' ? (
                      <div className="text-right">
                        <span
                          className={`text-[10px] font-mono uppercase font-bold ${
                            isLightMode ? 'text-zinc-700' : 'text-zinc-300'
                          }`}
                        >
                          Tasks: {stats.completed}/{stats.total}
                        </span>
                        <div
                          className={`w-20 h-1.5 mt-1 overflow-hidden rounded-full ${
                            isLightMode ? 'bg-zinc-200' : 'bg-zinc-800'
                          }`}
                        >
                          <div
                            className="h-full bg-[#E05A47] transition-all"
                            style={{
                              width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span
                        className={`text-[10px] font-mono uppercase font-bold ${
                          isLightMode ? 'text-zinc-700' : 'text-zinc-300'
                        }`}
                      >
                        Master View
                      </span>
                    )}

                    <button
                      type="button"
                      className={`px-2.5 sm:px-3 py-1 text-xs font-black uppercase tracking-tight transition cursor-pointer mt-1 rounded-xs ${
                        isSelected
                          ? 'bg-[#E05A47] text-white shadow-xs'
                          : isRestrictedForUser
                          ? isLightMode
                            ? 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          : isLightMode
                          ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300'
                          : 'bg-[#244332] text-zinc-200 hover:text-white'
                      }`}
                    >
                      {isSelected ? 'Selected' : isRestrictedForUser ? 'Locked (PIN)' : 'Switch Here'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Staff Selection */}
        {tab === 'staff' && (
          <div className="p-3.5 sm:p-5 space-y-3">
            <p className={`text-xs ${isLightMode ? 'text-zinc-600' : 'text-zinc-300'} mb-2`}>
              Select who is operating this device. Non-manager staff will be strictly locked to their department's tasks.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Master Admin */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  onSelectActiveStaff(null);
                  onClose();
                }}
                className={`p-2.5 sm:p-3 border-2 transition cursor-pointer flex items-center justify-between rounded-xs ${
                  activeStaff === null
                    ? isLightMode
                      ? 'border-[#E05A47] bg-amber-50 shadow-xs'
                      : 'border-[#E05A47] bg-[#1D3528]'
                    : isLightMode
                    ? 'border-zinc-200 bg-white hover:border-zinc-400'
                    : 'border-[#244332] bg-[#16281E] hover:border-zinc-500'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-zinc-800 text-white rounded flex items-center justify-center font-black text-xs">
                    GM
                  </div>
                  <div>
                    <h4 className={`text-xs font-black uppercase ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>General Manager / Admin</h4>
                    <span className={`text-[10px] ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'} block`}>Full Station Access</span>
                  </div>
                </div>
                {activeStaff === null && <Check className="w-4 h-4 text-[#E05A47]" />}
              </div>

              {/* Staff list */}
              {safeStaffList
                .filter((stf) => stf.isActive !== false && stf.active !== false)
                .map((stf) => {
                  const isSelected = activeStaff?.id === stf.id;
                  return (
                    <div
                      key={stf.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        onSelectActiveStaff(stf);
                        onSelectStation(stf.department);
                        onClose();
                      }}
                      className={`p-2.5 sm:p-3 border-2 transition cursor-pointer flex items-center justify-between rounded-xs ${
                        isSelected
                          ? isLightMode
                            ? 'border-[#E05A47] bg-amber-50 shadow-xs'
                            : 'border-[#E05A47] bg-[#1D3528]'
                          : isLightMode
                          ? 'border-zinc-200 bg-white hover:border-zinc-400'
                          : 'border-[#244332] bg-[#16281E] hover:border-zinc-500'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className={`w-8 h-8 ${stf.avatarColor || 'bg-red-500'} text-white rounded flex items-center justify-center font-black text-xs flex-shrink-0`}>
                          {stf.name.charAt(0)}
                        </div>
                        <div className="truncate">
                          <h4 className={`text-xs font-black uppercase truncate ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>{stf.name}</h4>
                          <span className={`text-[10px] truncate block ${isLightMode ? 'text-zinc-600' : 'text-zinc-300'}`}>
                            {stf.department} • {stf.designation} {stf.roleType === 'manager' ? '(Manager)' : '(Locked)'}
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#E05A47] flex-shrink-0" />}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          className={`p-3 sm:p-4 border-t flex items-center justify-between ${
            isLightMode
              ? 'bg-zinc-100 border-zinc-300'
              : 'bg-[#111F17] border-[#244332]'
          }`}
        >
          <span className={`text-[11px] font-mono ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
            🔒 Authorized Staff Access Only
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 font-black uppercase text-xs tracking-tight transition cursor-pointer rounded-xs ${
              isLightMode
                ? 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs'
                : 'bg-[#244332] hover:bg-[#315742] text-white'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
