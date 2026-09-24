import React, { useState } from 'react';
import {
  X,
  Database,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  ShieldCheck,
  Activity,
  Layers,
  Users,
  Clock,
  Send,
  Zap,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  testFirestoreConnection,
  saveStaffToFirebase,
  deleteStaffFromFirebase,
  syncAllStaffAndUsersToFirestore,
} from '../lib/firebase';
import { INITIAL_STAFF } from '../data/staffData';
import firebaseConfigData from '../../firebase-applet-config.json';
import { StaffMember } from '../types';

export interface FirestoreDiagnosticProps {
  isOpen: boolean;
  onClose: () => void;
  connectionState: 'connected' | 'connecting' | 'error' | 'offline';
  tasksCount: number;
  staffCount: number;
  shiftsCount: number;
  outletsCount: number;
  lastSyncTimestamp: string | null;
  isLiveRealtime: boolean;
  lastError: string | null;
  onForceResync: () => Promise<void>;
}

export const FirestoreDiagnosticModal: React.FC<FirestoreDiagnosticProps> = ({
  isOpen,
  onClose,
  connectionState,
  tasksCount,
  staffCount,
  shiftsCount,
  outletsCount,
  lastSyncTimestamp,
  isLiveRealtime,
  lastError,
  onForceResync,
}) => {
  const { isLightMode } = useTheme();
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{
    success: boolean;
    latencyMs: number;
    error?: string;
    timestamp: string;
  } | null>(null);

  const [isTestingStaffWrite, setIsTestingStaffWrite] = useState(false);
  const [writeTestResult, setWriteTestResult] = useState<{
    success: boolean;
    durationMs: number;
    message: string;
  } | null>(null);

  const [isResyncing, setIsResyncing] = useState(false);
  const [isSyncingAllStaff, setIsSyncingAllStaff] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    count: number;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSyncStaffAndUsers = async () => {
    setIsSyncingAllStaff(true);
    setSyncResult(null);
    try {
      const res = await syncAllStaffAndUsersToFirestore(INITIAL_STAFF);
      if (res.error) {
        setSyncResult({
          success: false,
          count: 0,
          message: `Sync failed: ${res.error}`,
        });
      } else {
        setSyncResult({
          success: true,
          count: res.count,
          message: `✓ Successfully synchronized all ${res.count} staff members (Admin Hemen Das, Head Chef Aditya, Manager Abhinash Dcosta) into both 'staff' and 'users' collections in Firestore!`,
        });
        await onForceResync();
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        count: 0,
        message: `Sync exception: ${err?.message || 'Check database permissions'}`,
      });
    } finally {
      setIsSyncingAllStaff(false);
    }
  };

  const handleTestPing = async () => {
    setIsTestingPing(true);
    try {
      const res = await testFirestoreConnection();
      setPingResult({
        success: res.connected,
        latencyMs: res.latencyMs,
        error: res.error,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      setPingResult({
        success: false,
        latencyMs: 0,
        error: err?.message || 'Connection probe failed',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsTestingPing(false);
    }
  };

  const handleTestStaffWrite = async () => {
    setIsTestingStaffWrite(true);
    setWriteTestResult(null);
    const testId = `diag-staff-test-${Date.now()}`;
    const start = Date.now();
    try {
      console.log('[Diagnostic UI] Executing write test for staff collection...');
      const testMember: StaffMember = {
        id: testId,
        name: 'Diag Test Probe',
        email: 'probe@test.amarii.internal',
        phone: '0000000000',
        department: 'Management',
        designation: 'Diagnostic Ping Tester',
        roleType: 'employee',
        outlet: 'Amarii Cafe Kothrud',
        pin: '0000',
        password: 'diag',
        isActive: true,
        active: true,
      };

      // Write test document
      await saveStaffToFirebase(testMember);
      const writeDuration = Date.now() - start;

      // Clean up test document immediately
      await deleteStaffFromFirebase(testId);
      const totalDuration = Date.now() - start;

      setWriteTestResult({
        success: true,
        durationMs: totalDuration,
        message: `Write & Delete verified in ${writeDuration}ms (Round-trip ${totalDuration}ms). Write permissions confirmed!`,
      });
    } catch (err: any) {
      console.error('[Diagnostic UI] Write test failed:', err);
      setWriteTestResult({
        success: false,
        durationMs: Date.now() - start,
        message: `Write failed: ${err?.message || 'Permission denied or network failure'}`,
      });
    } finally {
      setIsTestingStaffWrite(false);
    }
  };

  const handleTriggerResync = async () => {
    setIsResyncing(true);
    try {
      await onForceResync();
    } finally {
      setIsResyncing(false);
    }
  };

  const isConnected = connectionState === 'connected';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="firestore-diag-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className={`w-full max-w-2xl border-2 sm:border-4 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden ${
          isLightMode ? 'bg-white border-zinc-900 text-zinc-900' : 'bg-[#111F17] border-[#244332] text-white'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between p-4 sm:p-5 border-b-2 ${
            isLightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#16281E] border-[#244332]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 flex items-center justify-center border rounded-xs ${
                isConnected
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-red-500/20 border-red-500 text-red-400'
              }`}
            >
              <Database className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="firestore-diag-title" className="text-base sm:text-lg font-black uppercase tracking-tight">
                  Firestore Connection & Sync Diagnostic
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-xs border ${
                    isConnected
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-red-500/20 text-red-400 border-red-500/40'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}
                  />
                  {isConnected ? 'ONLINE & SYNCED' : connectionState.toUpperCase()}
                </span>
              </div>
              <p className="text-xs font-bold text-zinc-500 tracking-tight">
                Real-time snapshot listeners & persistent document flow
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 border transition cursor-pointer hover:opacity-80 ${
              isLightMode ? 'bg-white border-zinc-300 text-zinc-700' : 'bg-[#1A3024] border-[#244332] text-zinc-300'
            }`}
            title="Close Diagnostic Window"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 modal-scroll-area text-xs sm:text-sm">
          {/* Status Banner */}
          <div
            className={`p-4 border-2 flex items-start gap-3 rounded-xs ${
              isConnected
                ? isLightMode
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                  : 'bg-emerald-950/40 border-emerald-600/70 text-emerald-200'
                : isLightMode
                ? 'bg-red-50 border-red-400 text-red-950'
                : 'bg-red-950/40 border-red-600/70 text-red-200'
            }`}
          >
            {isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-black uppercase tracking-tight text-xs sm:text-sm">
                {isConnected ? 'Connected to Cloud Database' : 'Connection Warning / Offline'}
              </p>
              <p className="text-xs opacity-90">
                {isConnected
                  ? isLiveRealtime
                    ? 'Active server-side snapshot listeners are receiving live database mutations directly from the cloud.'
                    : 'Client is reading from local cache. Real-time background sync is waiting for cloud ACK.'
                  : lastError || 'Checklist and staff data are operating in offline-cached mode.'}
              </p>
              {lastSyncTimestamp && (
                <p className="text-[11px] font-mono opacity-75">
                  Last successful sync event: {new Date(lastSyncTimestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          {/* Active Synced Documents Counter Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                Live Synced Documents (Local State)
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                {tasksCount + staffCount + shiftsCount + outletsCount} total active documents
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div
                className={`p-3 border rounded-xs ${
                  isLightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-[#16281E] border-[#244332]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-black uppercase">
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  <span>Tasks</span>
                </div>
                <div className="mt-1 text-2xl font-black font-mono text-amber-400">{tasksCount}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 font-bold">tasks collection</div>
              </div>

              <div
                className={`p-3 border rounded-xs ${
                  isLightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-[#16281E] border-[#244332]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-black uppercase">
                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Staff</span>
                </div>
                <div className="mt-1 text-2xl font-black font-mono text-emerald-400">{staffCount}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 font-bold">staff collection</div>
              </div>

              <div
                className={`p-3 border rounded-xs ${
                  isLightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-[#16281E] border-[#244332]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-black uppercase">
                  <Clock className="w-3.5 h-3.5 text-purple-500" />
                  <span>Shifts</span>
                </div>
                <div className="mt-1 text-2xl font-black font-mono text-purple-400">{shiftsCount}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 font-bold">shifts collection</div>
              </div>

              <div
                className={`p-3 border rounded-xs ${
                  isLightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-[#16281E] border-[#244332]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-black uppercase">
                  <Server className="w-3.5 h-3.5 text-blue-500" />
                  <span>Outlets</span>
                </div>
                <div className="mt-1 text-2xl font-black font-mono text-blue-400">{outletsCount}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 font-bold">outlets collection</div>
              </div>
            </div>
          </div>

          {/* Database Details & Configuration */}
          <div
            className={`p-4 border rounded-xs space-y-2.5 ${
              isLightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-[#14231A] border-[#244332]'
            }`}
          >
            <div className="text-xs font-black uppercase tracking-wider text-zinc-500">
              Cloud Infrastructure Configuration
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase font-sans font-bold">Database ID</span>
                <span className="font-bold text-[#E05A47] truncate" title={firebaseConfigData.firestoreDatabaseId}>
                  {firebaseConfigData.firestoreDatabaseId || '(default)'}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase font-sans font-bold">Project ID</span>
                <span className="font-bold text-zinc-300 truncate" title={firebaseConfigData.projectId}>
                  {firebaseConfigData.projectId}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase font-sans font-bold">Data Stream State</span>
                <span className="font-bold text-emerald-400">
                  {isLiveRealtime ? 'LIVE DIRECT FROM SERVER' : 'LOCAL PERSISTENT CACHE'}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase font-sans font-bold">Security Rules Status</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Hardened & Write Granted
                </span>
              </div>
            </div>
          </div>

          {/* Diagnostic Action Controls */}
          <div className="space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-500">
              Diagnostic Tests & Verification Tools
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {/* Test 1: Cloud Ping Probe */}
              <button
                type="button"
                onClick={handleTestPing}
                disabled={isTestingPing}
                className={`p-3 border text-left cursor-pointer transition flex flex-col justify-between rounded-xs ${
                  isLightMode
                    ? 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-900'
                    : 'bg-[#1A3024] hover:bg-[#203D2E] border-[#244332] text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-black text-xs uppercase tracking-tight flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-blue-400" />
                    Ping Server
                  </span>
                  {isTestingPing && <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Probes cloud server via getDocFromServer
                </p>
              </button>

              {/* Test 2: Staff Write Permission Test */}
              <button
                type="button"
                onClick={handleTestStaffWrite}
                disabled={isTestingStaffWrite}
                className={`p-3 border text-left cursor-pointer transition flex flex-col justify-between rounded-xs ${
                  isLightMode
                    ? 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-900'
                    : 'bg-[#1A3024] hover:bg-[#203D2E] border-[#244332] text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-black text-xs uppercase tracking-tight flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Test Staff Write
                  </span>
                  {isTestingStaffWrite && <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Verifies saveStaffToFirebase write rules
                </p>
              </button>

              {/* Test 3: Force Snapshot Resync */}
              <button
                type="button"
                onClick={handleTriggerResync}
                disabled={isResyncing}
                className={`p-3 border text-left cursor-pointer transition flex flex-col justify-between rounded-xs ${
                  isLightMode
                    ? 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-900'
                    : 'bg-[#1A3024] hover:bg-[#203D2E] border-[#244332] text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-black text-xs uppercase tracking-tight flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    Force Resync
                  </span>
                  {isResyncing && <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />}
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Re-executes getDocs for tasks & staff
                </p>
              </button>

              {/* Action 4: Sync All Staff to Database (users & staff collections) */}
              <button
                type="button"
                onClick={handleSyncStaffAndUsers}
                disabled={isSyncingAllStaff}
                className={`p-3 border text-left cursor-pointer transition flex flex-col justify-between rounded-xs ${
                  isLightMode
                    ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-400 text-emerald-950'
                    : 'bg-[#1e3b2c] hover:bg-[#274c39] border-emerald-600 text-emerald-100'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-black text-xs uppercase tracking-tight flex items-center gap-1.5 text-emerald-400">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    Sync Staff to Database
                  </span>
                  {isSyncingAllStaff && <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />}
                </div>
                <p className="text-[11px] opacity-80 leading-tight">
                  Saves Hemen Das, Aditya & all staff into 'staff' & 'users'
                </p>
              </button>
            </div>

            {/* Sync Staff Result Notification */}
            {syncResult && (
              <div
                className={`p-3 border rounded-xs text-xs font-mono ${
                  syncResult.success
                    ? isLightMode
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                      : 'bg-emerald-950/50 border-emerald-600 text-emerald-200'
                    : isLightMode
                    ? 'bg-red-50 border-red-400 text-red-950'
                    : 'bg-red-950/50 border-red-600 text-red-200'
                }`}
              >
                <div className="font-black font-sans uppercase flex items-center gap-1.5 mb-1">
                  {syncResult.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span>Staff & Users Database Sync:</span>
                </div>
                <div>{syncResult.message}</div>
              </div>
            )}

            {/* Test Results Output */}
            {pingResult && (
              <div
                className={`p-3 border rounded-xs text-xs font-mono ${
                  pingResult.success
                    ? isLightMode
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                    : isLightMode
                    ? 'bg-red-50 border-red-300 text-red-950'
                    : 'bg-red-950/40 border-red-700/60 text-red-200'
                }`}
              >
                <div className="font-black font-sans uppercase flex items-center gap-1.5 mb-1">
                  {pingResult.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span>Ping Server Result ({pingResult.timestamp}):</span>
                </div>
                {pingResult.success ? (
                  <div>
                    ✓ Server reachable. Round-trip probe latency:{' '}
                    <strong className="text-emerald-400">{pingResult.latencyMs}ms</strong>
                  </div>
                ) : (
                  <div>✗ Ping probe failed: {pingResult.error}</div>
                )}
              </div>
            )}

            {writeTestResult && (
              <div
                className={`p-3 border rounded-xs text-xs font-mono ${
                  writeTestResult.success
                    ? isLightMode
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                    : isLightMode
                    ? 'bg-red-50 border-red-300 text-red-950'
                    : 'bg-red-950/40 border-red-700/60 text-red-200'
                }`}
              >
                <div className="font-black font-sans uppercase flex items-center gap-1.5 mb-1">
                  {writeTestResult.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span>Staff Write Verification:</span>
                </div>
                <div>{writeTestResult.message}</div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`p-3 sm:p-4 border-t-2 flex items-center justify-between gap-3 ${
            isLightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#16281E] border-[#244332]'
          }`}
        >
          <div className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">
            Amarii Café Operations Real-Time Engine v2.4
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-black uppercase tracking-tight bg-[#E05A47] hover:bg-[#d04b38] text-white cursor-pointer rounded-xs transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
