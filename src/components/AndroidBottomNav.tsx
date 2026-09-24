import React from 'react';
import {
  ClipboardList,
  Plus,
  Bot,
  Lock,
  SlidersHorizontal,
} from 'lucide-react';
import { StationMode } from './StationSelectorModal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { triggerHaptic } from '../utils/haptics';

interface AndroidBottomNavProps {
  activeTab: 'tasks' | 'station' | 'staff' | 'chat' | 'brief';
  setActiveTab: (tab: 'tasks' | 'station' | 'staff' | 'chat' | 'brief') => void;
  currentStation: StationMode;
  onOpenStationModal: () => void;
  onOpenAssignModal: () => void;
  onOpenStaffModal?: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  onOpenTools?: () => void;
  isToolsOpen?: boolean;
  tasksCount: number;
  remainingTasksCount: number;
  urgentCount: number;
  staffCount?: number;
  onOpenAnalytics?: () => void;
  isAnalyticsActive?: boolean;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  activeTab,
  setActiveTab,
  currentStation,
  onOpenStationModal,
  onOpenAssignModal,
  onToggleChat,
  isChatOpen,
  onOpenTools,
  isToolsOpen = false,
  remainingTasksCount,
  urgentCount,
}) => {
  const { isLightMode } = useTheme();
  const { canAddTask, canSwitchStations, canAccessTools } = useAuth();

  return (
    <nav
      id="android-bottom-nav"
      aria-label="Android Mobile Navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t-2 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-bottom sm:hidden ${
        isLightMode
          ? 'bg-white/95 border-zinc-300 text-zinc-900'
          : 'bg-zinc-950/95 border-zinc-800 text-zinc-100'
      }`}
    >
      {/* 1. Tasks / Shift */}
      <button
        type="button"
        id="android-nav-tasks"
        onClick={() => {
          triggerHaptic('light');
          setActiveTab('tasks');
          if (isChatOpen) onToggleChat();
        }}
        className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 transition relative cursor-pointer min-h-[48px] ${
          activeTab === 'tasks' && !isChatOpen && !isToolsOpen
            ? isLightMode
              ? 'text-zinc-950 font-black'
              : 'text-white font-black'
            : isLightMode
            ? 'text-zinc-500 font-bold'
            : 'text-zinc-400 font-bold'
        }`}
      >
        <div className="relative">
          <ClipboardList className={`w-5 h-5 ${activeTab === 'tasks' && !isChatOpen && !isToolsOpen ? 'stroke-[2.5]' : ''}`} />
          {urgentCount > 0 ? (
            <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
              {urgentCount}
            </span>
          ) : remainingTasksCount > 0 ? (
            <span
              className={`absolute -top-1 -right-2 text-[9px] font-black px-1 rounded-full flex items-center justify-center ${
                isLightMode ? 'bg-zinc-200 text-zinc-800' : 'bg-zinc-700 text-white'
              }`}
            >
              {remainingTasksCount}
            </span>
          ) : null}
        </div>
        <span className="text-[10px] uppercase tracking-tighter mt-1">Tasks</span>
      </button>

      {/* 2. Station Switcher */}
      <button
        type="button"
        id="android-nav-station"
        onClick={() => {
          triggerHaptic('light');
          if (canSwitchStations) onOpenStationModal();
        }}
        className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 transition relative min-h-[48px] font-bold ${
          canSwitchStations ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'
        } ${
          isLightMode ? 'text-zinc-700 hover:text-zinc-950' : 'text-zinc-300 hover:text-white'
        }`}
        title={canSwitchStations ? 'Switch Station' : `Station locked to ${currentStation}`}
      >
        <div className="relative">
          <Lock className="w-5 h-5 text-red-600" />
        </div>
        <span className="text-[10px] uppercase tracking-tighter mt-1 truncate max-w-[55px]">
          {currentStation === 'Manager' ? 'Master' : currentStation}
        </span>
      </button>

      {/* 3. Primary Center Elevated FAB: + ADD TASK */}
      {canAddTask ? (
        <div className="flex-1 flex justify-center -mt-5">
          <button
            type="button"
            id="android-nav-assign-fab"
            onClick={() => {
              triggerHaptic('heavy');
              onOpenAssignModal();
            }}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-90 cursor-pointer border-4 ${
              isLightMode
                ? 'bg-zinc-950 active:bg-zinc-800 text-white border-white'
                : 'bg-white active:bg-zinc-200 text-black border-zinc-950'
            }`}
            aria-label="Add New Task"
            title="Add New Task"
          >
            <Plus className="w-7 h-7 stroke-[3]" />
          </button>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* 4. Tools & Operations Menu Button - HEMEN DAS ONLY */}
      {canAccessTools ? (
        <button
          type="button"
          id="android-nav-tools"
          onClick={() => {
            triggerHaptic('light');
            if (onOpenTools) onOpenTools();
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 transition relative cursor-pointer min-h-[48px] ${
            isToolsOpen
              ? 'text-[#E05A47] font-black'
              : isLightMode
              ? 'text-zinc-500 font-bold hover:text-zinc-950'
              : 'text-zinc-400 font-bold hover:text-white'
          }`}
          title="Tools & Operations (Hemen Das)"
        >
          <div className="relative">
            <SlidersHorizontal className={`w-5 h-5 ${isToolsOpen ? 'text-[#E05A47] stroke-[2.5]' : ''}`} />
          </div>
          <span className="text-[10px] uppercase tracking-tighter mt-1">Tools</span>
        </button>
      ) : (
        <div className="flex-1" />
      )}

      {/* 5. AI Ops Assistant Chat */}
      <button
        type="button"
        id="android-nav-chat"
        onClick={() => {
          triggerHaptic('light');
          onToggleChat();
        }}
        className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 transition relative cursor-pointer min-h-[48px] ${
          isChatOpen
            ? 'text-red-600 font-black'
            : isLightMode
            ? 'text-zinc-500 font-bold'
            : 'text-zinc-400 font-bold'
        }`}
      >
        <div className="relative">
          <Bot className={`w-5 h-5 ${isChatOpen ? 'text-red-600 stroke-[2.5]' : ''}`} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-ping" />
        </div>
        <span className="text-[10px] uppercase tracking-tighter mt-1">Assistant</span>
      </button>
    </nav>
  );
};
