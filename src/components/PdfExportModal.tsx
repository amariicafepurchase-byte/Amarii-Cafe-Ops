import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  X,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Building2,
  AlertCircle,
  Loader2,
  Check,
  Filter,
  Layers,
} from 'lucide-react';
import { TaskItem, StaffMember } from '../types';
import { generateCompletedTasksPdf } from '../utils/pdfExport';
import { useTheme } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  staffList?: StaffMember[];
  currentStation?: string;
  currentUser?: { name: string; role: string } | null;
}

type DateRangePreset = 'today' | 'morning' | 'evening' | 'yesterday' | 'week' | 'custom';

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  staffList = [],
  currentStation = 'All Stations',
  currentUser,
}) => {
  const { isLightMode } = useTheme();
  const [stationFilter, setStationFilter] = useState<string>(
    currentStation === 'Manager' ? 'All Stations' : currentStation
  );
  const [managerName, setManagerName] = useState<string>(currentUser?.name || 'Shift Supervisor');
  const [managerNotes, setManagerNotes] = useState<string>('');
  const [includeThumbnails, setIncludeThumbnails] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Date & Time Range State
  const [preset, setPreset] = useState<DateRangePreset>('today');

  // Format helper for local ISO string YYYY-MM-DDTHH:mm
  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [startDateTime, setStartDateTime] = useState<string>(formatDateTimeLocal(todayStart));
  const [endDateTime, setEndDateTime] = useState<string>(formatDateTimeLocal(todayEnd));

  const applyPreset = (newPreset: DateRangePreset) => {
    triggerHaptic('light');
    setPreset(newPreset);
    const now = new Date();

    if (newPreset === 'today') {
      const s = new Date(now);
      s.setHours(0, 0, 0, 0);
      const e = new Date(now);
      e.setHours(23, 59, 59, 999);
      setStartDateTime(formatDateTimeLocal(s));
      setEndDateTime(formatDateTimeLocal(e));
    } else if (newPreset === 'morning') {
      const s = new Date(now);
      s.setHours(6, 0, 0, 0);
      const e = new Date(now);
      e.setHours(15, 0, 0, 0);
      setStartDateTime(formatDateTimeLocal(s));
      setEndDateTime(formatDateTimeLocal(e));
    } else if (newPreset === 'evening') {
      const s = new Date(now);
      s.setHours(15, 0, 0, 0);
      const e = new Date(now);
      e.setHours(23, 59, 59, 999);
      setStartDateTime(formatDateTimeLocal(s));
      setEndDateTime(formatDateTimeLocal(e));
    } else if (newPreset === 'yesterday') {
      const s = new Date(now);
      s.setDate(s.getDate() - 1);
      s.setHours(0, 0, 0, 0);
      const e = new Date(now);
      e.setDate(e.getDate() - 1);
      e.setHours(23, 59, 59, 999);
      setStartDateTime(formatDateTimeLocal(s));
      setEndDateTime(formatDateTimeLocal(e));
    } else if (newPreset === 'week') {
      const s = new Date(now);
      s.setDate(s.getDate() - 7);
      s.setHours(0, 0, 0, 0);
      const e = new Date(now);
      e.setHours(23, 59, 59, 999);
      setStartDateTime(formatDateTimeLocal(s));
      setEndDateTime(formatDateTimeLocal(e));
    }
  };

  // Filter tasks by station and date/time range
  const filteredTasks = useMemo(() => {
    const startTime = new Date(startDateTime).getTime();
    const endTime = new Date(endDateTime).getTime();

    return tasks.filter((t) => {
      // 1. Station / Department filter
      if (stationFilter !== 'All Stations' && t.department !== stationFilter) {
        return false;
      }

      // 2. Time Range Filter
      if (t.completedAt) {
        const compTime = new Date(t.completedAt).getTime();
        if (!isNaN(compTime)) {
          if (compTime < startTime || compTime > endTime) {
            return false;
          }
        }
      }

      return true;
    });
  }, [tasks, stationFilter, startDateTime, endDateTime]);

  if (!isOpen) return null;

  const completedTasks = filteredTasks.filter((t) => t.completed);
  const totalTasks = filteredTasks.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const photoProofCount = completedTasks.reduce(
    (acc, t) => acc + (t.media ? t.media.filter((m) => m.type === 'photo').length : 0),
    0
  );
  const videoProofCount = completedTasks.reduce(
    (acc, t) => acc + (t.media ? t.media.filter((m) => m.type === 'video').length : 0),
    0
  );

  const formatRangeDisplay = () => {
    const s = new Date(startDateTime);
    const e = new Date(endDateTime);
    const sDate = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const sTime = s.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const eDate = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const eTime = e.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (sDate === eDate) {
      return `${sDate} (${sTime} – ${eTime})`;
    }
    return `${sDate} ${sTime} – ${eDate} ${eTime}`;
  };

  const handleDownload = async () => {
    triggerHaptic('medium');
    try {
      setIsGenerating(true);
      await generateCompletedTasksPdf({
        tasks: filteredTasks,
        staffList,
        stationFilter,
        managerName,
        dateTimeRangeLabel: formatRangeDisplay(),
        notes: managerNotes,
        includeMediaThumbnails: includeThumbnails,
      });
      triggerHaptic('success');
      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
      }, 3500);
    } catch (err) {
      console.error('Error generating PDF:', err);
      triggerHaptic('error');
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const stationsList = ['All Stations', 'Kitchen', 'Bar', 'Housekeeping', 'Service', 'Billing', 'Management'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl border-2 shadow-2xl overflow-hidden ${
          isLightMode ? 'bg-white border-zinc-900 text-zinc-900' : 'bg-[#14231A] border-[#2A4937] text-[#F7F4EB]'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b-2 ${
            isLightMode ? 'bg-zinc-950 text-white border-zinc-900' : 'bg-[#0D1812] text-white border-[#2A4937]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E05A47] flex items-center justify-center text-white shadow-md">
              <FileText className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider">
                Export Operations Audit Report
              </h2>
              <p className="text-[10px] text-zinc-300 font-bold uppercase tracking-tight">
                Date & Time Range Filtered Shift Record
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 text-zinc-400 hover:text-white transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Date & Time Range Selection Box */}
          <div
            className={`p-3.5 border-2 rounded-xl space-y-3 ${
              isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0E1B13] border-[#2A4937]'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#E05A47]" />
                <span>Date & Time Range Selection</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-[#E05A47]">
                {formatRangeDisplay()}
              </span>
            </div>

            {/* Quick Range Presets */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'today', label: 'Today (All Day)' },
                { id: 'morning', label: 'Morning Shift (06-15)' },
                { id: 'evening', label: 'Evening Shift (15-24)' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'Past 7 Days' },
                { id: 'custom', label: 'Custom Range' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyPreset(item.id as DateRangePreset)}
                  className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-tight rounded-lg border transition cursor-pointer ${
                    preset === item.id
                      ? 'bg-[#E05A47] text-white border-[#E05A47]'
                      : isLightMode
                      ? 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Custom Date & Time Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => {
                    setStartDateTime(e.target.value);
                    setPreset('custom');
                  }}
                  className={`w-full px-3 py-2 text-xs font-mono border-2 rounded-lg outline-none ${
                    isLightMode
                      ? 'bg-white border-zinc-300 text-zinc-900'
                      : 'bg-black/40 border-zinc-700 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(e) => {
                    setEndDateTime(e.target.value);
                    setPreset('custom');
                  }}
                  className={`w-full px-3 py-2 text-xs font-mono border-2 rounded-lg outline-none ${
                    isLightMode
                      ? 'bg-white border-zinc-300 text-zinc-900'
                      : 'bg-black/40 border-zinc-700 text-white'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Audit Scope Summary Box */}
          <div
            className={`p-3.5 border-2 rounded-xl ${
              isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0E1B13] border-[#2A4937]'
            }`}
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
                Filtered Scope Summary
              </span>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-tight bg-emerald-600 text-white rounded-md">
                {completionPercentage}% Done ({completedTasks.length}/{totalTasks})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-black/10 rounded-lg">
                <span className="text-[10px] text-zinc-400 uppercase block font-bold">Total Tasks</span>
                <strong className="text-base font-black font-mono">{totalTasks}</strong>
              </div>
              <div className="p-2 bg-black/10 rounded-lg">
                <span className="text-[10px] text-emerald-400 uppercase block font-bold">Completed</span>
                <strong className="text-base font-black font-mono text-emerald-500">{completedTasks.length}</strong>
              </div>
              <div className="p-2 bg-black/10 rounded-lg">
                <span className="text-[10px] text-amber-400 uppercase block font-bold">Photo Proofs</span>
                <strong className="text-base font-black font-mono text-amber-500">{photoProofCount}</strong>
              </div>
              <div className="p-2 bg-black/10 rounded-lg">
                <span className="text-[10px] text-blue-400 uppercase block font-bold">Video Proofs</span>
                <strong className="text-base font-black font-mono text-blue-400">{videoProofCount}</strong>
              </div>
            </div>
          </div>

          {/* Station Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5 text-zinc-400">
              Filter by Department / Station
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {stationsList.map((station) => (
                <button
                  key={station}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setStationFilter(station);
                  }}
                  className={`py-2 px-2 text-xs font-bold uppercase rounded-lg border transition cursor-pointer text-center truncate ${
                    stationFilter === station
                      ? 'bg-[#E05A47] text-white border-[#E05A47] shadow-sm'
                      : isLightMode
                      ? 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {station}
                </button>
              ))}
            </div>
          </div>

          {/* Supervisor & Notes Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-zinc-400">
                Audited / Prepared By
              </label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="Supervisor Name"
                className={`w-full px-3 py-2 text-xs font-medium border-2 rounded-lg outline-none ${
                  isLightMode
                    ? 'bg-white border-zinc-300 text-zinc-950'
                    : 'bg-black/50 border-zinc-700 text-white'
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-zinc-400">
                Shift Audit Notes
              </label>
              <input
                type="text"
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                placeholder="e.g. All station checks verified smoothly"
                className={`w-full px-3 py-2 text-xs font-medium border-2 rounded-lg outline-none ${
                  isLightMode
                    ? 'bg-white border-zinc-300 text-zinc-950'
                    : 'bg-black/50 border-zinc-700 text-white'
                }`}
              />
            </div>
          </div>

          {/* Checkbox for photo attachments */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={includeThumbnails}
              onChange={(e) => {
                triggerHaptic('light');
                setIncludeThumbnails(e.target.checked);
              }}
              className="w-4 h-4 accent-[#E05A47]"
            />
            <span className="text-xs font-bold uppercase tracking-tight">
              Embed Camera Verification Snapshots in Report
            </span>
          </label>
        </div>

        {/* Modal Footer */}
        <div
          className={`p-4 border-t-2 flex items-center justify-between gap-3 ${
            isLightMode ? 'bg-zinc-100 border-zinc-200' : 'bg-[#0E1A13] border-[#2A4937]'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className={`py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl border transition cursor-pointer ${
              isLightMode
                ? 'bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-200'
                : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
            }`}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isGenerating || totalTasks === 0}
            className="flex-1 py-3 px-4 bg-[#E05A47] hover:bg-[#d04936] text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Audit PDF...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>PDF Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Download Report ({totalTasks} Tasks)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
