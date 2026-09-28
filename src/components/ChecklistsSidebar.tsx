import React, { useState } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Sun,
  Moon,
  Plus,
  ChevronRight,
  Filter,
  Layers,
  Sparkles,
  X,
  Menu,
} from 'lucide-react';

export interface ParentChecklistInfo {
  headerName: string;
  totalTasks: number;
  completedTasks: number;
  percentage: number;
  department?: string;
  isCustom?: boolean;
}

interface ChecklistsSidebarProps {
  checklists: ParentChecklistInfo[];
  selectedChecklist: string; // 'all' or specific headerName
  onSelectChecklist: (headerName: string) => void;
  isLightMode: boolean;
  currentStation: string;
  onNewChecklist?: () => void;
  isAdmin?: boolean;
}

export const ChecklistsSidebar: React.FC<ChecklistsSidebarProps> = ({
  checklists,
  selectedChecklist,
  onSelectChecklist,
  isLightMode,
  currentStation,
  onNewChecklist,
  isAdmin = false,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Filter checklists by search
  const filteredChecklists = checklists.filter((chk) =>
    chk.headerName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Total summary across all checklists
  const totalQuestions = checklists.reduce((acc, c) => acc + c.totalTasks, 0);
  const totalCompleted = checklists.reduce((acc, c) => acc + c.completedTasks, 0);
  const allCompleted = totalQuestions > 0 && totalCompleted === totalQuestions;
  const overallPercentage = totalQuestions > 0 ? Math.round((totalCompleted / totalQuestions) * 100) : 0;

  const getShiftIcon = (headerName: string) => {
    const lower = headerName.toLowerCase();
    if (lower.includes('opening')) {
      return <Sun className="w-4 h-4 text-amber-500 shrink-0" />;
    }
    if (lower.includes('closing')) {
      return <Moon className="w-4 h-4 text-purple-500 shrink-0" />;
    }
    return <Layers className="w-4 h-4 text-emerald-500 shrink-0" />;
  };

  const getShiftBadge = (headerName: string) => {
    const lower = headerName.toLowerCase();
    if (lower.includes('opening')) {
      return (
        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
          Opening
        </span>
      );
    }
    if (lower.includes('closing')) {
      return (
        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
          Closing
        </span>
      );
    }
    return (
      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
        Shift
      </span>
    );
  };

  return (
    <>
      {/* ================= MOBILE NAVIGATION BAR (< lg screens) ================= */}
      <div className="lg:hidden mb-4 space-y-2">
        {/* Mobile Header Bar */}
        <div
          style={{ width: '338.56px', height: '60px' }}
          className={`w-[338.56px] h-[60px] flex items-center justify-between p-3 rounded-lg border shadow-xs ${
            isLightMode ? 'bg-white border-zinc-200' : 'bg-[#1a231e] border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#673ab7] text-white rounded-md">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider block text-zinc-900 dark:text-zinc-100">
                Checklists
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold block">
                {selectedChecklist === 'all'
                  ? `All Checklists (${checklists.length})`
                  : selectedChecklist}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="px-3 py-1.5 text-xs font-bold uppercase rounded-md bg-[#673ab7] hover:bg-[#58309e] text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Menu className="w-3.5 h-3.5" />
            <span>Switch Checklist</span>
          </button>
        </div>

        {/* Mobile Horizontal Pill Scrollbar */}
        <div
          style={{ width: '338.516px' }}
          className="w-[338.516px] flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
        >
          {/* All Checklists Option */}
          <button
            type="button"
            onClick={() => onSelectChecklist('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition whitespace-nowrap flex items-center gap-1.5 shrink-0 cursor-pointer ${
              selectedChecklist === 'all'
                ? 'bg-[#673ab7] text-white border-[#673ab7] shadow-sm'
                : isLightMode
                ? 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                : 'bg-[#1a231e] text-zinc-300 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Checklists</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                selectedChecklist === 'all' ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-800'
              }`}
            >
              {checklists.length}
            </span>
          </button>

          {/* Individual Parent Checklists */}
          {checklists.map((chk) => {
            const isSelected = selectedChecklist === chk.headerName;
            return (
              <button
                key={chk.headerName}
                type="button"
                onClick={() => onSelectChecklist(chk.headerName)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition whitespace-nowrap flex items-center gap-2 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#673ab7] text-white border-[#673ab7] shadow-sm'
                    : isLightMode
                    ? 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                    : 'bg-[#1a231e] text-zinc-300 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {getShiftIcon(chk.headerName)}
                <span>{chk.headerName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {chk.completedTasks}/{chk.totalTasks}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile Slide-up Drawer Modal */}
        {mobileDrawerOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select Parent Checklist"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <div
              className={`w-full sm:max-w-md max-h-[85vh] rounded-t-2xl sm:rounded-xl border shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200 ${
                isLightMode ? 'bg-white text-zinc-900 border-zinc-300' : 'bg-[#16281E] text-[#F7F4EB] border-zinc-800'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div
                className={`p-4 border-b flex items-center justify-between sticky top-0 z-10 ${
                  isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-[#111F17] border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#673ab7] text-white rounded-md">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight">Checklists Navigation</h3>
                    <p className="text-[10px] text-zinc-500 font-semibold">
                      {currentStation} Station • Select checklist to open
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-md cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
                {/* All Checklists Option in Drawer */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectChecklist('all');
                    setMobileDrawerOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition flex items-center justify-between cursor-pointer ${
                    selectedChecklist === 'all'
                      ? 'border-[#673ab7] bg-purple-50 dark:bg-purple-950/40 text-[#673ab7] dark:text-purple-300'
                      : isLightMode
                      ? 'border-zinc-200 bg-white hover:border-zinc-300 text-zinc-900'
                      : 'border-zinc-800 bg-[#1a231e] hover:border-zinc-700 text-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-[#673ab7]" />
                    <div>
                      <h4 className="text-xs font-bold uppercase">All Checklists</h4>
                      <p className="text-[11px] text-zinc-500">View all station forms combined</p>
                    </div>
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {checklists.length}
                  </span>
                </button>

                {/* Individual Parent Checklists */}
                {checklists.map((chk) => {
                  const isSelected = selectedChecklist === chk.headerName;
                  return (
                    <button
                      key={chk.headerName}
                      type="button"
                      onClick={() => {
                        onSelectChecklist(chk.headerName);
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full text-left p-3.5 rounded-lg border transition space-y-2 cursor-pointer ${
                        isSelected
                          ? 'border-[#673ab7] bg-purple-50/80 dark:bg-purple-950/40 text-zinc-900 dark:text-zinc-100 shadow-xs'
                          : isLightMode
                          ? 'border-zinc-200 bg-white hover:border-zinc-300 text-zinc-900'
                          : 'border-zinc-800 bg-[#1a231e] hover:border-zinc-700 text-zinc-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {getShiftIcon(chk.headerName)}
                          <span className="text-sm font-bold truncate">{chk.headerName}</span>
                        </div>
                        {getShiftBadge(chk.headerName)}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span>
                          {chk.completedTasks} of {chk.totalTasks} questions answered
                        </span>
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">{chk.percentage}%</span>
                      </div>

                      {/* Mini Progress Bar */}
                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#673ab7] transition-all duration-300 rounded-full"
                          style={{ width: `${chk.percentage}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Drawer Footer */}
              {isAdmin && onNewChecklist && (
                <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      onNewChecklist();
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-tight rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Create New Checklist</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= DESKTOP DEDICATED SIDEBAR (lg+ screens) ================= */}
      <aside
        aria-label="Parent Checklists Navigation"
        className="hidden lg:block w-72 xl:w-80 shrink-0 space-y-3 sticky top-20 self-start"
      >
        <div
          className={`rounded-xl border shadow-xs overflow-hidden ${
            isLightMode ? 'bg-white border-zinc-200' : 'bg-[#1a231e] border-zinc-800'
          }`}
        >
          {/* Sidebar Top Banner */}
          <div className="h-2 w-full bg-[#673ab7]" />

          {/* Header */}
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#673ab7] text-white rounded-md shadow-xs">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">
                  Checklists
                </h3>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-[#673ab7] dark:text-purple-300">
                {checklists.length} Forms
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              Amarii Café Operations • {currentStation}
            </p>

            {/* Overall Progress Summary Bar */}
            <div className="pt-2 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                <span>Shift Completion</span>
                <span>{overallPercentage}% ({totalCompleted}/{totalQuestions})</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#673ab7] transition-all duration-300 rounded-full"
                  style={{ width: `${overallPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Search Checklists */}
          {checklists.length > 4 && (
            <div className="p-2 border-b border-zinc-100 dark:border-zinc-800/80">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter checklists..."
                className="w-full px-2.5 py-1.5 text-xs rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none text-zinc-800 dark:text-zinc-200"
              />
            </div>
          )}

          {/* Navigation Item List */}
          <div className="p-2 space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto">
            {/* 1. All Checklists Button */}
            <button
              type="button"
              id="sidebar-chk-nav-all"
              onClick={() => onSelectChecklist('all')}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition flex items-center justify-between cursor-pointer ${
                selectedChecklist === 'all'
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-[#673ab7] text-[#673ab7] dark:text-purple-300 font-bold shadow-xs'
                  : isLightMode
                  ? 'bg-transparent border-transparent hover:bg-zinc-100 text-zinc-700'
                  : 'bg-transparent border-transparent hover:bg-zinc-800 text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 shrink-0 text-[#673ab7]" />
                <span className="text-xs uppercase tracking-tight">All Checklists</span>
              </div>
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  selectedChecklist === 'all'
                    ? 'bg-[#673ab7] text-white'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {checklists.length}
              </span>
            </button>

            {/* 2. Parent Categories / Individual Checklists */}
            {filteredChecklists.map((chk) => {
              const isSelected = selectedChecklist === chk.headerName;
              return (
                <button
                  key={chk.headerName}
                  type="button"
                  id={`sidebar-chk-nav-${chk.headerName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  onClick={() => onSelectChecklist(chk.headerName)}
                  className={`w-full text-left p-3 rounded-lg border transition space-y-1.5 cursor-pointer relative ${
                    isSelected
                      ? 'bg-purple-50/90 dark:bg-purple-950/40 border-[#673ab7] shadow-xs'
                      : isLightMode
                      ? 'bg-zinc-50/60 border-zinc-200/80 hover:bg-zinc-100/90 hover:border-zinc-300 text-zinc-800'
                      : 'bg-[#142018] border-zinc-800/80 hover:bg-zinc-800/60 hover:border-zinc-700 text-zinc-200'
                  }`}
                >
                  {/* Left indicator bar when active */}
                  {isSelected && (
                    <div className="absolute left-0 inset-y-2 w-1 bg-[#673ab7] rounded-r" />
                  )}

                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {getShiftIcon(chk.headerName)}
                      <span
                        className={`text-xs uppercase tracking-tight truncate ${
                          isSelected
                            ? 'font-black text-[#673ab7] dark:text-purple-300'
                            : 'font-bold'
                        }`}
                      >
                        {chk.headerName}
                      </span>
                    </div>
                    {getShiftBadge(chk.headerName)}
                  </div>

                  {/* Task Count & Percentage Stats */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 font-medium pl-6">
                    <span>
                      {chk.completedTasks} / {chk.totalTasks} Done
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        chk.percentage === 100
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {chk.percentage}%
                    </span>
                  </div>

                  {/* Mini Progress Bar */}
                  <div className="ml-6 h-1 w-auto bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        chk.percentage === 100 ? 'bg-emerald-500' : 'bg-[#673ab7]'
                      }`}
                      style={{ width: `${chk.percentage}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Admin Create Checklist Action */}
          {isAdmin && onNewChecklist && (
            <div className="p-3 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-[#142018]/50">
              <button
                type="button"
                id="sidebar-new-checklist-btn"
                onClick={onNewChecklist}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-tight rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ New Checklist</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
