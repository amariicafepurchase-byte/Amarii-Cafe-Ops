import React from 'react';
import {
  SlidersHorizontal,
  X,
  ClipboardList,
  BarChart3,
  Download,
  Building2,
  Trash2,
  PlusCircle,
  FileText,
  Share2,
  History,
  Smartphone,
  Users,
  KeyRound,
  Lock,
  Database,
  ShieldCheck,
  BellRing,
  Volume2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface ToolsMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTaskDirectory?: () => void;
  onOpenAdminApprovals?: () => void;
  pendingApprovalCount?: number;
  onOpenTaskRegister?: () => void;
  onToggleAnalytics?: () => void;
  onOpenPdfModal?: () => void;
  onOpenOutletModal?: () => void;
  onOpenDataCleanup?: () => void;
  onOpenPasteModal?: () => void;
  onToggleViewMode?: () => void;
  isScannableMode?: boolean;
  totalCount?: number;
  onCopyBrief?: () => void;
  copied?: boolean;
  onOpenHistoryModal?: () => void;
  onOpenInstallModal?: () => void;
  isInstallable?: boolean;
  outletsCount?: number;
  onOpenStaffModal?: () => void;
  staffCount?: number;
  onOpenDiagnostics?: () => void;
  isFirebaseConnected?: boolean;
  onTriggerTestAlarm?: () => void;
}

