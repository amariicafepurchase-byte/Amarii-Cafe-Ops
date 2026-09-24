import React, { useState, useMemo } from 'react';
import {
  X,
  UserPlus,
  Users,
  Shield,
  Briefcase,
  Phone,
  Mail,
  Trash2,
  Edit2,
  Check,
  Search,
  Plus,
  MapPin,
  KeyRound,
  Eye,
  EyeOff,
  UserX,
  UserCheck,
  RotateCcw,
  AlertCircle,
  Lock,
  Sparkles,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Copy,
  Database,
} from 'lucide-react';
import { StaffMember, TaskDepartment, RoleType, TaskItem, DEFAULT_OUTLET } from '../types';
import { DEPARTMENTS, DEPARTMENT_COLORS } from '../data/staffData';
import { useOutlet } from '../context/OutletContext';
import { useTheme } from '../context/ThemeContext';
import {
  saveStaffToFirebase,
  deleteStaffFromFirebase,
  generateStaffId,
  syncAllStaffAndUsersToFirestore,
} from '../lib/firebase';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  onAddStaff: (member: StaffMember) => Promise<void> | void;
  onUpdateStaff: (member: StaffMember) => Promise<void> | void;
  onDeleteStaff: (id: string) => Promise<void> | void;
  tasks?: TaskItem[];
  onAssignTask?: (staff: StaffMember) => void;
  onQuickAssignTaskToStaff?: (staff: StaffMember) => void;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  staffList = [],
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  tasks = [],
  onAssignTask,
  onQuickAssignTaskToStaff,
}) => {
  const { activeOutlet, availableOutlets, isOutletLocked, openOutletModal } = useOutlet();
  const { isLightMode } = useTheme();
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [showAllOutlets, setShowAllOutlets] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // Success alert with credentials for newly created staff
  const [newStaffCredentials, setNewStaffCredentials] = useState<{
    name: string;
    email: string;
    pin: string;
    password: string;
    department: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState<boolean>(false);

  // Form states
  const [isSyncingAllStaff, setIsSyncingAllStaff] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const handleSyncAllStaffToFirestore = async () => {
    setIsSyncingAllStaff(true);
    setSyncNotice(null);
    try {
      const res = await syncAllStaffAndUsersToFirestore(staffList);
      if (res.error) {
        setSyncNotice(`Database notice: ${res.error}`);
      } else {
        setSyncNotice(`✓ Synced all ${res.count} staff members (Hemen Das, Aditya, etc.) to database ('staff' & 'users')!`);
        setTimeout(() => setSyncNotice(null), 6000);
      }
    } catch (err: any) {
      setSyncNotice(`Sync notice: ${err?.message || 'Check database permissions'}`);
    } finally {
      setIsSyncingAllStaff(false);
    }
  };

  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formDept, setFormDept] = useState<TaskDepartment>('Kitchen');
  const [formOutlet, setFormOutlet] = useState<string>(activeOutlet);
  const [formRoleType, setFormRoleType] = useState<RoleType>('employee');
  const [formDesignation, setFormDesignation] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formConfirmPassword, setFormConfirmPassword] = useState<string>('');
  const [formPin, setFormPin] = useState<string>('');
  const [showFormPin, setShowFormPin] = useState<boolean>(false);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [formValidationError, setFormValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Quick Reveal PIN state for staff cards
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // Dedicated Set / Change 4-Digit Passcode (PIN) Modal
  const [pinModalStaff, setPinModalStaff] = useState<StaffMember | null>(null);
  const [modalPinInput, setModalPinInput] = useState<string>('');
  const [modalPinConfirm, setModalPinConfirm] = useState<string>('');
  const [pinModalError, setPinModalError] = useState<string | null>(null);
  const [pinSuccessMessage, setPinSuccessMessage] = useState<string | null>(null);

  // Dedicated Reset Password Quick Modal
  const [resetModalStaff, setResetModalStaff] = useState<StaffMember | null>(null);
  const [newResetPassword, setNewResetPassword] = useState<string>('');
  const [confirmResetPassword, setConfirmResetPassword] = useState<string>('');
  const [resetModalError, setResetModalError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'directory' | 'performance'>('directory');
  const [performanceSort, setPerformanceSort] = useState<'completion' | 'assigned' | 'needs-training' | 'name'>('completion');
  const [performanceDeptFilter, setPerformanceDeptFilter] = useState<string>('all');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const safeStaffList = useMemo(() => {
    const raw = Array.isArray(staffList) ? staffList : [];
    return raw.filter((s) => {
      if (!s) return false;
      const id = s.id || '';
      const name = (s.name || '').toLowerCase();
      if (id === 'staff-admin-arjun' || name.includes('arjun')) return false;
      return true;
    });
  }, [staffList]);

  if (!isOpen) return null;

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  // Filter staff by outlet, department, status, and search query
  const filteredStaff = safeStaffList.filter((s) => {
    if (!s) return false;
    const matchesOutlet = showAllOutlets || (s.outlet || DEFAULT_OUTLET) === activeOutlet;
    const matchesDept = selectedDeptFilter === 'all' || s.department === selectedDeptFilter;

    const isMemberActive = s.isActive !== false && s.active !== false;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isMemberActive) ||
      (statusFilter === 'deactivated' && !isMemberActive);

    const matchesSearch =
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.designation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.outlet || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesOutlet && matchesDept && matchesStatus && matchesSearch;
  });

  const handleStartAdd = (dept?: TaskDepartment) => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormDept(dept || 'Kitchen');
    setFormOutlet(activeOutlet);
    setFormRoleType('employee');
    setFormDesignation('');
    // Auto-generate a guaranteed 4-digit numeric PIN so staff can punch in immediately
    const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormPin(generatedPin);
    setFormPassword('');
    setFormConfirmPassword('');
    setFormIsActive(true);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowFormPin(true);
    setFormValidationError(null);
    setEditingStaffId(null);
    setIsAddingNew(true);
  };

  const handleStartEdit = (s: StaffMember) => {
    setFormName(s.name);
    setFormEmail(s.email || '');
    setFormPhone(s.phone || '');
    setFormDept(s.department);
    setFormOutlet(s.outlet || activeOutlet);
    setFormRoleType(s.roleType);
    setFormDesignation(s.designation);
    setFormPin(s.pin || '');
    setFormPassword('');
    setFormConfirmPassword('');
    setFormIsActive(s.isActive !== false && s.active !== false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowFormPin(false);
    setFormValidationError(null);
    setEditingStaffId(s.id);
    setIsAddingNew(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError(null);

    if (!formName.trim() || !formDesignation.trim()) {
      setFormValidationError('Please enter both Employee Name and Designation.');
      return;
    }

    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormValidationError('Please provide a valid work email address.');
      return;
    }

    if (!formPhone.trim()) {
      setFormValidationError('Please provide a valid contact phone number.');
      return;
    }

    // Password validation
    if (!editingStaffId) {
      // Adding new staff: Password is required
      if (!formPassword.trim()) {
        setFormValidationError('Password is required for new staff creation.');
        return;
      }
      if (formPassword.trim().length < 4) {
        setFormValidationError('Password must contain at least 4 characters.');
        return;
      }
      if (formPassword !== formConfirmPassword) {
        setFormValidationError('Passwords do not match. Please ensure both passwords match exactly.');
        return;
      }
    } else {
      // Editing existing staff: Password is only updated if entered
      if (formPassword.trim() || formConfirmPassword.trim()) {
        if (formPassword.trim().length < 4) {
          setFormValidationError('New password must contain at least 4 characters.');
          return;
        }
        if (formPassword !== formConfirmPassword) {
          setFormValidationError('Passwords do not match. Please ensure both passwords match exactly.');
          return;
        }
      }
    }

    // 4-Digit Passcode PIN validation
    let finalPin = formPin.trim();
    if (!editingStaffId) {
      if (!finalPin) {
        finalPin = Math.floor(1000 + Math.random() * 9000).toString();
      } else if (!/^\d{4}$/.test(finalPin)) {
        setFormValidationError('4-Digit Passcode (PIN) must contain exactly 4 numeric digits (e.g. 1234).');
        return;
      }
    } else {
      if (finalPin && !/^\d{4}$/.test(finalPin)) {
        setFormValidationError('4-Digit Passcode (PIN) must contain exactly 4 numeric digits (e.g. 1234).');
        return;
      }
    }

    if (editingStaffId) {
      const existing = staffList.find((s) => s.id === editingStaffId);
      if (existing) {
        const updatedStaff: StaffMember = {
          ...existing,
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          phone: formPhone.trim(),
          department: formDept,
          outlet: formOutlet || existing.outlet || activeOutlet,
          roleType: formRoleType,
          designation: formDesignation.trim(),
          isActive: formIsActive,
          active: formIsActive,
          pin: finalPin || (existing.pin || ''),
          password: formPassword.trim() ? formPassword.trim() : (existing.password || 'amarii123'),
          updatedAt: new Date().toISOString(),
        };

        setIsSaving(true);
        Promise.resolve(onUpdateStaff(updatedStaff))
          .then(() => {
            setIsAddingNew(false);
            setEditingStaffId(null);
          })
          .catch((err: any) => {
            console.error('Error saving updated staff:', err);
            setFormValidationError(`Failed to update staff in cloud: ${err?.message || 'Check connection'}`);
          })
          .finally(() => setIsSaving(false));
      }
    } else {
      const existingIds = (staffList || []).map((s) => s.id);
      const newStaffId = generateStaffId(formName.trim(), formRoleType, existingIds);
      const newMember: StaffMember = {
        id: newStaffId,
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        phone: formPhone.trim(),
        department: formDept,
        outlet: formOutlet || activeOutlet,
        roleType: formRoleType,
        designation: formDesignation.trim(),
        pin: finalPin,
        password: formPassword.trim(),
        isActive: formIsActive,
        active: formIsActive,
        avatarColor: formRoleType === 'manager' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setIsSaving(true);
      Promise.resolve(onAddStaff(newMember))
        .then(() => {
          setIsAddingNew(false);
          setEditingStaffId(null);
          setNewStaffCredentials({
            name: newMember.name,
            email: newMember.email,
            pin: newMember.pin || finalPin,
            password: newMember.password || '',
            department: newMember.department,
          });
        })
        .catch((err: any) => {
          console.error('Error creating staff:', err);
          setFormValidationError(`Failed to save new staff to database: ${err?.message || 'Check connection'}`);
        })
        .finally(() => setIsSaving(false));
    }
  };

  // Handler for opening dedicated Set/Change PIN modal
  const handleOpenPinModal = (staff: StaffMember) => {
    setPinModalStaff(staff);
    setModalPinInput(staff.pin || '');
    setModalPinConfirm(staff.pin || '');
    setPinModalError(null);
    setPinSuccessMessage(null);
  };

  const handleSavePinModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinModalError(null);
    if (!pinModalStaff) return;

    if (!modalPinInput.trim()) {
      setPinModalError('Please enter a 4-digit PIN passcode.');
      return;
    }

    if (!/^\d{4}$/.test(modalPinInput.trim())) {
      setPinModalError('Passcode PIN must be exactly 4 numeric digits (0-9).');
      return;
    }

    if (modalPinInput !== modalPinConfirm) {
      setPinModalError('Passcodes do not match. Please retype to confirm.');
      return;
    }

    const updatedWithPin: StaffMember = {
      ...pinModalStaff,
      pin: modalPinInput.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onUpdateStaff(updatedWithPin);
      setPinSuccessMessage(`Passcode successfully updated to ${modalPinInput.trim()} for ${pinModalStaff.name}!`);
      setTimeout(() => {
        setPinModalStaff(null);
        setPinSuccessMessage(null);
      }, 1200);
    } catch (err: any) {
      setPinModalError(`Failed to save PIN in cloud: ${err?.message || 'Check connection'}`);
    }
  };

  const handleGenerateModalPin = () => {
    const randomPin = String(Math.floor(1000 + Math.random() * 9000));
    setModalPinInput(randomPin);
    setModalPinConfirm(randomPin);
    setPinModalError(null);
  };

  const handleGenerateFormPin = () => {
    const randomPin = String(Math.floor(1000 + Math.random() * 9000));
    setFormPin(randomPin);
    setFormValidationError(null);
  };

  // Handler for opening dedicated reset password modal
  const handleOpenResetModal = (staff: StaffMember) => {
    setResetModalStaff(staff);
    setNewResetPassword('');
    setConfirmResetPassword('');
    setResetModalError(null);
    setResetSuccessMessage(null);
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetModalError(null);

    if (!resetModalStaff) return;

    if (!newResetPassword.trim()) {
      setResetModalError('Please enter a new password.');
      return;
    }

    if (newResetPassword.length < 4) {
      setResetModalError('Password must be at least 4 characters long.');
      return;
    }

    if (newResetPassword !== confirmResetPassword) {
      setResetModalError('Passwords do not match. Please check and retype.');
      return;
    }

    const updatedWithPassword: StaffMember = {
      ...resetModalStaff,
      password: newResetPassword.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onUpdateStaff(updatedWithPassword);
      setResetSuccessMessage(`Password updated successfully for ${resetModalStaff.name}.`);
      setTimeout(() => {
        setResetModalStaff(null);
        setResetSuccessMessage(null);
      }, 1200);
    } catch (err: any) {
      setResetModalError(`Failed to save password in cloud: ${err?.message || 'Check connection'}`);
    }
  };

  const handleGenerateRandomPassword = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const tempPass = `Amarii@${randomDigits}`;
    setNewResetPassword(tempPass);
    setConfirmResetPassword(tempPass);
    setResetModalError(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Staff Management"
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden"
    >
      <div className={`relative max-w-5xl w-full ${
        isLightMode
          ? 'bg-[#F4F6F2] border-t-4 sm:border-4 border-zinc-900 text-zinc-900'
          : 'bg-zinc-950 border-t-4 sm:border-4 border-white text-white'
      } shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-none`}>
        {/* Mobile Drag Indicator */}
        <div className={`w-12 h-1 ${isLightMode ? 'bg-zinc-300' : 'bg-zinc-700'} rounded-full mx-auto mt-2.5 sm:hidden`} />

        {/* Modal Header */}
        <div className={`px-3 sm:px-4 py-2 sm:py-2.5 ${
          isLightMode
            ? 'bg-white border-b border-zinc-200 text-zinc-900'
            : 'bg-zinc-900 border-b border-zinc-800 text-white'
        } flex items-center justify-between gap-2`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 ${isLightMode ? 'bg-zinc-900 text-white' : 'bg-white text-black'} font-black rounded-xs shrink-0`}>
              <Users className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className={`text-xs sm:text-sm font-black uppercase tracking-tight ${isLightMode ? 'text-zinc-950' : 'text-white'} leading-tight truncate`}>
                  Staff & Access Control
                </h2>
                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-red-600/90 text-white tracking-wider rounded-xs shrink-0">
                  AUTH & ROLES
                </span>
              </div>
              <p className={`text-[9px] sm:text-[10px] ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'} font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5 truncate`}>
                <span>Branch:</span>
                <span className="text-amber-500 font-black flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {activeOutlet}
                </span>
                <span className="hidden sm:inline">• Credentials & Roster Status</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleSyncAllStaffToFirestore}
              disabled={isSyncingAllStaff}
              className={`h-7 sm:h-7.5 px-2 sm:px-2.5 ${
                isLightMode
                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                  : 'bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-200 border border-emerald-700/60'
              } text-[10px] sm:text-[11px] font-black uppercase tracking-tight flex items-center gap-1 transition cursor-pointer rounded-xs`}
              title="Sync all staff to database ('staff' & 'users' collections)"
            >
              <Database className={`w-3 h-3 ${isSyncingAllStaff ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncingAllStaff ? 'Syncing...' : 'Sync to Cloud'}</span>
              <span className="sm:hidden">{isSyncingAllStaff ? '...' : 'Sync'}</span>
            </button>

            {!isAddingNew && (
              <button
                type="button"
                id="btn-add-new-staff-top"
                onClick={() => handleStartAdd()}
                className={`h-7 sm:h-7.5 px-2 sm:px-2.5 ${
                  isLightMode
                    ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                    : 'bg-white text-black hover:bg-zinc-200'
                } text-[10px] sm:text-[11px] font-black uppercase tracking-tight flex items-center gap-1 transition cursor-pointer rounded-xs`}
              >
                <UserPlus className="w-3 h-3 stroke-[2.5]" />
                <span className="hidden sm:inline">Add Staff Member</span>
                <span className="sm:hidden">+ Add</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`h-7 w-7 sm:h-7.5 sm:w-7.5 ${
                isLightMode
                  ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                  : 'bg-zinc-800 hover:bg-white hover:text-black text-white border-zinc-700'
              } transition border cursor-pointer rounded-xs flex items-center justify-center`}
              aria-label="Close modal"
            >
              <X className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex ${isLightMode ? 'bg-zinc-100 border-b border-zinc-200' : 'bg-[#0A0A0A] border-b border-zinc-800'}`}>
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`flex-1 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-colors ${
              activeTab === 'directory'
                ? isLightMode
                  ? 'bg-white border-b-2 border-zinc-900 text-zinc-950 shadow-xs'
                  : 'bg-zinc-900 border-b-2 border-white text-white'
                : isLightMode
                ? 'text-zinc-600 hover:text-zinc-950 hover:bg-white/60'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
            }`}
          >
            Directory & Access
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`flex-1 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'performance'
                ? isLightMode
                  ? 'bg-white border-b-2 border-emerald-600 text-emerald-700 shadow-xs'
                  : 'bg-zinc-900 border-b-2 border-emerald-400 text-emerald-400'
                : isLightMode
                ? 'text-zinc-600 hover:text-emerald-700 hover:bg-white/60'
                : 'text-zinc-500 hover:text-emerald-500/70 hover:bg-zinc-900/50'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Staff Performance</span>
          </button>
        </div>

        {/* Content Body */}
        <div className={`flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4 ${isLightMode ? 'bg-[#F4F6F2]' : 'bg-zinc-950'}`}>
          {syncNotice && (
            <div className="p-3 bg-emerald-500/20 border-2 border-emerald-500 text-emerald-200 text-xs font-bold rounded-xs flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{syncNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setSyncNotice(null)}
                className="text-emerald-300 hover:text-white cursor-pointer px-1"
              >
                ✕
              </button>
            </div>
          )}

          {activeTab === 'directory' ? (
            <>
              {/* Add / Edit Form Drawer */}
              {isAddingNew && (
                <form
                  id="staff-form"
                  onSubmit={handleSaveForm}
                  className={`p-3 sm:p-3.5 ${
                    isLightMode
                      ? 'bg-white border border-zinc-300 text-zinc-900 shadow-sm'
                      : 'bg-zinc-900 border border-zinc-700 text-white shadow-lg'
                  } space-y-2.5 animate-in slide-in-from-top-2 duration-200 rounded-xs`}
                >
                  <div className={`flex items-center justify-between border-b ${isLightMode ? 'border-zinc-200' : 'border-zinc-800'} pb-1.5`}>
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-red-500" />
                      <h3 className={`text-[11px] sm:text-xs font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>
                        {editingStaffId ? 'Edit Staff Member & Access' : 'Add New Staff Member'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className={`text-[10px] ${isLightMode ? 'text-zinc-500 hover:text-zinc-950' : 'text-zinc-400 hover:text-white'} font-bold uppercase underline cursor-pointer`}
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Form Validation Alert Box */}
                  {formValidationError && (
                    <div
                      id="form-validation-alert"
                      role="alert"
                      className="p-2 bg-red-950/80 border border-red-600 text-red-200 text-[11px] font-bold flex items-center gap-1.5 animate-in shake duration-200 rounded-xs"
                    >
                      <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                      <span>{formValidationError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                    {/* 1. Full Name */}
                    <div>
                      <label className={`block text-[9px] font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'} mb-1`}>
                        Employee / Manager Name *
                      </label>
                      <input
                        type="text"
                        id="input-staff-name"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Anand Verma, Priya Sharma"
                        className={`w-full px-2 py-1 h-8 ${
                          isLightMode
                            ? 'bg-zinc-50 text-zinc-900 border-zinc-300 focus:border-zinc-900 placeholder:text-zinc-400'
                            : 'bg-black text-white border-zinc-700 focus:border-white placeholder:text-zinc-500'
                        } text-[11px] font-bold border outline-none rounded-xs`}
                      />
                    </div>

                    {/* 2. Email Address */}
                    <div>
                      <label className={`block text-[9px] font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'} mb-1 flex items-center gap-1`}>
                        <Mail className={`w-2.5 h-2.5 ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'}`} />
                        <span>Work Email Address *</span>
                      </label>
                      <input
                        type="email"
                        id="input-staff-email"
                        required
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="e.g. anand.verma@amarii.cafe"
                        className={`w-full px-2 py-1 h-8 ${
                          isLightMode
                            ? 'bg-zinc-50 text-zinc-900 border-zinc-300 focus:border-zinc-900 placeholder:text-zinc-400'
                            : 'bg-black text-white border-zinc-700 focus:border-white placeholder:text-zinc-500'
                        } text-[11px] font-bold border outline-none rounded-xs`}
                      />
                    </div>

                    {/* 3. Phone Number */}
                    <div>
                      <label className={`block text-[9px] font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'} mb-1 flex items-center gap-1`}>
                        <Phone className={`w-2.5 h-2.5 ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'}`} />
                        <span>Contact Phone Number *</span>
                      </label>
                      <input
                        type="tel"
                        id="input-staff-phone"
                        required
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className={`w-full px-2 py-1 h-8 ${
                          isLightMode
                            ? 'bg-zinc-50 text-zinc-900 border-zinc-300 focus:border-zinc-900 placeholder:text-zinc-400'
                            : 'bg-black text-white border-zinc-700 focus:border-white placeholder:text-zinc-500'
                        } text-[11px] font-bold border outline-none rounded-xs`}
                      />
                    </div>

                    {/* 4. Outlet / Branch Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={`text-[9px] font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'} flex items-center gap-1`}>
                          <MapPin className="w-2.5 h-2.5 text-amber-500" />
                          <span>Assigned Branch / Outlet *</span>
                        </label>
                        <button
                          type="button"
                          id="btn-staff-modal-manage-outlets"
                          onClick={() => openOutletModal()}
                          className="text-[8px] font-bold text-amber-500 hover:text-amber-600 uppercase tracking-tight flex items-center gap-0.5 cursor-pointer hover:underline"
                          title="Add or manage physical cafe branches"
                        >
                          <Plus className="w-2 h-2 stroke-[3]" />
                          <span>Manage Outlets</span>
                        </button>
                      </div>
                      <select
                        id="select-staff-outlet"
                        value={formOutlet}
                        onChange={(e) => setFormOutlet(e.target.value)}
                        className={`w-full px-2 py-1 h-8 ${
                          isLightMode
                            ? 'bg-zinc-50 text-zinc-900 border-zinc-300 focus:border-amber-500'
                            : 'bg-black text-white border-zinc-700 focus:border-amber-400'
                        } text-[11px] font-black uppercase border outline-none cursor-pointer rounded-xs`}
                      >
                        {availableOutlets.map((o) => (
                          <option key={o} value={o}>
                            📍 {o}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 5. Department */}
                    <div>
                      <label className={`block text-[9px] font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'} mb-1`}>
                        Station / Department *
                      </label>
                      <select
                        id="select-staff-dept"
                        value={formDept}
                        onChange={(e) => setFormDept(e.target.value as TaskDepartment)}
                        className={`w-full px-2 py-1 h-8 ${
                          isLightMode
                            ? 'bg-zinc-50 text-zinc-900 border-zinc-300 focus:border-zinc-900'
                            : 'bg-black text-white border-zinc-700 focus:border-white'
                        } text-[11px] font-black uppercase border outline-none cursor-pointer rounded-xs`}
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 6. Designation */}
                    <div>
                      <label className={`block text-[9px] font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'} mb-1`}>
                        Specific Designation / Title *
                      </label>
                      <input
                        type="text"
                        id="input-staff-designation"
                        required
                        value={formDesignation}
                        onChange={(e) => setFormDesignation(e.target.value)}
                        placeholder="e.g. Head Chef, Senior Barista, Cash Lead"
                        className={`w-full px-2 py-1 h-8 ${
                          isLightMode
                            ? 'bg-zinc-50 text-zinc-900 border-zinc-300 focus:border-zinc-900 placeholder:text-zinc-400'
                            : 'bg-black text-white border-zinc-700 focus:border-white placeholder:text-zinc-500'
                        } text-[11px] font-bold border outline-none rounded-xs`}
                      />
                    </div>

                    {/* 7. Role Category */}
                    <div>
                      <label className={`block text-[9px] font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'} mb-1`}>
                        Role Category *
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          id="btn-role-employee"
                          onClick={() => setFormRoleType('employee')}
                          className={`h-7.5 text-[10px] font-black uppercase border transition cursor-pointer rounded-xs ${
                            formRoleType === 'employee'
                              ? isLightMode
                                ? 'bg-zinc-900 text-white border-zinc-900'
                                : 'bg-white text-black border-white'
                              : isLightMode
                              ? 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:border-zinc-400'
                              : 'bg-black text-zinc-400 border-zinc-700 hover:border-zinc-500'
                          }`}
                        >
                          Employee
                        </button>
                        <button
                          type="button"
                          id="btn-role-manager"
                          onClick={() => setFormRoleType('manager')}
                          className={`h-7.5 text-[10px] font-black uppercase border transition cursor-pointer rounded-xs ${
                            formRoleType === 'manager'
                              ? 'bg-red-500 text-white border-red-500 font-black'
                              : isLightMode
                              ? 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:border-zinc-400'
                              : 'bg-black text-zinc-400 border-zinc-700 hover:border-zinc-500'
                          }`}
                        >
                          Manager / Lead
                        </button>
                      </div>
                    </div>

                    {/* 8. Account Status Toggle (Active / Deactivated) */}
                    <div>
                      <label className={`block text-[9px] font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'} mb-1`}>
                        Account Status *
                      </label>
                      <div
                        role="button"
                        tabIndex={0}
                        id="toggle-account-status"
                        onClick={() => setFormIsActive(!formIsActive)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setFormIsActive(!formIsActive);
                          }
                        }}
                        className={`px-2 h-7.5 border flex items-center justify-between cursor-pointer transition select-none rounded-xs ${
                          formIsActive
                            ? isLightMode
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                              : 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                            : isLightMode
                            ? 'bg-red-50 border-red-400 text-red-800'
                            : 'bg-red-950/40 border-red-500 text-red-300'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {formIsActive ? (
                            <UserCheck className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <UserX className="w-3 h-3 text-red-500" />
                          )}
                          <span className="text-[10px] font-black uppercase">
                            {formIsActive ? 'ACTIVE' : 'DEACTIVATED'}
                          </span>
                        </div>

                        {/* Visual Switch Pill */}
                        <div
                          className={`w-7 h-4 rounded-full p-0.5 transition-colors ${
                            formIsActive ? 'bg-emerald-600' : 'bg-zinc-400'
                          }`}
                        >
                          <div
                            className={`w-3 h-3 bg-white rounded-full transition-transform ${
                              formIsActive ? 'translate-x-3' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4-Digit Passcode (PIN) Section */}
                  <div className={`pt-2 border-t ${isLightMode ? 'border-zinc-200' : 'border-zinc-800'} space-y-1.5`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-800' : 'text-zinc-200'} flex items-center gap-1`}>
                        <KeyRound className="w-2.5 h-2.5 text-amber-500" />
                        <span>4-Digit Quick Passcode (PIN)</span>
                      </span>

                      <button
                        type="button"
                        onClick={handleGenerateFormPin}
                        className={`px-1.5 py-0.5 ${
                          isLightMode
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50'
                        } border text-[8px] font-black uppercase tracking-tight flex items-center gap-0.5 cursor-pointer rounded-xs`}
                      >
                        <Sparkles className="w-2 h-2" />
                        <span>Auto-Generate</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 items-center">
                      <div>
                        <div className="relative">
                          <input
                            type={showFormPin ? 'text' : 'password'}
                            id="input-staff-pin"
                            maxLength={4}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={formPin}
                            onChange={(e) => {
                              setFormPin(e.target.value.replace(/\D/g, ''));
                              setFormValidationError(null);
                            }}
                            placeholder={editingStaffId ? 'Keep current PIN' : 'e.g. 1234'}
                            className={`w-full pl-2.5 pr-7 py-1 h-8 ${
                              isLightMode
                                ? 'bg-zinc-50 text-amber-700 border-zinc-300 focus:border-amber-500 placeholder:text-zinc-400'
                                : 'bg-black text-amber-300 border-zinc-700 focus:border-amber-400'
                            } font-mono text-center text-xs font-black tracking-widest border outline-none rounded-xs`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowFormPin(!showFormPin)}
                            className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 ${isLightMode ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'}`}
                            aria-label={showFormPin ? 'Hide PIN' : 'Show PIN'}
                          >
                            {showFormPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div className={`text-[9px] font-medium p-1 border rounded-xs ${
                        isLightMode ? 'bg-zinc-50 border-zinc-200 text-zinc-600' : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                      }`}>
                        Staff uses this 4-digit PIN on the mobile login keypad for fast station punch-in.
                      </div>
                    </div>
                  </div>

                  {/* Password & Confirm Password Section */}
                  <div className={`pt-2 border-t ${isLightMode ? 'border-zinc-200' : 'border-zinc-800'} space-y-1.5`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-800' : 'text-zinc-200'} flex items-center gap-1`}>
                        <Lock className="w-2.5 h-2.5 text-red-500" />
                        <span>
                          {editingStaffId ? 'Password Credentials (Optional Update)' : 'Set Password Credentials *'}
                        </span>
                      </span>

                      {editingStaffId && (
                        <button
                          type="button"
                          id="btn-inline-reset-password"
                          onClick={() => {
                            const existing = staffList.find((s) => s.id === editingStaffId);
                            if (existing) handleOpenResetModal(existing);
                          }}
                          className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-black text-[8px] font-black uppercase tracking-tight flex items-center gap-0.5 transition cursor-pointer rounded-xs"
                        >
                          <RotateCcw className="w-2 h-2 stroke-[3]" />
                          <span>Quick Reset</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                      {/* Password Field */}
                      <div>
                        <label className={`block text-[9px] font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'} mb-1`}>
                          {editingStaffId ? 'New Password (optional)' : 'Password *'}
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            id="input-staff-password"
                            value={formPassword}
                            onChange={(e) => {
                              setFormPassword(e.target.value);
                              setFormValidationError(null);
                            }}
                            placeholder={editingStaffId ? 'Keep existing password' : 'Min 4 characters'}
                            className={`w-full pl-2 pr-7 py-1 h-8 ${
                              isLightMode
                                ? 'bg-zinc-50 text-zinc-900 border-zinc-300 focus:border-zinc-900 placeholder:text-zinc-400'
                                : 'bg-black text-white border-zinc-700 focus:border-white placeholder:text-zinc-500'
                            } text-[11px] font-mono border outline-none rounded-xs`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 ${isLightMode ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'}`}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password Field */}
                      <div>
                        <label className={`block text-[9px] font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'} mb-1`}>
                          {editingStaffId ? 'Confirm New Password' : 'Confirm Password *'}
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            id="input-staff-confirm-password"
                            value={formConfirmPassword}
                            onChange={(e) => {
                              setFormConfirmPassword(e.target.value);
                              setFormValidationError(null);
                            }}
                            placeholder={editingStaffId ? 'Confirm password' : 'Retype password'}
                            className={`w-full pl-2 pr-7 py-1 h-8 ${
                              isLightMode
                                ? 'bg-zinc-50 text-zinc-900 placeholder:text-zinc-400'
                                : 'bg-black text-white placeholder:text-zinc-500'
                            } text-[11px] font-mono border outline-none rounded-xs ${
                              formConfirmPassword && formPassword !== formConfirmPassword
                                ? 'border-red-500 focus:border-red-400'
                                : isLightMode
                                ? 'border-zinc-300 focus:border-zinc-900'
                                : 'border-zinc-700 focus:border-white'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 ${isLightMode ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'}`}
                            aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                          >
                            {showConfirmPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Action Buttons */}
                  <div className={`flex items-center justify-end gap-2 pt-2 border-t ${isLightMode ? 'border-zinc-200' : 'border-zinc-800'}`}>
                    <button
                      type="button"
                      id="btn-cancel-staff-form"
                      onClick={() => setIsAddingNew(false)}
                      className={`px-3 h-7.5 ${
                        isLightMode
                          ? 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300'
                          : 'bg-zinc-800 text-zinc-300 hover:text-white'
                      } text-[10px] sm:text-[11px] font-bold uppercase transition rounded-xs cursor-pointer`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      id="btn-submit-staff-form"
                      disabled={isSaving}
                      className={`px-3.5 h-7.5 ${
                        isSaving ? 'opacity-70 cursor-not-allowed' : ''
                      } ${
                        isLightMode
                          ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                          : 'bg-white text-black hover:bg-zinc-200'
                      } text-[10px] sm:text-[11px] font-black uppercase transition cursor-pointer flex items-center gap-1 rounded-xs`}
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                          <span>Saving to Cloud...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>{editingStaffId ? 'Save Updates' : 'Add Staff Member'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

          {/* New Staff Added Success Credentials Alert */}
          {newStaffCredentials && (
            <div className={`p-3.5 mb-3 border rounded-xs ${
              isLightMode ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
            } flex flex-col gap-2 shadow-sm animate-in fade-in`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-xs font-black uppercase tracking-tight text-emerald-600 dark:text-emerald-400">
                    Staff Member Added to Cloud Database!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewStaffCredentials(null)}
                  className="p-1 text-emerald-600 hover:text-emerald-900 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono bg-black/10 dark:bg-black/40 p-2 rounded-xs border border-emerald-500/30">
                <div>
                  <span className="text-[9px] uppercase font-bold text-zinc-500 block">Staff Name & Station</span>
                  <span className="font-bold text-xs">{newStaffCredentials.name} ({newStaffCredentials.department})</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-zinc-500 block">4-Digit Punch-In PIN</span>
                  <span className="font-black text-amber-500 text-sm tracking-widest bg-black/60 px-1.5 py-0.5 rounded-xs border border-amber-500/40 inline-block">{newStaffCredentials.pin}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-zinc-500 block">Email & Password</span>
                  <span className="font-medium text-[10px] break-all">{newStaffCredentials.email} / {newStaffCredentials.password}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                  Staff can now punch in immediately using this 4-Digit PIN or their email/password.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const text = `Amarii Cafe Staff Login:\nName: ${newStaffCredentials.name}\nDepartment: ${newStaffCredentials.department}\n4-Digit PIN: ${newStaffCredentials.pin}\nEmail: ${newStaffCredentials.email}\nPassword: ${newStaffCredentials.password}`;
                    navigator.clipboard.writeText(text);
                    setCopiedCreds(true);
                    setTimeout(() => setCopiedCreds(false), 2000);
                  }}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] uppercase tracking-wider rounded-xs cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  {copiedCreds ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCreds ? 'Copied!' : 'Copy Credentials'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Search, Status & Department Filters */}
          <div className="space-y-2.5">
            {/* Branch Filter Status Bar */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between text-xs ${
              isLightMode ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-zinc-900 border-zinc-800 text-zinc-300'
            } border p-1.5 sm:p-2 rounded-xs gap-1.5`}>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-medium">Location:</span>
                <span className="font-black text-amber-500 text-[9px] sm:text-[10px]">
                  {showAllOutlets ? 'All Outlets' : activeOutlet}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Account Status Filter Buttons */}
                <div className={`flex items-center border ${
                  isLightMode ? 'border-zinc-300 bg-zinc-100' : 'border-zinc-700 bg-black'
                } p-0.5 text-[8px] sm:text-[9px] font-black uppercase rounded-xs`}>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-1.5 py-0.5 transition rounded-xs ${
                      statusFilter === 'all'
                        ? isLightMode
                          ? 'bg-zinc-900 text-white font-black'
                          : 'bg-white text-black font-black'
                        : isLightMode
                        ? 'text-zinc-600 hover:text-zinc-900'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('active')}
                    className={`px-1.5 py-0.5 transition rounded-xs ${
                      statusFilter === 'active'
                        ? 'bg-emerald-500 text-black font-black'
                        : isLightMode
                        ? 'text-zinc-600 hover:text-emerald-600'
                        : 'text-zinc-400 hover:text-emerald-400'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('deactivated')}
                    className={`px-1.5 py-0.5 transition rounded-xs ${
                      statusFilter === 'deactivated'
                        ? 'bg-red-500 text-white font-black'
                        : isLightMode
                        ? 'text-zinc-600 hover:text-red-600'
                        : 'text-zinc-400 hover:text-red-400'
                    }`}
                  >
                    Deactivated
                  </button>
                </div>

                {!isOutletLocked && (
                  <button
                    type="button"
                    onClick={() => setShowAllOutlets(!showAllOutlets)}
                    className={`text-[8px] sm:text-[9px] font-bold uppercase underline ${
                      isLightMode ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'
                    } cursor-pointer`}
                  >
                    {showAllOutlets ? `Show ${activeOutlet}` : 'All Outlets'}
                  </button>
                )}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className={`w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 ${isLightMode ? 'text-zinc-400' : 'text-zinc-500'}`} />
              <input
                type="text"
                id="input-search-staff"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name, email, phone, designation..."
                className={`w-full pl-7 pr-2.5 h-8 ${
                  isLightMode
                    ? 'bg-white border-zinc-300 focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-400'
                    : 'bg-zinc-900 border-zinc-800 focus:border-white text-white placeholder:text-zinc-600'
                } border text-[11px] outline-none rounded-xs`}
              />
            </div>

            {/* Department Chips */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => setSelectedDeptFilter('all')}
                className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-tight whitespace-nowrap border transition cursor-pointer rounded-xs ${
                  selectedDeptFilter === 'all'
                    ? isLightMode
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-black border-white'
                    : isLightMode
                    ? 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-500'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                All ({safeStaffList.length})
              </button>

              {DEPARTMENTS.map((dept) => {
                const count = safeStaffList.filter((s) => s?.department === dept).length;
                const isSelected = selectedDeptFilter === dept;
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDeptFilter(dept)}
                    className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-tight whitespace-nowrap border transition cursor-pointer rounded-xs ${
                      isSelected
                        ? isLightMode
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow'
                          : 'bg-white text-black border-white shadow'
                        : isLightMode
                        ? 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-500'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {dept} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Staff Directory Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredStaff.length === 0 ? (
              <div className={`col-span-full py-8 text-center text-xs font-bold uppercase tracking-wider ${
                isLightMode ? 'text-zinc-500 bg-white border-zinc-300' : 'text-zinc-500 bg-zinc-900/40 border-zinc-800'
              } border border-dashed`}>
                No staff found matching query. Click "+ Add Staff Member" above to create one.
              </div>
            ) : (
              filteredStaff.map((staff) => {
                const colors = DEPARTMENT_COLORS[staff.department] || DEPARTMENT_COLORS.General;
                const isStaffActive = staff.isActive !== false && staff.active !== false;
                const assignedTasks = safeTasks.filter(
                  (t) => t?.assigneeId === staff.id || (t?.assignee && t.assignee.includes(staff.name))
                );
                const pendingTasks = assignedTasks.filter((t) => !t?.completed);

                return (
                  <div
                    key={staff.id}
                    id={`staff-card-${staff.id}`}
                    className={`p-3 border transition flex flex-col justify-between gap-2.5 rounded-xs ${
                      isStaffActive
                        ? isLightMode
                          ? 'bg-white border-zinc-300 hover:border-zinc-500 text-zinc-900 shadow-xs'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-white'
                        : isLightMode
                        ? 'bg-red-50/70 border-red-300 text-zinc-800 opacity-90'
                        : 'bg-zinc-950 border-red-900/60 opacity-80 hover:opacity-100 text-white'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-xs ${colors.badge}`}>
                          {staff.department}
                        </span>

                        <div className="flex items-center gap-1">
                          {/* Active / Deactivated Badge */}
                          {isStaffActive ? (
                            <span className="text-[8px] font-black uppercase px-1 py-0.5 bg-emerald-950 border border-emerald-600 text-emerald-400 flex items-center gap-0.5 rounded-xs">
                              <UserCheck className="w-2.5 h-2.5" />
                              <span>ACTIVE</span>
                            </span>
                          ) : (
                            <span className="text-[8px] font-black uppercase px-1 py-0.5 bg-red-950 border border-red-600 text-red-400 flex items-center gap-0.5 rounded-xs">
                              <UserX className="w-2.5 h-2.5" />
                              <span>DEACTIVATED</span>
                            </span>
                          )}

                          <span
                            className={`text-[8px] font-black uppercase px-1.5 py-0.5 border rounded-xs ${
                              staff.roleType === 'manager'
                                ? 'bg-red-500 text-black border-red-500 font-black'
                                : isLightMode
                                ? 'bg-zinc-100 text-zinc-700 border-zinc-300'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {staff.roleType === 'manager' ? '★ MGR' : 'EMP'}
                          </span>
                        </div>
                      </div>

                      {/* Staff Name & Designation */}
                      <h4 className={`text-xs sm:text-sm font-black uppercase ${isLightMode ? 'text-zinc-950' : 'text-white'} tracking-tight leading-tight`}>
                        {staff.name}
                      </h4>
                      <p className={`text-[10px] sm:text-[11px] ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'} font-bold uppercase mt-0.5`}>
                        {staff.designation}
                      </p>

                      {/* Contact & Branch Meta */}
                      <div className={`mt-1.5 space-y-0.5 text-[9px] font-medium ${isLightMode ? 'text-zinc-600' : 'text-zinc-300'}`}>
                        {staff.email && (
                          <div className={`flex items-center gap-1 ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            <Mail className={`w-2.5 h-2.5 ${isLightMode ? 'text-zinc-400' : 'text-zinc-500'} shrink-0`} />
                            <span className="truncate font-mono">{staff.email}</span>
                          </div>
                        )}
                        {staff.phone && (
                          <div className={`flex items-center gap-1 ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            <Phone className={`w-2.5 h-2.5 ${isLightMode ? 'text-zinc-400' : 'text-zinc-500'} shrink-0`} />
                            <span className="truncate font-mono">{staff.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <MapPin className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          <span className="truncate">{staff.outlet || DEFAULT_OUTLET}</span>
                        </div>
                      </div>

                      {/* 4-Digit Passcode (PIN) Quick View & Set */}
                      <div className={`mt-2 p-1.5 ${
                        isLightMode ? 'bg-amber-50/80 border-amber-200' : 'bg-black/60 border-zinc-800'
                      } border rounded-xs flex items-center justify-between`}>
                        <div className="flex items-center gap-1">
                          <KeyRound className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className={`text-[9px] font-black uppercase ${isLightMode ? 'text-zinc-700' : 'text-zinc-400'}`}>PIN:</span>
                          <span className={`font-mono font-black text-[11px] ${isLightMode ? 'text-amber-800' : 'text-amber-300'} tracking-widest`}>
                            {revealedPins[staff.id]
                              ? (staff.pin || '----')
                              : '••••'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setRevealedPins((prev) => ({ ...prev, [staff.id]: !prev[staff.id] }))}
                            className={`p-0.5 ${isLightMode ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'} cursor-pointer`}
                            title={revealedPins[staff.id] ? 'Hide PIN' : 'Show PIN'}
                          >
                            {revealedPins[staff.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            id={`btn-set-pin-${staff.id}`}
                            onClick={() => handleOpenPinModal(staff)}
                            className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-black text-[8px] font-black uppercase tracking-tight rounded-xs cursor-pointer flex items-center gap-0.5 shadow-xs"
                            title="Set / Change 4-Digit Passcode"
                          >
                            <KeyRound className="w-2 h-2" />
                            <span>Set PIN</span>
                          </button>
                        </div>
                      </div>

                      {/* Shift Task Load Indicator */}
                      <div className={`mt-2 pt-1.5 border-t ${
                        isLightMode ? 'border-zinc-200 text-zinc-600' : 'border-zinc-800 text-zinc-400'
                      } flex items-center justify-between text-[9px] font-bold uppercase`}>
                        <span>Active Tasks:</span>
                        <span className={pendingTasks.length > 0 ? (isLightMode ? 'text-zinc-900 font-mono font-black' : 'text-white font-mono font-black') : 'text-zinc-500'}>
                          {pendingTasks.length} pending / {assignedTasks.length} total
                        </span>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className={`flex items-center justify-between gap-1.5 pt-1.5 border-t ${isLightMode ? 'border-zinc-200' : 'border-zinc-800'}`}>
                      {isStaffActive && (onAssignTask || onQuickAssignTaskToStaff) ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onAssignTask) onAssignTask(staff);
                            else if (onQuickAssignTaskToStaff) {
                              onQuickAssignTaskToStaff(staff);
                              onClose();
                            }
                          }}
                          className={`px-2 h-7 ${
                            isLightMode
                              ? 'bg-zinc-900 hover:bg-zinc-800 text-white'
                              : 'bg-white hover:bg-zinc-200 text-black'
                          } text-[9px] sm:text-[10px] font-black uppercase tracking-tight flex items-center gap-1 transition cursor-pointer rounded-xs`}
                        >
                          <Plus className="w-2.5 h-2.5 stroke-[3]" />
                          <span>Assign Task</span>
                        </button>
                      ) : (
                        <div className="text-[9px] font-bold uppercase text-zinc-500 italic">
                          {!isStaffActive ? 'Roster Locked' : ''}
                        </div>
                      )}

                      <div className="flex items-center gap-1 ml-auto">
                        {/* Quick Reset Password Button */}
                        <button
                          type="button"
                          id={`btn-reset-pw-${staff.id}`}
                          onClick={() => handleOpenResetModal(staff)}
                          className={`h-7 w-7 flex items-center justify-center rounded-xs ${
                            isLightMode
                              ? 'bg-zinc-100 hover:bg-amber-400 hover:text-black text-amber-600 border border-zinc-200'
                              : 'bg-zinc-800 hover:bg-amber-500 hover:text-black text-amber-400'
                          } transition cursor-pointer`}
                          title="Reset Password"
                          aria-label={`Reset password for ${staff.name}`}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>

                        {/* Edit Staff Details */}
                        <button
                          type="button"
                          id={`btn-edit-staff-${staff.id}`}
                          onClick={() => handleStartEdit(staff)}
                          className={`h-7 w-7 flex items-center justify-center rounded-xs ${
                            isLightMode
                              ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
                          } transition cursor-pointer`}
                          title="Edit staff details and access"
                          aria-label={`Edit ${staff.name}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>

                        {/* Delete Staff */}
                        <button
                          type="button"
                          id={`btn-delete-staff-${staff.id}`}
                          onClick={async () => {
                            if (confirmDeleteId === staff.id) {
                              try {
                                await deleteStaffFromFirebase(staff.id);
                                await onDeleteStaff(staff.id);
                              } catch (err) {
                                console.error('Delete staff error:', err);
                              }
                              setConfirmDeleteId(null);
                            } else {
                              setConfirmDeleteId(staff.id);
                              setTimeout(() => setConfirmDeleteId(null), 3000);
                            }
                          }}
                          className={`h-7 px-1.5 transition cursor-pointer flex items-center justify-center rounded-xs ${
                            confirmDeleteId === staff.id
                              ? 'bg-red-600 text-white'
                              : isLightMode
                              ? 'bg-zinc-100 hover:bg-red-600 text-zinc-500 hover:text-white border border-zinc-200'
                              : 'bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white'
                          }`}
                          title={confirmDeleteId === staff.id ? "Click again to confirm" : "Delete staff member"}
                          aria-label={`Delete ${staff.name}`}
                        >
                          {confirmDeleteId === staff.id ? (
                            <span className="text-[9px] font-black uppercase whitespace-nowrap px-1">Confirm?</span>
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
            </>
          ) : (
            <div className="space-y-6">
              {/* Performance Summary KPI Row */}
              {(() => {
                const staffWithStats = safeStaffList.map((staff) => {
                  const staffTasks = safeTasks.filter(
                    (t) =>
                      t.assigneeId === staff.id ||
                      (t.assignee && t.assignee.toLowerCase() === staff.name.toLowerCase())
                  );
                  const completed = staffTasks.filter((t) => t.completed).length;
                  const pending = staffTasks.filter((t) => !t.completed).length;
                  const total = staffTasks.length;
                  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return { staff, staffTasks, completed, pending, total, percent };
                });

                const totalAssignedTasks = staffWithStats.reduce((sum, s) => sum + s.total, 0);
                const totalCompletedTasks = staffWithStats.reduce((sum, s) => sum + s.completed, 0);
                const overallRate =
                  totalAssignedTasks > 0
                    ? Math.round((totalCompletedTasks / totalAssignedTasks) * 100)
                    : 0;
                const topPerformersCount = staffWithStats.filter(
                  (s) => s.total > 0 && s.percent >= 80
                ).length;
                const needsTrainingCount = staffWithStats.filter(
                  (s) => s.total > 0 && s.percent < 50
                ).length;

                // Apply Department and Search Filters
                const filteredStats = staffWithStats.filter(({ staff }) => {
                  const matchesDept =
                    performanceDeptFilter === 'all' || staff.department === performanceDeptFilter;
                  const matchesSearch =
                    !searchQuery ||
                    staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    staff.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    staff.designation.toLowerCase().includes(searchQuery.toLowerCase());
                  return matchesDept && matchesSearch;
                });

                // Apply Sorting
                const sortedStats = [...filteredStats].sort((a, b) => {
                  if (performanceSort === 'completion') {
                    if (b.percent !== a.percent) return b.percent - a.percent;
                    return b.total - a.total;
                  }
                  if (performanceSort === 'needs-training') {
                    if (a.percent !== b.percent) return a.percent - b.percent;
                    return b.pending - a.pending;
                  }
                  if (performanceSort === 'assigned') {
                    return b.total - a.total;
                  }
                  return a.staff.name.localeCompare(b.staff.name);
                });

                return (
                  <>
                    {/* Top KPI Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          Total Tasks Assigned
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-black text-white">{totalAssignedTasks}</span>
                          <span className="text-xs font-mono text-zinc-500">across staff</span>
                        </div>
                      </div>

                      <div className="p-3 bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          Completion Rate
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-black text-emerald-400">{overallRate}%</span>
                          <span className="text-xs font-mono text-zinc-500">
                            {totalCompletedTasks}/{totalAssignedTasks}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" />
                          Top Performers
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-black text-emerald-400">
                            {topPerformersCount}
                          </span>
                          <span className="text-xs font-mono text-zinc-500">(&ge;80% done)</span>
                        </div>
                      </div>

                      <div className="p-3 bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Training Needs
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-black text-amber-400">
                            {needsTrainingCount}
                          </span>
                          <span className="text-xs font-mono text-zinc-500">(&lt;50% done)</span>
                        </div>
                      </div>
                    </div>

                    {/* Toolbar: Department Filter & Sorting */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-zinc-900/60 border border-zinc-800">
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          Department:
                        </span>
                        <select
                          value={performanceDeptFilter}
                          onChange={(e) => setPerformanceDeptFilter(e.target.value)}
                          className="bg-black text-white text-xs font-bold border border-zinc-700 px-2.5 py-1 outline-none"
                        >
                          <option value="all">All Departments</option>
                          {DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          Sort By:
                        </span>
                        <select
                          value={performanceSort}
                          onChange={(e) =>
                            setPerformanceSort(e.target.value as typeof performanceSort)
                          }
                          className="bg-black text-white text-xs font-bold border border-zinc-700 px-2.5 py-1 outline-none"
                        >
                          <option value="completion">Top Performers First (&darr; %)</option>
                          <option value="needs-training">Training Needs First (&uarr; %)</option>
                          <option value="assigned">Most Tasks Assigned</option>
                          <option value="name">Staff Name (A-Z)</option>
                        </select>
                      </div>
                    </div>

                    {/* Staff Performance Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sortedStats.map(
                        ({ staff, staffTasks, completed, pending, total, percent }) => {
                          const isTopPerformer = total > 0 && percent >= 80;
                          const isNeedsTraining = total > 0 && percent < 50;
                          const isNoTasks = total === 0;

                          return (
                            <div
                              key={staff.id}
                              className={`p-4 bg-zinc-900 border-2 transition-all flex flex-col justify-between ${
                                isTopPerformer
                                  ? 'border-emerald-500/60 bg-emerald-950/10 shadow-lg shadow-emerald-950/20'
                                  : isNeedsTraining
                                  ? 'border-amber-500/60 bg-amber-950/10'
                                  : 'border-zinc-800'
                              }`}
                            >
                              <div>
                                {/* Card Header */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h4 className="text-sm font-black uppercase text-white truncate">
                                        {staff.name}
                                      </h4>
                                      {isTopPerformer && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                          <Award className="w-2.5 h-2.5" />
                                          Top Performer
                                        </span>
                                      )}
                                      {isNeedsTraining && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                          <AlertTriangle className="w-2.5 h-2.5" />
                                          Training Need
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] font-bold text-zinc-400 uppercase mt-0.5 truncate">
                                      {staff.designation || 'Staff Member'} &bull; {staff.department}
                                    </p>
                                  </div>

                                  <div className="text-right flex-shrink-0">
                                    <span
                                      className={`text-2xl font-black font-mono ${
                                        isNoTasks
                                          ? 'text-zinc-600'
                                          : percent >= 80
                                          ? 'text-emerald-400'
                                          : percent >= 50
                                          ? 'text-amber-400'
                                          : 'text-red-400'
                                      }`}
                                    >
                                      {isNoTasks ? '0%' : `${percent}%`}
                                    </span>
                                  </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-zinc-950 h-2.5 my-2.5 overflow-hidden border border-zinc-800">
                                  <div
                                    className={`h-full transition-all duration-500 ${
                                      isNoTasks
                                        ? 'bg-zinc-800'
                                        : percent >= 80
                                        ? 'bg-emerald-500'
                                        : percent >= 50
                                        ? 'bg-amber-500'
                                        : 'bg-red-500'
                                    }`}
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>

                                {/* Metrics Breakdown */}
                                <div className="grid grid-cols-3 gap-1.5 p-2 bg-black/40 border border-zinc-800 text-center my-3">
                                  <div>
                                    <span className="block text-[9px] font-bold text-zinc-500 uppercase">
                                      Completed
                                    </span>
                                    <span className="text-xs font-black text-emerald-400">
                                      {completed}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="block text-[9px] font-bold text-zinc-500 uppercase">
                                      Pending
                                    </span>
                                    <span
                                      className={`text-xs font-black ${
                                        pending > 0 ? 'text-amber-400' : 'text-zinc-400'
                                      }`}
                                    >
                                      {pending}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="block text-[9px] font-bold text-zinc-500 uppercase">
                                      Total
                                    </span>
                                    <span className="text-xs font-black text-white">{total}</span>
                                  </div>
                                </div>

                                {/* Performance Insight Note */}
                                <div className="text-[11px] font-semibold text-zinc-400 mb-3">
                                  {isNoTasks ? (
                                    <span className="text-zinc-500 italic">
                                      No tasks assigned for this shift yet.
                                    </span>
                                  ) : isTopPerformer ? (
                                    <span className="text-emerald-400 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                      Excellent execution &mdash; completed {completed} of {total}{' '}
                                      assignments.
                                    </span>
                                  ) : isNeedsTraining ? (
                                    <span className="text-amber-400 flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                      {pending} task{pending > 1 ? 's' : ''} remaining &mdash; review
                                      process or assign mentor.
                                    </span>
                                  ) : (
                                    <span className="text-zinc-300 flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                                      Steady progress &mdash; {completed} of {total} completed.
                                    </span>
                                  )}
                                </div>

                                {/* Pending Tasks List (If any) */}
                                {pending > 0 && (
                                  <div className="space-y-1 mb-3 max-h-24 overflow-y-auto pr-1">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">
                                      Incomplete Assignments ({pending}):
                                    </span>
                                    {staffTasks
                                      .filter((t) => !t.completed)
                                      .slice(0, 3)
                                      .map((t) => (
                                        <div
                                          key={t.id}
                                          className="text-[11px] p-1 bg-zinc-950 border border-zinc-800 text-zinc-300 truncate"
                                          title={t.title}
                                        >
                                          &bull; {t.title}
                                        </div>
                                      ))}
                                    {pending > 3 && (
                                      <span className="text-[10px] text-zinc-500 font-bold block">
                                        + {pending - 3} more pending
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Action: Quick Assign Task */}
                              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                                <span className="text-[10px] font-mono text-zinc-500">
                                  ID: {staff.id.slice(0, 6)}
                                </span>

                                {(onAssignTask || onQuickAssignTaskToStaff) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      if (onAssignTask) onAssignTask(staff);
                                      else if (onQuickAssignTaskToStaff)
                                        onQuickAssignTaskToStaff(staff);
                                    }}
                                    className="px-2.5 py-1 bg-white hover:bg-zinc-200 text-black text-[11px] font-black uppercase tracking-tight flex items-center gap-1 cursor-pointer transition"
                                  >
                                    <Plus className="w-3 h-3 stroke-[3]" />
                                    <span>Assign Task</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}

                      {sortedStats.length === 0 && (
                        <div className="col-span-full p-8 text-center text-zinc-500 text-sm font-bold uppercase border-2 border-dashed border-zinc-800">
                          No staff members found matching the selected criteria.
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`px-3 sm:px-4 py-2 sm:py-2.5 ${
          isLightMode ? 'bg-white border-t border-zinc-200 text-zinc-900' : 'bg-zinc-900 border-t border-zinc-800 text-white'
        } flex items-center justify-between safe-bottom gap-2`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] sm:text-[11px] font-bold ${isLightMode ? 'text-zinc-600' : 'text-zinc-300'} uppercase`}>
              {filteredStaff.length} of {safeStaffList.length} Staff
            </span>
            <span className="text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 bg-emerald-950 border border-emerald-500 text-emerald-400 rounded-xs">
              {safeStaffList.filter((s) => s.isActive !== false && s.active !== false).length} Active
            </span>
          </div>
          <button
            type="button"
            id="btn-staff-modal-done"
            onClick={onClose}
            className={`px-4 py-1.5 ${
              isLightMode ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'
            } text-xs font-black uppercase tracking-wider transition rounded-xs cursor-pointer`}
          >
            Done
          </button>
        </div>
      </div>

      {/* Dedicated Set / Change 4-Digit Passcode (PIN) Modal */}
      {pinModalStaff && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Set 4-Digit Passcode"
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150 backdrop-blur-sm"
        >
          <div className={`max-w-md w-full ${isLightMode ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white'} border-4 border-amber-500 shadow-2xl p-5 space-y-4`}>
            <div className={`flex items-center justify-between border-b ${isLightMode ? 'border-zinc-200' : 'border-zinc-800'} pb-2.5`}>
              <div className="flex items-center gap-2 text-amber-500">
                <KeyRound className="w-5 h-5 stroke-[2.5]" />
                <h3 className={`text-sm font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>
                  Set 4-Digit Passcode (PIN)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPinModalStaff(null)}
                className={`p-1 ${isLightMode ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'} cursor-pointer`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className={`text-xs ${isLightMode ? 'text-zinc-600' : 'text-zinc-300'}`}>
                Set a 4-digit punch-in passcode for <strong className={`${isLightMode ? 'text-zinc-900' : 'text-white'} uppercase`}>{pinModalStaff.name}</strong> ({pinModalStaff.designation} • {pinModalStaff.department}).
              </p>
            </div>

            {pinSuccessMessage && (
              <div className="p-3 bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{pinSuccessMessage}</span>
              </div>
            )}

            {pinModalError && (
              <div className="p-3 bg-red-950 border border-red-500 text-red-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>{pinModalError}</span>
              </div>
            )}

            <form onSubmit={handleSavePinModal} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`block text-[10px] font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    New 4-Digit Passcode (PIN) *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateModalPin}
                    className="text-[9px] text-amber-500 font-bold uppercase hover:underline flex items-center gap-0.5"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Auto-Generate</span>
                  </button>
                </div>
                <input
                  type="text"
                  id="input-pin-modal-code"
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={modalPinInput}
                  onChange={(e) => setModalPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 5678"
                  className={`w-full px-2.5 py-1.5 ${
                    isLightMode ? 'bg-zinc-50 text-amber-700 border-zinc-300 focus:border-amber-500' : 'bg-black text-amber-400 border-zinc-700 focus:border-amber-400'
                  } text-center font-mono text-base font-black tracking-widest border outline-none rounded-xs`}
                />
              </div>

              <div>
                <label className={`block text-[9px] font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'} mb-1`}>
                  Confirm 4-Digit Passcode *
                </label>
                <input
                  type="text"
                  id="input-pin-modal-confirm"
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={modalPinConfirm}
                  onChange={(e) => setModalPinConfirm(e.target.value.replace(/\D/g, ''))}
                  placeholder="Retype 4-digit PIN"
                  className={`w-full px-2.5 py-1.5 ${
                    isLightMode ? 'bg-zinc-50 text-amber-700 border-zinc-300 focus:border-amber-500' : 'bg-black text-amber-400 border-zinc-700 focus:border-amber-400'
                  } text-center font-mono text-base font-black tracking-widest border outline-none rounded-xs`}
                />
              </div>

              <div className={`flex items-center justify-end gap-1.5 pt-2 border-t ${isLightMode ? 'border-zinc-200' : 'border-zinc-800'}`}>
                <button
                  type="button"
                  onClick={() => setPinModalStaff(null)}
                  className={`px-3 py-1.5 ${isLightMode ? 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300' : 'bg-zinc-800 text-zinc-300 hover:text-white'} text-[11px] font-bold uppercase transition rounded-xs cursor-pointer`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-black uppercase tracking-tight transition cursor-pointer rounded-xs"
                >
                  Save Passcode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Reset Password Modal for Admin */}
      {resetModalStaff && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Reset Password"
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150 backdrop-blur-sm"
        >
          <div className={`max-w-md w-full ${isLightMode ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white'} border-4 border-amber-500 shadow-2xl p-5 space-y-4 rounded-xs`}>
            <div className={`flex items-center justify-between border-b ${isLightMode ? 'border-zinc-200' : 'border-zinc-800'} pb-2`}>
              <div className="flex items-center gap-1.5 text-amber-500">
                <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>
                  Reset Password for Staff
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResetModalStaff(null)}
                className={`p-1 ${isLightMode ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'} cursor-pointer`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <p className={`text-xs ${isLightMode ? 'text-zinc-600' : 'text-zinc-300'}`}>
                Set a new password for <strong className={`${isLightMode ? 'text-zinc-900' : 'text-white'} uppercase`}>{resetModalStaff.name}</strong> ({resetModalStaff.email}).
              </p>
            </div>

            {resetSuccessMessage && (
              <div className="p-2.5 bg-emerald-950 border border-emerald-500 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 rounded-xs">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{resetSuccessMessage}</span>
              </div>
            )}

            {resetModalError && (
              <div className="p-2.5 bg-red-950 border border-red-500 text-red-300 text-[11px] font-bold flex items-center gap-1.5 rounded-xs">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span>{resetModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveResetPassword} className="space-y-2.5">
              <div>
                <label className={`block text-[9px] font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'} mb-1`}>
                  New Password *
                </label>
                <input
                  type="text"
                  id="input-reset-modal-password"
                  required
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="Enter new password"
                  className={`w-full px-2.5 py-1.5 h-8 ${
                    isLightMode ? 'bg-zinc-50 text-zinc-900 border-zinc-300 focus:border-amber-500' : 'bg-black text-white border-zinc-700 focus:border-amber-400'
                  } text-[11px] font-mono border outline-none rounded-xs`}
                />
              </div>

              <div>
                <label className={`block text-[9px] font-black uppercase tracking-wider ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'} mb-1`}>
                  Confirm New Password *
                </label>
                <input
                  type="text"
                  id="input-reset-modal-confirm-password"
                  required
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={`w-full px-2.5 py-1.5 h-8 ${
                    isLightMode ? 'bg-zinc-50 text-zinc-900 border-zinc-300 focus:border-amber-500' : 'bg-black text-white border-zinc-700 focus:border-amber-400'
                  } text-[11px] font-mono border outline-none rounded-xs`}
                />
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <button
                  type="button"
                  onClick={handleGenerateRandomPassword}
                  className="text-[9px] font-black uppercase text-amber-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Generate Temp Password</span>
                </button>
              </div>

              <div className={`flex items-center justify-end gap-1.5 pt-2 border-t ${isLightMode ? 'border-zinc-200' : 'border-zinc-800'}`}>
                <button
                  type="button"
                  onClick={() => setResetModalStaff(null)}
                  className={`px-3 py-1.5 h-7.5 ${isLightMode ? 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300' : 'bg-zinc-800 text-zinc-300 hover:text-white'} text-[11px] font-bold uppercase rounded-xs cursor-pointer`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-save-reset-password"
                  className="px-3.5 py-1.5 h-7.5 bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-black uppercase flex items-center gap-1 cursor-pointer rounded-xs"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Save New Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
