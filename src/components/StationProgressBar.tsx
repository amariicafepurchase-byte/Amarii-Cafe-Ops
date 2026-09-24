import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  TrendingUp,
  Flame,
  Check,
  Zap,
} from 'lucide-react';
import { StationMode } from './StationSelectorModal';

interface StationProgressBarProps {
  currentStation: StationMode;
  totalTasks: number;
  completedTasks: number;
  urgentRemainingCount: number;
  isLightMode: boolean;
  activeStaffName?: string;
}

interface StationThemeConfig {
  name: string;
  lightFill: string;
  darkFill: string;
  lightText: string;
  darkText: string;
  lightBadge: string;
  darkBadge: string;
  lightBorder: string;
  darkBorder: string;
}

const STATION_THEMES: Record<string, StationThemeConfig> = {
  Kitchen: {
    name: 'Kitchen & Food Prep Station',
    lightFill: 'bg-[#E05A47]',
    darkFill: 'bg-[#E05A47]',
    lightText: 'text-[#E05A47]',
    darkText: 'text-[#E05A47]',
    lightBadge: 'bg-red-50 text-red-700 border-red-200',
    darkBadge: 'bg-red-950/50 text-red-300 border-red-800/60',
    lightBorder: 'border-red-300',
    darkBorder: 'border-red-900/50',
  },
  Bar: {
    name: 'Barista & Beverage Station',
    lightFill: 'bg-purple-600',
    darkFill: 'bg-purple-500',
    lightText: 'text-purple-700',
    darkText: 'text-purple-400',
    lightBadge: 'bg-purple-50 text-purple-700 border-purple-200',
    darkBadge: 'bg-purple-950/50 text-purple-300 border-purple-800/60',
    lightBorder: 'border-purple-300',
    darkBorder: 'border-purple-900/50',
  },
  Housekeeping: {
    name: 'Housekeeping & Hygiene Station',
    lightFill: 'bg-emerald-600',
    darkFill: 'bg-emerald-500',
    lightText: 'text-emerald-700',
    darkText: 'text-emerald-400',
    lightBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    darkBadge: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60',
    lightBorder: 'border-emerald-300',
    darkBorder: 'border-emerald-900/50',
  },
  Service: {
    name: 'Service & Dining Floor Station',
    lightFill: 'bg-blue-600',
    darkFill: 'bg-blue-500',
    lightText: 'text-blue-700',
    darkText: 'text-blue-400',
    lightBadge: 'bg-blue-50 text-blue-700 border-blue-200',
    darkBadge: 'bg-blue-950/50 text-blue-300 border-blue-800/60',
    lightBorder: 'border-blue-300',
    darkBorder: 'border-blue-900/50',
  },
  Billing: {
    name: 'Cashier & POS Station',
    lightFill: 'bg-amber-500',
    darkFill: 'bg-amber-400',
    lightText: 'text-amber-800',
    darkText: 'text-amber-400',
    lightBadge: 'bg-amber-50 text-amber-800 border-amber-200',
    darkBadge: 'bg-amber-950/50 text-amber-300 border-amber-800/60',
    lightBorder: 'border-amber-300',
    darkBorder: 'border-amber-900/50',
  },
  Manager: {
    name: 'Master Operations Hub (All Departments)',
    lightFill: 'bg-zinc-950',
    darkFill: 'bg-[#EDE8DC]',
    lightText: 'text-zinc-950',
    darkText: 'text-[#EDE8DC]',
    lightBadge: 'bg-zinc-100 text-zinc-900 border-zinc-300',
    darkBadge: 'bg-white/10 text-[#EDE8DC] border-white/20',
    lightBorder: 'border-zinc-300',
    darkBorder: 'border-[#244332]',
  },
};