export const ToolsMenuModal: React.FC<ToolsMenuModalProps> = ({
  isOpen,
  onClose,
  onOpenTaskDirectory,
  onOpenAdminApprovals,
  pendingApprovalCount = 0,
  onOpenTaskRegister,
  onToggleAnalytics,
  onOpenPdfModal,
  onOpenOutletModal,
  onOpenDataCleanup,
  onOpenPasteModal,
  onToggleViewMode,
  isScannableMode,
  totalCount = 0,
  onCopyBrief,
  copied = false,
  onOpenHistoryModal,
  onOpenInstallModal,
  isInstallable = false,
  outletsCount = 1,
  onOpenStaffModal,
  staffCount = 2,
  onOpenDiagnostics,
  isFirebaseConnected = true,
  onTriggerTestAlarm,
}) => {
  const { isLightMode } = useTheme();
  const { isAdmin, isManager, canAddTask, canAccessTools } = useAuth();

  if (!isOpen) return null;

  if (!canAccessTools) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Access Restricted"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      >
        <div
          className={`max-w-md w-full p-6 border-2 border-red-500 text-center space-y-4 shadow-2xl ${
            isLightMode ? 'bg-white text-zinc-900' : 'bg-zinc-950 text-white'
          }`}
        >
          <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500 flex items-center justify-center text-red-500">
            <Lock className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h3 className="text-base font-black uppercase tracking-tight text-red-500">
            Access Restricted
          </h3>
          <p className="text-xs font-bold text-zinc-400">
            Only Hemen Das (General Manager & Owner) has authorization to access Operations Tools and administrative controls.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-black uppercase tracking-wider bg-zinc-900 text-white dark:bg-white dark:text-black cursor-pointer rounded-xs"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Operations Tools & Management"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full sm:max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-none border-t-4 sm:border-2 border-[#E05A47] shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 ${
          isLightMode ? 'bg-white text-zinc-900' : 'bg-[#16281E] text-[#F7F4EB]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between sticky top-0 z-10 ${
            isLightMode
              ? 'bg-zinc-100 border-zinc-300 text-zinc-900'
              : 'bg-[#111F17] border-[#244332] text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#E05A47] text-white rounded">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-tight leading-none">
                Tools & Operations
              </h3>
              <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
                Amarii Café Station Management
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded transition cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center ${
              isLightMode
                ? 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200'
                : 'text-zinc-400 hover:text-white hover:bg-[#244332]'
            }`}
            aria-label="Close tools menu"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Menu Options */}
        <div className="p-3 space-y-1.5">
          {/* Admin Quality Approvals Hub */}
          {(isAdmin || isManager) && onOpenAdminApprovals && (
            <button
              type="button"
              id="tools-admin-approvals-btn"
              onClick={() => {
                onClose();
                onOpenAdminApprovals();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-bold text-left transition cursor-pointer rounded-sm border ${
                (pendingApprovalCount || 0) > 0
                  ? 'bg-amber-500 text-black border-amber-600 shadow-md'
                  : isLightMode
                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-950'
                  : 'bg-[#111F17] hover:bg-[#1A3024] border-emerald-700 text-emerald-300'
              }`}
            >
              <div className="p-2 rounded bg-black/10 text-inherit">
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="flex-1">
                <div className="font-black uppercase text-[11px] tracking-tight flex items-center justify-between">
                  <span>👑 Admin Verification & Approvals</span>
                  {(pendingApprovalCount || 0) > 0 && (
                    <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-mono font-black rounded-full shadow-xs">
                      {pendingApprovalCount} Pending
                    </span>
                  )}
                </div>
                <div className={`text-[10px] font-medium ${(pendingApprovalCount || 0) > 0 ? 'text-black/80' : 'text-zinc-500'}`}>
                  Owner Hemen Das photo quality inspection & 1-click approvals
                </div>
              </div>
            </button>
          )}

          {/* Master Task Register & Audit Ledger (Hemen Das & Managers) */}
          {(isAdmin || isManager) && onOpenTaskRegister && (
            <button
              type="button"
              id="tools-task-register-btn"
              onClick={() => {
                onClose();
                onOpenTaskRegister();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-bold text-left transition cursor-pointer rounded-sm border ${
                isLightMode
                  ? 'bg-red-50 hover:bg-red-100 border-red-300 text-red-950'
                  : 'bg-red-950/40 hover:bg-red-900/60 border-red-800 text-red-200'
              }`}
            >
              <div className="p-2 rounded bg-red-600 text-white">
                <ClipboardList className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="flex-1">
                <div className="font-black uppercase text-[11px] tracking-tight flex items-center justify-between">
                  <span>📋 Master Task Register (टास्क रजिस्टर)</span>
                  <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.2 rounded-xs">
                    HEMEN DAS
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 font-normal">
                  All tasks ledger with dates, months, assignees, outcomes & 1-click export
                </div>
              </div>
            </button>
          )}

          {/* Extreme Loud 10-Min Pre-Task Alarm & Mobile Notification Test */}
          {onTriggerTestAlarm && (
            <button
              type="button"
              id="tools-test-alarm-btn"
              onClick={() => {
                onClose();
                onTriggerTestAlarm();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-bold text-left transition cursor-pointer rounded-sm border ${
                isLightMode
                  ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-950'
                  : 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-700 text-amber-200'
              }`}
            >
              <div className="p-2 rounded bg-amber-600 text-white animate-pulse">
                <BellRing className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="flex-1">
                <div className="font-black uppercase text-[11px] tracking-tight flex items-center justify-between">
                  <span>🚨 Test 10-Min Alarm & Extreme Sound</span>
                  <span className="text-[9px] font-bold bg-amber-600 text-white px-1.5 py-0.2 rounded-xs">
                    PWA NOTIF
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400 font-normal">
                  Test dual-oscillator extreme loud siren, vibration & mobile push notification
                </div>
              </div>
            </button>
          )}

          {/* Task Directory */}
          {canAddTask && onOpenTaskDirectory && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTaskDirectory();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-bold text-left transition cursor-pointer rounded-sm border ${
                isLightMode
                  ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-900'
                  : 'bg-[#111F17] hover:bg-[#1A3024] border-[#244332] text-white'
              }`}
            >
              <div className="p-2 rounded bg-blue-500/10 text-blue-500">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-black uppercase text-[11px] tracking-tight">Task Directory & Master Edit</div>
                <div className="text-[10px] text-zinc-500 font-normal">Manage recurring tasks, deadlines, media requirements</div>
              </div>
            </button>
          )}

          {/* Performance Analytics */}
          {onToggleAnalytics && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onToggleAnalytics();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-bold text-left transition cursor-pointer rounded-sm border ${
                isLightMode
                  ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-900'
                  : 'bg-[#111F17] hover:bg-[#1A3024] border-[#244332] text-white'
              }`}
            >
              <div className="p-2 rounded bg-emerald-500/10 text-emerald-500">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-black uppercase text-[11px] tracking-tight">Performance Analytics</div>
                <div className="text-[10px] text-zinc-500 font-normal">Shift completion rates, audit history & bottlenecks</div>
              </div>
            </button>
          )}

          {/* Download PDF Report */}
          {onOpenPdfModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPdfModal();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-bold text-left transition cursor-pointer rounded-sm border ${
                isLightMode
                  ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-900'
                  : 'bg-[#111F17] hover:bg-[#1A3024] border-[#244332] text-white'
              }`}
            >
              <div className="p-2 rounded bg-blue-500/10 text-blue-500">
                <Download className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-black uppercase text-[11px] tracking-tight">Download PDF Shift Report</div>
                <div className="text-[10px] text-zinc-500 font-normal">Export signed audit summary with photos & notes</div>
              </div>
            </button>
          )}

          {/* Outlets Management */}
          {isAdmin && onOpenOutletModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenOutletModal();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-bold text-left transition cursor-pointer rounded-sm border ${
                isLightMode
                  ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-900'
                  : 'bg-[#111F17] hover:bg-[#1A3024] border-[#244332] text-white'
              }`}
            >
              <div className="p-2 rounded bg-amber-500/10 text-amber-500">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-black uppercase text-[11px] tracking-tight">
                  Manage Outlets ({outletsCount})
                </div>
                <div className="text-[10px] text-zinc-500 font-normal">Switch or configure multi-location cafe outlets</div>
              </div>
            </button>
          )}

          {/* Data Cleanup */}
          {isAdmin && onOpenDataCleanup && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDataCleanup();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-bold text-left transition cursor-pointer rounded-sm border ${
                isLightMode
                  ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700'
                  : 'bg-red-950/20 hover:bg-red-950/40 border-red-900/40 text-red-400'
              }`}
            >
              <div className="p-2 rounded bg-red-500/10 text-red-500">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-black uppercase text-[11px] tracking-tight">Data Cleanup & Task Reset</div>
                <div className="text-[10px] opacity-80 font-normal">Purge completed tasks or wipe test entries safely</div>
              </div>
            </button>
          )}

          {/* Firestore Connection & Real-Time Sync Diagnostics */}
          {onOpenDiagnostics && (
            <button
              type="button"
              id="tools-menu-diagnostics-btn"
              onClick={() => {
                onClose();
                onOpenDiagnostics();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-bold text-left transition cursor-pointer rounded-sm border ${
                isLightMode
                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-950'
                  : 'bg-emerald-950/30 hover:bg-emerald-900/50 border-emerald-700/60 text-emerald-200'
              }`}
            >
              <div className="p-2 rounded bg-emerald-500/20 text-emerald-400">
                <Database className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="flex-1">
                <div className="font-black uppercase text-[11px] tracking-tight flex items-center justify-between">
                  <span>Firestore Connection & Sync Diagnostics</span>
                  <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Diagnostic
                  </span>
                </div>
                <div className="text-[10px] opacity-80 font-normal">
                  View connection health, active synced docs, ping latency & write permission tests
                </div>
              </div>
            </button>
          )}

          {/* Staff & Passcode Management */}
          {onOpenStaffModal && (
            <button
              type="button"
              id="tools-menu-staff-btn"
              onClick={() => {
                onClose();
                onOpenStaffModal();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-bold text-left transition cursor-pointer rounded-sm border ${
                isLightMode
                  ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-900'
                  : 'bg-[#111F17] hover:bg-[#1A3024] border-[#244332] text-white'
              }`}
            >
              <div className="p-2 rounded bg-amber-500/10 text-amber-500">
                <Users className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-black uppercase text-[11px] tracking-tight flex items-center justify-between">
                  <span>Staff & Passcode Management</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-black">({staffCount} Staff)</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-normal">Manage team members, roles, and 4-digit PIN passcodes</div>
              </div>
            </button>
          )}

          {/* Import / Paste Log */}
          {canAddTask && onOpenPasteModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPasteModal();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-bold text-left transition cursor-pointer rounded-sm border ${
                isLightMode
                  ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-900'
                  : 'bg-[#111F17] hover:bg-[#1A3024] border-[#244332] text-white'
              }`}
            >
              <div className="p-2 rounded bg-purple-500/10 text-purple-500">
                <PlusCircle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-black uppercase text-[11px] tracking-tight">Import / Paste Task Log</div>
                <div className="text-[10px] text-zinc-500 font-normal">Paste bulk tasks or extract from WhatsApp/notes</div>
              </div>
            </button>
          )}

          {/* Switch View Mode */}
          {totalCount > 0 && onToggleViewMode && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onToggleViewMode();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-bold text-left transition cursor-pointer rounded-sm border ${
                isLightMode
                  ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-900'
                  : 'bg-[#111F17] hover:bg-[#1A3024] border-[#244332] text-white'
              }`}
            >
              <div className="p-2 rounded bg-cyan-500/10 text-cyan-500">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-black uppercase text-[11px] tracking-tight">
                  Switch to {isScannableMode ? 'Rich Checklist' : 'Compact Brief'}
                </div>
                <div className="text-[10px] text-zinc-500 font-normal">Toggle between detailed checklist and scannable brief</div>
              </div>
            </button>
          )}

          {/* Share Daily Brief */}
          {totalCount > 0 && onCopyBrief && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onCopyBrief();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-bold text-left transition cursor-pointer rounded-sm border ${
                isLightMode
                  ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-900'
                  : 'bg-[#111F17] hover:bg-[#1A3024] border-[#244332] text-white'
              }`}
            >
              <div className="p-2 rounded bg-emerald-500/10 text-emerald-500">
                <Share2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-black uppercase text-[11px] tracking-tight">
                  {copied ? 'Copied to Clipboard!' : 'Share Station Checklist'}
                </div>
                <div className="text-[10px] text-zinc-500 font-normal">Copy WhatsApp formatted shift checklist</div>
              </div>
            </button>
          )}

          {/* Shift History */}
          {onOpenHistoryModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenHistoryModal();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-bold text-left transition cursor-pointer rounded-sm border ${
                isLightMode
                  ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-900'
                  : 'bg-[#111F17] hover:bg-[#1A3024] border-[#244332] text-white'
              }`}
            >
              <div className="p-2 rounded bg-amber-500/10 text-amber-500">
                <History className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-black uppercase text-[11px] tracking-tight">Daily Shift History</div>
                <div className="text-[10px] text-zinc-500 font-normal">Browse previous day handover logs & records</div>
              </div>
            </button>
          )}

          {/* Install App */}
          {onOpenInstallModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenInstallModal();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-bold text-left transition cursor-pointer rounded-sm border ${
                isLightMode
                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
                  : 'bg-emerald-950/30 hover:bg-emerald-950/50 border-emerald-800 text-emerald-300'
              }`}
            >
              <div className="p-2 rounded bg-emerald-500/20 text-emerald-500">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-black uppercase text-[11px] tracking-tight">
                  {isInstallable ? 'Install Android App (Ready)' : 'Install App / Add to Home'}
                </div>
                <div className="text-[10px] opacity-80 font-normal">Fast 1-tap launcher icon on Android / mobile home screen</div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
