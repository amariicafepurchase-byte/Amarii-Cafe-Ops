import React, { useState, useEffect } from 'react';
import {
  Coffee,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Fingerprint,
  ShieldAlert,
  ArrowRight,
  Delete,
  CheckCircle2,
  Building2,
  X,
  Sparkles,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useAuth, isHemenDas } from '../context/AuthContext';
import { AuthUser, StaffMember, DEFAULT_OUTLET, TaskDepartment } from '../types';
import { INITIAL_STAFF } from '../data/staffData';
import { triggerHaptic } from '../utils/haptics';
import { saveStaffToFirebase, subscribeToStaff, fetchStaffOnce, LEGACY_DEMO_STAFF_IDS } from '../lib/firebase';

// WebAuthn Binary / Base64 Helpers
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

interface LoginScreenProps {
  isLightMode: boolean;
  staffList?: StaffMember[];
  onUpdateStaff?: (staff: StaffMember) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  isLightMode,
  staffList = [],
  onUpdateStaff,
}) => {
  const { login } = useAuth();

  // Live Staff state actively synchronized with Firestore in real-time
  const [liveStaff, setLiveStaff] = useState<StaffMember[]>(() => {
    try {
      const cached = localStorage.getItem('amarii_staff_list_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed.filter(
            (s: any) => s && s.id && !LEGACY_DEMO_STAFF_IDS.includes(s.id) && !s.name?.toLowerCase().includes('arjun')
          );
          if (clean.length > 0) return clean;
        }
      }
    } catch {}
    return staffList.length > 0 ? staffList : INITIAL_STAFF;
  });
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  // Real-time Firestore subscription on LoginScreen
  useEffect(() => {
    // 1. Initial direct fetch from Firestore immediately on mount
    setIsCloudSyncing(true);
    fetchStaffOnce()
      .then((items) => {
        if (items && items.length > 0) {
          const clean = items.filter((s) => !LEGACY_DEMO_STAFF_IDS.includes(s.id));
          setLiveStaff(clean);
          try {
            localStorage.setItem('amarii_staff_list_cache', JSON.stringify(clean));
          } catch {}
        }
      })
      .catch((err) => console.warn('LoginScreen initial staff fetch note:', err))
      .finally(() => setIsCloudSyncing(false));

    // 2. Real-time Firestore listener for any newly added staff or updated PINs
    const unsubscribe = subscribeToStaff((updatedStaff) => {
      if (updatedStaff && updatedStaff.length > 0) {
        const clean = updatedStaff.filter((s) => !LEGACY_DEMO_STAFF_IDS.includes(s.id));
        setLiveStaff(clean);
        try {
          localStorage.setItem('amarii_staff_list_cache', JSON.stringify(clean));
        } catch {}
      }
    });

    return () => unsubscribe();
  }, []);

  // Update liveStaff when staffList prop changes
  useEffect(() => {
    if (staffList && staffList.length > 0) {
      const clean = staffList.filter((s) => !LEGACY_DEMO_STAFF_IDS.includes(s.id));
      setLiveStaff(clean);
    }
  }, [staffList]);

  // Combined staff: always use newest liveStaff from Firestore, excluding demo Arjun & legacy dummy staff
  const currentStaffPool = liveStaff.length > 0 ? liveStaff : staffList.length > 0 ? staffList : INITIAL_STAFF;
  const combinedStaff = currentStaffPool.filter(
    (s) => !s.name.toLowerCase().includes('arjun') && s.id !== 'staff-admin-arjun' && !LEGACY_DEMO_STAFF_IDS.includes(s.id)
  );

  // Manual refresh helper
  const handleManualStaffSync = async () => {
    triggerHaptic('light');
    setIsCloudSyncing(true);
    try {
      const items = await fetchStaffOnce();
      if (items && items.length > 0) {
        setLiveStaff(items);
        try {
          localStorage.setItem('amarii_staff_list_cache', JSON.stringify(items));
        } catch {}
        triggerHaptic('success');
      }
    } catch (err) {
      console.warn('Manual sync note:', err);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Active Login Mode: 'pin' (Default fast access) | 'biometric' | 'email'
  const [loginMode, setLoginMode] = useState<'pin' | 'email' | 'biometric'>('pin');

  // PIN State (4 digits)
  const [pinDigits, setPinDigits] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isPinVerifying, setIsPinVerifying] = useState<boolean>(false);
  const [successStaff, setSuccessStaff] = useState<StaffMember | null>(null);
  const [selectedStaffForPin, setSelectedStaffForPin] = useState<StaffMember | null>(null);
  const [collisionStaffList, setCollisionStaffList] = useState<StaffMember[] | null>(null);
  const [collisionPin, setCollisionPin] = useState<string>('');

  // Email & Password State
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ================= BIOMETRIC ENROLLMENT & AUTH STATE =================
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'unsupported'>('idle');
  const [biometricMsg, setBiometricMsg] = useState<string>('');
  const [isBiometricAvailable, setIsBiometricAvailable] = useState<boolean>(false);
  const [enrolledBiometricUser, setEnrolledBiometricUser] = useState<{ id: string; name: string; email: string; rawId?: string; credentialId?: string; domain?: string } | null>(null);
  const [isEnrollingBiometric, setIsEnrollingBiometric] = useState<boolean>(false);
  const [enrollPin, setEnrollPin] = useState<string>('');
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);

  // Check enrollment from local storage on load - sanitize domain mismatches
  useEffect(() => {
    try {
      const saved = localStorage.getItem('amarii_biometric_device_enrollment');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof window !== 'undefined') {
          // If previous fake pairing without credentialId, or if domain changed, clear it
          if (parsed.domain && parsed.domain !== window.location.hostname) {
            localStorage.removeItem('amarii_biometric_device_enrollment');
            setEnrolledBiometricUser(null);
          } else if (!parsed.rawId && !parsed.credentialId) {
            // Clear legacy fake enrollment to avoid "No passkeys available" Android trap
            localStorage.removeItem('amarii_biometric_device_enrollment');
            setEnrolledBiometricUser(null);
          } else {
            setEnrolledBiometricUser(parsed);
          }
        }
      }
    } catch {
      // ignore
    }

    if (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => setIsBiometricAvailable(available))
        .catch(() => setIsBiometricAvailable(false));
    }
  }, []);

  // ================= SET / CHANGE PASSCODE MODAL STATE =================
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState<boolean>(false);
  const [passcodeStaffId, setPasscodeStaffId] = useState<string>(() => combinedStaff[0]?.id || 'staff-admin-hemen');
  const [currentOrAdminPin, setCurrentOrAdminPin] = useState<string>('');
  const [newPasscodePin, setNewPasscodePin] = useState<string>('');
  const [confirmPasscodePin, setConfirmPasscodePin] = useState<string>('');
  const [newStaffPassword, setNewStaffPassword] = useState<string>('');
  const [confirmStaffPassword, setConfirmStaffPassword] = useState<string>('');
  const [showPasscodePins, setShowPasscodePins] = useState<boolean>(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [passcodeSuccess, setPasscodeSuccess] = useState<string | null>(null);

  // Helper to complete login for a staff member - Hemen Das is admin, managers get manager role
  const executeLoginForStaff = (staff: StaffMember) => {
    const isSoleAdmin = isHemenDas(staff);
    const isManagerRole =
      !isSoleAdmin &&
      (staff.roleType === 'manager' ||
        (staff.designation || '').toLowerCase().includes('manager') ||
        (staff.department || '').toLowerCase() === 'management');
    const role: 'admin' | 'manager' | 'staff' = isSoleAdmin ? 'admin' : isManagerRole ? 'manager' : 'staff';

    const authUser: AuthUser = {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role,
      department: staff.department,
      designation: staff.designation,
      avatarColor: staff.avatarColor || (isSoleAdmin ? 'bg-zinc-900 text-white' : 'bg-red-500 text-white'),
      stationLocked: !isSoleAdmin && !isManagerRole,
      outlet: staff.outlet || DEFAULT_OUTLET,
      isActive: true,
    };

    triggerHaptic('success');
    login(authUser);
  };

  // Verify 4-Digit PIN or Password
  const verifyPin = async (enteredPin: string) => {
    setIsPinVerifying(true);
    setPinError(null);

    // If a staff profile is explicitly selected from the profile cards
    if (selectedStaffForPin) {
      const targetPin = selectedStaffForPin.pin || selectedStaffForPin.password || '';
      if (targetPin === enteredPin) {
        setSuccessStaff(selectedStaffForPin);
        triggerHaptic('success');
        setTimeout(() => {
          executeLoginForStaff(selectedStaffForPin);
        }, 350);
        return;
      } else {
        triggerHaptic('error');
        setPinError(`Incorrect 4-digit PIN for ${selectedStaffForPin.name}. Please enter correct PIN or tap "Change".`);
        setIsPinVerifying(false);
        setPinDigits('');
        return;
      }
    }

    // Direct punch-in without profile pre-selected:
    // 1. Look for matching staff member(s) with this PIN or 4-digit password in current pool
    let matchingStaff = combinedStaff.filter((s) => {
      const staffPin = s.pin || s.password || '';
      return staffPin === enteredPin && (s.isActive !== false && s.active !== false);
    });

    // 2. Direct Firestore fallback: if not found, query Firestore immediately for newly added staff!
    if (matchingStaff.length === 0) {
      try {
        const freshStaff = await fetchStaffOnce();
        if (freshStaff && freshStaff.length > 0) {
          const clean = freshStaff.filter((s) => !LEGACY_DEMO_STAFF_IDS.includes(s.id));
          setLiveStaff(clean);
          try {
            localStorage.setItem('amarii_staff_list_cache', JSON.stringify(clean));
          } catch {}
          matchingStaff = clean.filter((s) => {
            const staffPin = s.pin || s.password || '';
            return staffPin === enteredPin && (s.isActive !== false && s.active !== false);
          });
        }
      } catch (err) {
        console.warn('Direct Firestore staff check failed:', err);
      }
    }

    if (matchingStaff.length === 1) {
      const staff = matchingStaff[0];
      setSuccessStaff(staff);
      triggerHaptic('success');
      setTimeout(() => {
        executeLoginForStaff(staff);
      }, 350);
    } else if (matchingStaff.length > 1) {
      // Multiple staff share this PIN: open collision selector dialog
      setIsPinVerifying(false);
      setCollisionPin(enteredPin);
      setCollisionStaffList(matchingStaff);
    } else {
      triggerHaptic('error');
      setPinError('Invalid 4-Digit PIN. Please re-enter or select your profile above.');
      setIsPinVerifying(false);
      setPinDigits('');
    }
  };

  // Handle PIN Keypad Press
  const handleKeypadPress = (digit: string) => {
    triggerHaptic('light');
    setPinError(null);

    if (pinDigits.length < 4) {
      const next = pinDigits + digit;
      setPinDigits(next);
      if (next.length === 4) {
        verifyPin(next);
      }
    }
  };

  // Handle Backspace
  const handleBackspace = () => {
    triggerHaptic('light');
    setPinError(null);
    setPinDigits((prev) => prev.slice(0, -1));
  };

  // Handle Clear
  const handleClearPin = () => {
    triggerHaptic('medium');
    setPinError(null);
    setPinDigits('');
  };

  // ================= SECURE BIOMETRIC AUTH =================
  const handleBiometricAuth = async () => {
    triggerHaptic('medium');
    setBiometricStatus('scanning');
    setBiometricMsg('Prompting Fingerprint / Face ID scanner...');

    // If device is not enrolled yet, prompt enrollment.
    if (!enrolledBiometricUser) {
      triggerHaptic('warning');
      setBiometricStatus('idle');
      setBiometricMsg('Fingerprint not yet set up on this phone. Tap "Register Phone Fingerprint" below.');
      setIsEnrollingBiometric(true);
      return;
    }

    const targetUser = combinedStaff.find((s) => s.id === enrolledBiometricUser.id) || combinedStaff[0];

    // Real WebAuthn Hardware Authentication Check
    try {
      if (typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const allowCredentials = enrolledBiometricUser.rawId
          ? [
              {
                id: base64ToUint8Array(enrolledBiometricUser.rawId),
                type: 'public-key' as const,
                transports: ['internal'] as AuthenticatorTransport[],
              },
            ]
          : undefined;

        // Native platform credential assertion - Pops up Android Fingerprint prompt
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: 'preferred',
            rpId: window.location.hostname || undefined,
            allowCredentials,
          },
        });

        if (assertion) {
          setBiometricStatus('success');
          setBiometricMsg(`Biometric Verified! Welcome ${targetUser.name}`);
          triggerHaptic('success');
          setTimeout(() => {
            executeLoginForStaff(targetUser);
          }, 350);
          return;
        }
      } else {
        throw new Error('WebAuthn platform authenticator not available in this browser');
      }
    } catch (err: any) {
      console.warn('Biometric challenge rejected or unavailable:', err);
      triggerHaptic('error');
      setBiometricStatus('idle');

      const isNotFound =
        err?.name === 'NotFoundError' ||
        err?.message?.toLowerCase().includes('not found') ||
        err?.message?.toLowerCase().includes('no credentials') ||
        err?.message?.toLowerCase().includes('passkey');

      if (isNotFound) {
        // Clear broken or foreign domain pairing
        setEnrolledBiometricUser(null);
        localStorage.removeItem('amarii_biometric_device_enrollment');
        setBiometricMsg('No passkey found on this device. Please tap "Register Phone Fingerprint" below.');
      } else {
        setBiometricMsg('Fingerprint scan cancelled or not recognized. Try again or enter your 4-digit PIN.');
      }
    }
  };

  // Enroll Device Biometric with PIN verification & genuine hardware registration
  const handleEnrollDeviceBiometric = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollError(null);
    setEnrollSuccess(null);

    if (!enrollPin || enrollPin.length !== 4) {
      setEnrollError('Please enter your valid 4-digit PIN.');
      triggerHaptic('warning');
      return;
    }

    // Verify PIN matches staff
    const matchedStaff = combinedStaff.find((s) => {
      const staffPin = s.pin || '';
      return staffPin === enrollPin && (s.isActive !== false && s.active !== false);
    });

    if (!matchedStaff) {
      setEnrollError('Incorrect 4-digit PIN. Only authorized staff can enroll biometrics.');
      triggerHaptic('error');
      return;
    }

    try {
      if (typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const userId = new TextEncoder().encode(matchedStaff.id);

        const credential = (await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: {
              name: 'Amarii Café Operations',
              id: window.location.hostname || undefined,
            },
            user: {
              id: userId,
              name: matchedStaff.email || `${matchedStaff.id}@amarii.cafe`,
              displayName: matchedStaff.name,
            },
            pubKeyCredParams: [
              { type: 'public-key', alg: -7 },   // ES256
              { type: 'public-key', alg: -257 }, // RS256
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'preferred',
              residentKey: 'preferred',
            },
            timeout: 60000,
            attestation: 'none',
          },
        })) as PublicKeyCredential;

        if (!credential) {
          throw new Error('Device credential creation was not completed.');
        }

        const rawIdBase64 = bufferToBase64(credential.rawId);
        const enrolled = {
          id: matchedStaff.id,
          name: matchedStaff.name,
          email: matchedStaff.email,
          credentialId: credential.id,
          rawId: rawIdBase64,
          domain: window.location.hostname,
        };

        setEnrolledBiometricUser(enrolled);
        localStorage.setItem('amarii_biometric_device_enrollment', JSON.stringify(enrolled));
        setEnrollSuccess(`Fingerprint registered for ${matchedStaff.name}! Hardware unlock active.`);
        setBiometricMsg('');
        triggerHaptic('success');
        setEnrollPin('');
        setTimeout(() => {
          setIsEnrollingBiometric(false);
          setEnrollSuccess(null);
        }, 1500);
      } else {
        throw new Error('Hardware biometric not supported on this browser.');
      }
    } catch (err: any) {
      console.warn('Biometric registration error:', err);
      // Clean up failed pairing
      localStorage.removeItem('amarii_biometric_device_enrollment');
      setEnrolledBiometricUser(null);
      const isNotAllowed = err?.name === 'NotAllowedError' || err?.message?.toLowerCase().includes('cancel');
      setEnrollError(
        isNotAllowed
          ? 'Device fingerprint registration was cancelled or timed out. Please tap "Verify PIN & Register" again to set up.'
          : (err?.message || 'Device biometric registration failed. You can always punch in with your 4-digit PIN.')
      );
      triggerHaptic('error');
    }
  };

  // ================= SAVE PASSCODE (SET / CHANGE PIN & PASSWORD) =================
  const handleSavePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);
    setPasscodeSuccess(null);

    const targetStaff = combinedStaff.find((s) => s.id === passcodeStaffId);
    if (!targetStaff) {
      setPasscodeError('Please select a staff member.');
      return;
    }

    // Authorizing check: matches staff PIN, staff password, or any manager/admin PIN or password
    const staffPin = targetStaff.pin || '';
    const staffPassword = targetStaff.password || '';
    const isManagerAuthorized = combinedStaff.some(
      (s) =>
        (s.roleType === 'manager' || s.roleType === 'admin') &&
        ((s.pin && s.pin === currentOrAdminPin) || (s.password && s.password === currentOrAdminPin))
    );

    if (
      currentOrAdminPin !== staffPin &&
      currentOrAdminPin !== staffPassword &&
      !isManagerAuthorized
    ) {
      setPasscodeError('Incorrect authorization. Enter the staff member current PIN/password or Manager PIN.');
      triggerHaptic('error');
      return;
    }

    if (!newPasscodePin || !/^\d{4}$/.test(newPasscodePin)) {
      setPasscodeError('New passcode must contain exactly 4 numeric digits (e.g. 1234).');
      triggerHaptic('warning');
      return;
    }

    if (newPasscodePin !== confirmPasscodePin) {
      setPasscodeError('New passcodes do not match. Please retype to confirm.');
      triggerHaptic('warning');
      return;
    }

    // Optional password validation
    if (newStaffPassword.trim()) {
      if (newStaffPassword.trim().length < 4) {
        setPasscodeError('New password must be at least 4 characters long.');
        triggerHaptic('warning');
        return;
      }
      if (newStaffPassword !== confirmStaffPassword) {
        setPasscodeError('New passwords do not match. Please retype to confirm.');
        triggerHaptic('warning');
        return;
      }
    }

    const updatedStaff: StaffMember = {
      ...targetStaff,
      pin: newPasscodePin.trim(),
      ...(newStaffPassword.trim() ? { password: newStaffPassword.trim() } : {}),
    };

    try {
      await saveStaffToFirebase(updatedStaff);
      if (onUpdateStaff) {
        onUpdateStaff(updatedStaff);
      }
      // Also update localStorage cache directly so pull-down or reload retains it instantly
      try {
        const stored = localStorage.getItem('amarii_staff_list_cache');
        const list: StaffMember[] = stored ? JSON.parse(stored) : combinedStaff;
        const updatedList = list.map((s) => (s.id === updatedStaff.id ? updatedStaff : s));
        localStorage.setItem('amarii_staff_list_cache', JSON.stringify(updatedList));
      } catch (cacheErr) {
        console.warn('Could not cache updated credentials:', cacheErr);
      }

      triggerHaptic('success');
      setPasscodeSuccess(`Credentials successfully saved for ${targetStaff.name}! PIN is now ${newPasscodePin}.`);
      setTimeout(() => {
        setIsPasscodeModalOpen(false);
        setPasscodeSuccess(null);
        setCurrentOrAdminPin('');
        setNewPasscodePin('');
        setConfirmPasscodePin('');
        setNewStaffPassword('');
        setConfirmStaffPassword('');
      }, 1500);
    } catch (err: any) {
      console.error('Failed to save updated PIN/password:', err);
      setPasscodeError('Failed to save passcode. Please try again.');
      triggerHaptic('error');
    }
  };

  const handleGenerateRandomPin = () => {
    const random = String(Math.floor(1000 + Math.random() * 9000));
    setNewPasscodePin(random);
    setConfirmPasscodePin(random);
    setPasscodeError(null);
  };

  // Email/Phone/Name & Password Submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');
    setEmailError(null);

    const inputVal = emailInput.trim();
    const searchIdentifier = inputVal.toLowerCase();
    const cleanPhone = inputVal.replace(/\D/g, '');
    const password = passwordInput.trim();

    if (!inputVal || !password) {
      setEmailError('Please enter your email, phone, or name, and your password or PIN.');
      triggerHaptic('warning');
      return;
    }

    setIsSubmitting(true);

    const matchesUser = (s: StaffMember) => {
      const sEmail = (s.email || '').toLowerCase().trim();
      const sName = (s.name || '').toLowerCase().trim();
      const sPhone = (s.phone || '').replace(/\D/g, '');
      return (
        sEmail === searchIdentifier ||
        sName === searchIdentifier ||
        (cleanPhone.length >= 7 && sPhone.includes(cleanPhone))
      );
    };

    let staff = combinedStaff.find(matchesUser);

    // Direct Firestore fallback: check live database in case new staff was recently added
    if (!staff) {
      try {
        const freshStaff = await fetchStaffOnce();
        if (freshStaff && freshStaff.length > 0) {
          setLiveStaff(freshStaff);
          try {
            localStorage.setItem('amarii_staff_list_cache', JSON.stringify(freshStaff));
          } catch {}
          staff = freshStaff.find(matchesUser);
        }
      } catch (err) {
        console.warn('Direct Firestore staff check error:', err);
      }
    }

    if (!staff) {
      if ((searchIdentifier === 'admin@amarii.cafe' || searchIdentifier === 'hemen das' || searchIdentifier === 'hemen') && (password === 'admin123' || password === '9987')) {
        const adminStaff = combinedStaff.find((s) => s.email === 'admin@amarii.cafe') || {
          id: 'staff-admin-hemen',
          name: 'Hemen Das',
          email: 'admin@amarii.cafe',
          roleType: 'manager' as const,
          designation: 'General Manager & Owner',
          department: 'Management' as TaskDepartment,
          avatarColor: 'bg-zinc-900 text-white',
          outlet: DEFAULT_OUTLET,
          isActive: true,
          phone: '+91 98765 43260',
          pin: '9987',
          password: 'admin123',
        };
        executeLoginForStaff(adminStaff as StaffMember);
        setIsSubmitting(false);
        return;
      }

      setEmailError('No account found with this email, phone number, or name. Please contact Admin.');
      triggerHaptic('error');
      setIsSubmitting(false);
      return;
    }

    const isAccountActive = staff.isActive !== false && staff.active !== false;
    if (!isAccountActive) {
      setEmailError('Account deactivated. Please contact Admin.');
      triggerHaptic('error');
      setIsSubmitting(false);
      return;
    }

    // Allow password OR 4-digit PIN in the password field for convenience
    const isPasswordMatch = staff.password && staff.password === password;
    const isPinMatch = staff.pin && staff.pin === password;

    if (!isPasswordMatch && !isPinMatch) {
      setEmailError('Incorrect password or 4-digit PIN. Please try again.');
      triggerHaptic('error');
      setIsSubmitting(false);
      return;
    }

    executeLoginForStaff(staff);
    setIsSubmitting(false);
  };

  return (
    <div
      id="login-screen-root"
      className={`min-h-screen flex flex-col justify-center items-center p-3 sm:p-6 transition-colors duration-200 ${
        isLightMode
          ? 'bg-gradient-to-b from-[#E7ECE5] to-[#D5DDD2] text-zinc-950'
          : 'bg-gradient-to-b from-[#0B150F] via-[#101E16] to-[#080E0A] text-[#F7F4EB]'
      }`}
    >
      {/* Brand Header Card */}
      <div
        className={`w-full max-w-md border-2 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md ${
          isLightMode
            ? 'bg-white/95 border-zinc-300 text-zinc-900'
            : 'bg-[#14231A]/95 border-[#2A4937] text-white'
        }`}
      >
        {/* Header Ribbon */}
        <div
          className={`p-4 sm:p-5 border-b-2 flex items-center justify-between ${
            isLightMode
              ? 'bg-[#122218] text-white border-zinc-900'
              : 'bg-[#0D1812] text-white border-[#2A4937]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E05A47] text-white flex items-center justify-center shadow-md">
              <Coffee className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight uppercase text-white">
                  AMARII CAFÉ
                </span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-emerald-500 text-black rounded-xs">
                  OPS
                </span>
              </div>
              <p className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider">
                Daily Shift & Task Verification
              </p>
            </div>
          </div>

          <div className="text-right flex items-center gap-2">
            <div>
              <span className="text-[10px] font-mono text-zinc-400 block">FIREBASE</span>
              <div className="flex items-center gap-1 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Live DB</span>
              </div>
            </div>
            <button
              type="button"
              id="btn-login-refresh-staff"
              onClick={handleManualStaffSync}
              disabled={isCloudSyncing}
              title="Sync latest staff from Firebase Cloud Database"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab Navigation: PIN | Biometric | Email */}
        <div
          className={`grid grid-cols-3 border-b text-xs font-black uppercase tracking-tight ${
            isLightMode
              ? 'bg-zinc-100 border-zinc-200'
              : 'bg-[#0E1B13] border-[#2A4937]'
          }`}
        >
          <button
            type="button"
            id="tab-login-pin"
            onClick={() => {
              triggerHaptic('light');
              setLoginMode('pin');
              setPinError(null);
            }}
            className={`py-3 flex items-center justify-center gap-1.5 transition cursor-pointer border-b-2 ${
              loginMode === 'pin'
                ? 'border-[#E05A47] text-[#E05A47] bg-white/10 font-black'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>4-Digit PIN</span>
          </button>

          <button
            type="button"
            id="tab-login-biometric"
            onClick={() => {
              triggerHaptic('light');
              setLoginMode('biometric');
            }}
            className={`py-3 flex items-center justify-center gap-1.5 transition cursor-pointer border-b-2 ${
              loginMode === 'biometric'
                ? 'border-[#E05A47] text-[#E05A47] bg-white/10 font-black'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Biometric</span>
          </button>

          <button
            type="button"
            id="tab-login-email"
            onClick={() => {
              triggerHaptic('light');
              setLoginMode('email');
              setEmailError(null);
            }}
            className={`py-3 flex items-center justify-center gap-1.5 transition cursor-pointer border-b-2 ${
              loginMode === 'email'
                ? 'border-[#E05A47] text-[#E05A47] bg-white/10 font-black'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Password</span>
          </button>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* ================= MODE 1: 4-DIGIT PIN ENTRY ================= */}
          {loginMode === 'pin' && (
            <div className="flex flex-col items-center space-y-3.5">
              {/* Selected Profile Banner or Profile Selector */}
              {selectedStaffForPin ? (
                <div className={`w-full p-2.5 rounded-xl border flex items-center justify-between ${
                  isLightMode ? 'bg-amber-50 border-amber-300 text-zinc-900' : 'bg-amber-950/40 border-amber-600/70 text-white'
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                      selectedStaffForPin.avatarColor || 'bg-amber-500 text-black'
                    }`}>
                      {selectedStaffForPin.name.charAt(0)}
                    </div>
                    <div className="min-w-0 text-left">
                      <span className="text-[9px] uppercase font-bold text-amber-500 block leading-none">Punching In As</span>
                      <span className="font-black text-xs truncate block">{selectedStaffForPin.name}</span>
                      <span className="text-[9px] text-zinc-400 truncate block">{selectedStaffForPin.designation} • {selectedStaffForPin.department}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStaffForPin(null);
                      setPinDigits('');
                      setPinError(null);
                    }}
                    className="px-2 py-1 text-[9px] font-black uppercase rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer transition shrink-0"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="w-full space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                      <Users className="w-3 h-3 text-amber-500" />
                      <span>Tap Your Profile to Punch In</span>
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400">
                      {combinedStaff.length} Staff Synced
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-0.5">
                    {combinedStaff.map((staff) => {
                      const isSoleAdmin = isHemenDas(staff);
                      return (
                        <button
                          key={staff.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setSelectedStaffForPin(staff);
                            setPinDigits('');
                            setPinError(null);
                          }}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                            isLightMode
                              ? 'bg-zinc-50 hover:bg-amber-50/70 border-zinc-200 text-zinc-900 hover:border-amber-400'
                              : 'bg-[#182C21] hover:bg-[#203B2C] border-[#2C523B] text-white hover:border-[#E05A47]'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] shrink-0 ${
                            staff.avatarColor || (isSoleAdmin ? 'bg-zinc-900 text-white' : 'bg-red-500 text-white')
                          }`}>
                            {staff.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-black text-[11px] truncate leading-tight">{staff.name}</div>
                            <div className="text-[8px] text-zinc-400 truncate">{staff.department}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="text-center space-y-0.5">
                <h3 className="text-xs font-black uppercase tracking-wider">
                  {selectedStaffForPin ? `Enter 4-Digit PIN for ${selectedStaffForPin.name}` : 'Or Enter 4-Digit PIN Directly'}
                </h3>
              </div>

              {/* 4-Digit Indicator Dots */}
              <div className="flex items-center justify-center gap-3 my-2">
                {[0, 1, 2, 3].map((index) => {
                  const filled = pinDigits.length > index;
                  return (
                    <div
                      key={index}
                      className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                        filled
                          ? 'bg-[#E05A47] border-[#E05A47] scale-110 shadow-sm'
                          : isLightMode
                          ? 'border-zinc-400 bg-zinc-100'
                          : 'border-zinc-600 bg-zinc-900'
                      }`}
                    />
                  );
                })}
              </div>

              {/* PIN Feedback / Error */}
              {pinError && (
                <div className="p-2 px-3 bg-red-950/80 border border-red-500/80 text-red-300 text-xs font-bold rounded-md flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{pinError}</span>
                </div>
              )}

              {successStaff && (
                <div className="p-2 px-3 bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 text-xs font-bold rounded-md flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>
                    Verified: {successStaff.name} ({successStaff.department})
                  </span>
                </div>
              )}

              {/* Numeric Keypad Grid */}
              <div className="w-full max-w-[280px] grid grid-cols-3 gap-2.5 pt-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeypadPress(digit)}
                    disabled={isPinVerifying || Boolean(successStaff)}
                    className={`h-13 text-xl font-mono font-black rounded-xl border-2 transition-all duration-100 flex items-center justify-center cursor-pointer shadow-xs active:scale-92 active:bg-[#E05A47] active:text-white ${
                      isLightMode
                        ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-300 text-zinc-900 active:border-[#E05A47]'
                        : 'bg-[#182C21] hover:bg-[#203B2C] border-[#2C523B] text-white active:border-[#E05A47]'
                    }`}
                  >
                    {digit}
                  </button>
                ))}

                {/* Clear Button */}
                <button
                  type="button"
                  onClick={handleClearPin}
                  disabled={pinDigits.length === 0 || isPinVerifying || Boolean(successStaff)}
                  className={`h-13 text-xs font-black uppercase rounded-xl border-2 transition-all duration-100 flex items-center justify-center cursor-pointer active:scale-95 ${
                    isLightMode
                      ? 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-200'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                  }`}
                  title="Clear PIN"
                >
                  C
                </button>

                {/* Digit 0 */}
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  disabled={isPinVerifying || Boolean(successStaff)}
                  className={`h-13 text-xl font-mono font-black rounded-xl border-2 transition-all duration-100 flex items-center justify-center cursor-pointer shadow-xs active:scale-92 active:bg-[#E05A47] active:text-white ${
                    isLightMode
                      ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-300 text-zinc-900 active:border-[#E05A47]'
                      : 'bg-[#182C21] hover:bg-[#203B2C] border-[#2C523B] text-white active:border-[#E05A47]'
                  }`}
                >
                  0
                </button>

                {/* Backspace Button */}
                <button
                  type="button"
                  onClick={handleBackspace}
                  disabled={pinDigits.length === 0 || isPinVerifying || Boolean(successStaff)}
                  className={`h-13 rounded-xl border-2 transition-all duration-100 flex items-center justify-center cursor-pointer active:scale-95 ${
                    isLightMode
                      ? 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-200'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                  }`}
                  title="Backspace"
                >
                  <Delete className="w-5 h-5 stroke-[2]" />
                </button>
              </div>

              {/* Set / Change Passcode Button */}
              <div className="w-full flex flex-col items-center gap-2 pt-2">
                <button
                  type="button"
                  id="btn-open-set-passcode"
                  onClick={() => {
                    setIsPasscodeModalOpen(true);
                    setPasscodeError(null);
                    setPasscodeSuccess(null);
                  }}
                  className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black uppercase tracking-tight rounded-lg flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-xs"
                >
                  <KeyRound className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Set / Change 4-Digit Passcode</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= MODE 2: BIOMETRIC LOGIN ================= */}
          {loginMode === 'biometric' && (
            <div className="flex flex-col items-center justify-center py-5 space-y-4 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#E05A47] to-amber-500 p-0.5 shadow-xl">
                <div
                  className={`w-full h-full rounded-full flex items-center justify-center ${
                    isLightMode ? 'bg-white text-zinc-900' : 'bg-[#0E1A13] text-white'
                  }`}
                >
                  <Fingerprint className="w-10 h-10 text-[#E05A47]" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black uppercase tracking-wider">
                  Device Biometric Unlock
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs">
                  Hardware-verified fingerprint & Face ID protection for mobile devices.
                </p>
              </div>

              {/* Status Message */}
              {biometricMsg && (
                <div className="w-full max-w-xs p-3 rounded-lg border border-amber-600/50 bg-amber-950/60 text-left space-y-2">
                  <p className="text-xs font-bold text-amber-300">
                    {biometricMsg}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEnrollingBiometric(true);
                        setEnrollError(null);
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded-md flex items-center gap-1 cursor-pointer"
                    >
                      <Fingerprint className="w-3 h-3" />
                      <span>Register Fingerprint</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMode('pin');
                        setPinError(null);
                      }}
                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-[10px] font-black uppercase rounded-md flex items-center gap-1 cursor-pointer"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Use PIN</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Check enrollment status */}
              {enrolledBiometricUser ? (
                <div className="w-full max-w-xs space-y-3">
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 rounded-lg text-xs font-semibold flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Paired with: <strong>{enrolledBiometricUser.name}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEnrollingBiometric(true)}
                      className="text-[10px] text-amber-400 underline font-bold"
                    >
                      Change
                    </button>
                  </div>

                  <button
                    type="button"
                    id="btn-biometric-trigger"
                    onClick={handleBiometricAuth}
                    disabled={biometricStatus === 'scanning'}
                    className="w-full py-3.5 px-4 bg-[#E05A47] hover:bg-[#D44A35] text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Fingerprint className="w-5 h-5 stroke-[2.5]" />
                    <span>{biometricStatus === 'scanning' ? 'Verifying Hardware...' : 'Scan Fingerprint to Unlock'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('pin');
                      setPinError(null);
                    }}
                    className="w-full py-2.5 px-3 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Or Punch In With 4-Digit PIN</span>
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-xs space-y-3">
                  <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-left text-xs space-y-1">
                    <p className="font-black text-amber-400 uppercase flex items-center gap-1">
                      <Smartphone className="w-4 h-4" />
                      <span>Phone Setup Required</span>
                    </p>
                    <p className="text-zinc-300 text-[11px]">
                      To unlock with Fingerprint, register this phone once using your 4-digit PIN.
                    </p>
                  </div>

                  <button
                    type="button"
                    id="btn-start-biometric-enroll"
                    onClick={() => {
                      setIsEnrollingBiometric(true);
                      setEnrollError(null);
                    }}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Fingerprint className="w-4 h-4 stroke-[2.5]" />
                    <span>Register Phone Fingerprint</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('pin');
                      setPinError(null);
                    }}
                    className="w-full py-2.5 px-3 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Punch In With 4-Digit PIN</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= MODE 3: EMAIL & PASSWORD ================= */}
          {loginMode === 'email' && (
            <form id="email-password-login-form" onSubmit={handleEmailSubmit} className="space-y-3.5">
              {emailError && (
                <div
                  role="alert"
                  className="p-3 bg-red-950/90 border border-red-600 text-red-100 text-xs font-bold rounded-lg flex items-start gap-2.5"
                >
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{emailError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="login-email-input"
                  className="block text-[11px] font-black uppercase tracking-wider mb-1 text-zinc-400"
                >
                  Work Email, Phone, or Staff Name
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-email-input"
                    type="text"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. aditya123@gmail.com, 99876543210, or Aditya"
                    className={`w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm font-medium border-2 rounded-lg outline-none transition ${
                      isLightMode
                        ? 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:border-[#E05A47]'
                        : 'bg-black/50 border-[#2A4937] text-white focus:border-[#E05A47]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password-input"
                  className="block text-[11px] font-black uppercase tracking-wider mb-1 text-zinc-400"
                >
                  Password or 4-Digit PIN
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter password or 4-digit PIN"
                    className={`w-full pl-9 pr-11 py-2.5 text-xs sm:text-sm font-mono border-2 rounded-lg outline-none transition ${
                      isLightMode
                        ? 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:border-[#E05A47]'
                        : 'bg-black/50 border-[#2A4937] text-white focus:border-[#E05A47]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="btn-login-submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-[#E05A47] hover:bg-[#D44A35] text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </form>
          )}
        </div>

        {/* Card Footer */}
        <div
          className={`p-3 sm:p-4 border-t text-[10px] sm:text-xs flex items-center justify-between ${
            isLightMode
              ? 'bg-zinc-50 border-zinc-200 text-zinc-600'
              : 'bg-[#0E1A13] border-[#2A4937] text-zinc-400'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-amber-500" />
            <span>Outlet: {DEFAULT_OUTLET}</span>
          </span>
          <span className="font-mono text-zinc-400">Department Lock Active</span>
        </div>
      </div>

      {/* ================= MODAL: SET / CHANGE 4-DIGIT PASSCODE ================= */}
      {isPasscodeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Set / Change 4-Digit Passcode"
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="max-w-md w-full bg-zinc-950 border-2 border-amber-500 rounded-xl shadow-2xl p-5 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <KeyRound className="w-5 h-5 stroke-[2.5]" />
                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white">
                  Set / Change 4-Digit Passcode
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPasscodeModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePasscode} className="space-y-3.5">
              {passcodeError && (
                <div className="p-2.5 bg-red-950/90 border border-red-500 text-red-200 text-xs font-bold rounded-lg flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{passcodeError}</span>
                </div>
              )}

              {passcodeSuccess && (
                <div className="p-2.5 bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs font-bold rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{passcodeSuccess}</span>
                </div>
              )}

              {/* 1. Staff Selector */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-1">
                  Select Staff Member *
                </label>
                <select
                  value={passcodeStaffId}
                  onChange={(e) => setPasscodeStaffId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-white text-xs font-black uppercase rounded-lg outline-none focus:border-amber-400"
                >
                  {combinedStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.designation} • {s.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Security Check: Current PIN or Manager PIN */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-1">
                  Current PIN or Manager PIN *
                </label>
                <input
                  type={showPasscodePins ? 'text' : 'password'}
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={currentOrAdminPin}
                  onChange={(e) => setCurrentOrAdminPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter current PIN"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-amber-400 font-mono text-center text-lg font-black tracking-widest rounded-lg outline-none focus:border-amber-400"
                />
              </div>

              {/* 3. New 4-Digit PIN */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300">
                    New 4-Digit Passcode (PIN) *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPin}
                    className="text-[10px] text-amber-400 font-bold uppercase hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Generate</span>
                  </button>
                </div>
                <input
                  type={showPasscodePins ? 'text' : 'password'}
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newPasscodePin}
                  onChange={(e) => setNewPasscodePin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 5678"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-emerald-400 font-mono text-center text-xl font-black tracking-widest rounded-lg outline-none focus:border-emerald-400"
                />
              </div>

              {/* 4. Confirm New PIN */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-1">
                  Confirm New 4-Digit Passcode *
                </label>
                <input
                  type={showPasscodePins ? 'text' : 'password'}
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmPasscodePin}
                  onChange={(e) => setConfirmPasscodePin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Retype 4-digit PIN"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-emerald-400 font-mono text-center text-xl font-black tracking-widest rounded-lg outline-none focus:border-emerald-400"
                />
              </div>

              {/* 5. Optional: Change Account Password */}
              <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300">
                    Change Account Password (Optional)
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">Min 4 chars</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type={showPasscodePins ? 'text' : 'password'}
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="New password (optional)"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-white font-mono text-xs rounded-lg outline-none focus:border-amber-400"
                  />
                  <input
                    type={showPasscodePins ? 'text' : 'password'}
                    value={confirmStaffPassword}
                    onChange={(e) => setConfirmStaffPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-white font-mono text-xs rounded-lg outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowPasscodePins(!showPasscodePins)}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  {showPasscodePins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPasscodePins ? 'Hide Credentials' : 'Show Credentials'}</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPasscodeModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-tight rounded-lg cursor-pointer"
                >
                  Save Passcode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: REGISTER DEVICE BIOMETRIC ================= */}
      {isEnrollingBiometric && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Register Phone Fingerprint"
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="max-w-md w-full bg-zinc-950 border-2 border-emerald-500 rounded-xl shadow-2xl p-5 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Fingerprint className="w-5 h-5 stroke-[2.5]" />
                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white">
                  Register Phone Fingerprint
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEnrollingBiometric(false)}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-300">
              Enter your assigned 4-digit PIN to register this phone for 1-Tap Biometric unlock.
            </p>

            <form onSubmit={handleEnrollDeviceBiometric} className="space-y-3.5">
              {enrollError && (
                <div className="p-2.5 bg-red-950/90 border border-red-500 text-red-200 text-xs font-bold rounded-lg flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{enrollError}</span>
                </div>
              )}

              {enrollSuccess && (
                <div className="p-2.5 bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs font-bold rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{enrollSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-1">
                  Enter Your 4-Digit PIN *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={enrollPin}
                  onChange={(e) => setEnrollPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-emerald-400 font-mono text-center text-2xl font-black tracking-widest rounded-lg outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEnrollingBiometric(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-tight rounded-lg cursor-pointer"
                >
                  Verify PIN & Pair
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collision Resolver Modal */}
      {collisionStaffList && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className={`w-full max-w-sm rounded-2xl border-2 p-5 space-y-4 shadow-2xl ${
            isLightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#14231A] border-[#2A4937] text-white'
          }`}>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-sm uppercase">Select Your Account</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCollisionStaffList(null);
                  setPinDigits('');
                }}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Multiple staff accounts share PIN <span className="font-mono font-bold text-amber-400">"{collisionPin}"</span>. Please select your account to punch in:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {collisionStaffList.map((staff) => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => {
                    setCollisionStaffList(null);
                    setSuccessStaff(staff);
                    triggerHaptic('success');
                    setTimeout(() => executeLoginForStaff(staff), 250);
                  }}
                  className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition cursor-pointer ${
                    isLightMode
                      ? 'bg-zinc-100 hover:bg-amber-100 border-zinc-300'
                      : 'bg-[#182C21] hover:bg-[#203B2C] border-[#2C523B]'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                    staff.avatarColor || 'bg-red-500 text-white'
                  }`}>
                    {staff.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-xs sm:text-sm truncate">{staff.name}</div>
                    <div className="text-[10px] text-zinc-400 font-medium truncate">{staff.designation} • {staff.department}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