export const StationProgressBar: React.FC<StationProgressBarProps> = ({
  currentStation,
  totalTasks,
  completedTasks,
  urgentRemainingCount,
  isLightMode,
  activeStaffName,
}) => {
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const remainingTasks = Math.max(0, totalTasks - completedTasks);
  const isComplete = totalTasks > 0 && completedTasks === totalTasks;

  const stationTheme =
    STATION_THEMES[currentStation] || STATION_THEMES.Manager;

  // Color-coded bar fill based on theme and completion status
  const getFillClass = () => {
    if (isComplete) {
      return isLightMode ? 'bg-emerald-600' : 'bg-emerald-500';
    }
    return isLightMode ? stationTheme.lightFill : stationTheme.darkFill;
  };

  return (
    <div
      id="station-progress-bar-container"
      className={`mb-4 sm:mb-6 p-3.5 sm:p-4 border-2 transition-all duration-200 shadow-sm ${
        isLightMode
          ? 'bg-white border-zinc-300 text-zinc-950'
          : 'bg-[#16281E] border-[#244332] text-[#F7F4EB]'
      }`}
    >
      {/* Header Row: Station Label + Live Stats + Percentage */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border ${
                isLightMode ? stationTheme.lightBadge : stationTheme.darkBadge
              }`}
            >
              {currentStation.toUpperCase()} PROGRESS
            </span>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight">
              {stationTheme.name}
            </h3>
          </div>

          {activeStaffName && (
            <span
              className={`text-[11px] font-medium hidden sm:inline ${
                isLightMode ? 'text-zinc-500' : 'text-zinc-400'
              }`}
            >
              • Logged as <strong>{activeStaffName}</strong>
            </span>
          )}
        </div>

        {/* Completion Figures */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {urgentRemainingCount > 0 && (
            <span
              className={`text-[11px] font-black uppercase tracking-tight px-2 py-0.5 flex items-center gap-1 border animate-pulse ${
                isLightMode
                  ? 'bg-red-50 text-red-700 border-red-300'
                  : 'bg-red-950/60 text-red-400 border-red-800/60'
              }`}
            >
              <AlertCircle className="w-3 h-3 stroke-[2.5]" />
              {urgentRemainingCount} Urgent Left
            </span>
          )}

          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xs font-black uppercase tracking-tight ${
                isLightMode ? 'text-zinc-600' : 'text-zinc-400'
              }`}
            >
              {completedTasks}/{totalTasks} Done
            </span>
            <span
              id="station-progress-percentage"
              className={`text-base sm:text-lg font-black font-mono tracking-tight ${
                isComplete
                  ? isLightMode
                    ? 'text-emerald-600'
                    : 'text-emerald-400'
                  : isLightMode
                  ? stationTheme.lightText
                  : stationTheme.darkText
              }`}
            >
              {percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Progress Track Bar */}
      <div
        id="station-progress-track"
        className={`relative w-full h-3 sm:h-3.5 border overflow-hidden rounded-xs ${
          isLightMode
            ? 'bg-zinc-100 border-zinc-300'
            : 'bg-[#0D1812] border-[#244332]'
        }`}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${stationTheme.name} completion progress`}
      >
        <div
          id="station-progress-fill"
          className={`h-full transition-all duration-500 ease-out flex items-center justify-end pr-1 ${getFillClass()}`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        >
          {percentage >= 20 && (
            <span className="text-[9px] font-black text-white font-mono drop-shadow-xs hidden sm:inline select-none">
              {percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Sub-bar Status Footnote */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 text-[11px] font-bold uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          {isComplete ? (
            <span className="flex items-center gap-1 text-emerald-500 font-black">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All {totalTasks} Station Tasks Cleared
            </span>
          ) : totalTasks === 0 ? (
            <span
              className={isLightMode ? 'text-zinc-500' : 'text-zinc-400'}
            >
              No tasks currently registered for this station
            </span>
          ) : (
            <span
              className={`flex items-center gap-1 ${
                isLightMode ? 'text-zinc-600' : 'text-zinc-300'
              }`}
            >
              <Clock className="w-3 h-3 text-[#E05A47]" />
              {remainingTasks} {remainingTasks === 1 ? 'Task' : 'Tasks'} Pending Completion
            </span>
          )}
        </div>

        {totalTasks > 0 && (
          <div
            className={`text-[10px] font-mono font-medium ${
              isLightMode ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          >
            {isComplete ? (
              <span className="text-emerald-500 font-black flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Shift Ready
              </span>
            ) : (
              <span>Shift Progress: {completedTasks} of {totalTasks}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
