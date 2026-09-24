import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Outlet, INITIAL_OUTLETS, DEFAULT_OUTLET } from '../types';
import { useAuth } from './AuthContext';
import {
  subscribeToOutlets,
  saveOutletToFirebase,
  deleteOutletFromFirebase,
  seedInitialOutletsIfEmpty,
} from '../lib/firebase';

export interface OutletContextType {
  activeOutlet: string;
  setActiveOutlet: (outlet: string) => void;
  availableOutlets: string[];
  outlets: Outlet[];
  isOutletLocked: boolean;
  assignedOutlet: string | undefined;
  addOutlet: (name: string, address?: string, phone?: string) => Promise<Outlet>;
  updateOutlet: (id: string, name: string, address?: string, phone?: string) => Promise<void>;
  deleteOutlet: (id: string) => Promise<void>;
  isOutletModalOpen: boolean;
  openOutletModal: (outlet?: Outlet | null) => void;
  closeOutletModal: () => void;
  editingOutlet: Outlet | null;
}

const STORAGE_KEY_OUTLETS = 'amarii_outlets_v2';
const STORAGE_KEY_ACTIVE_OUTLET = 'amarii_active_outlet_v2';

const OutletContext = createContext<OutletContextType | undefined>(undefined);

export const OutletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isStaff, isAdmin, isManager } = useAuth();

  // Dynamic Outlets State initialized from localStorage or initial fallback outlets
  const [outlets, setOutlets] = useState<Outlet[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OUTLETS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed.filter(
            (o: any) =>
              o &&
              o.id &&
              !o.id.includes('main-street') &&
              !o.id.includes('airport') &&
              !o.id.includes('mall-kiosk') &&
              !o.name.toLowerCase().includes('main street') &&
              !o.name.toLowerCase().includes('airport') &&
              !o.name.toLowerCase().includes('mall kiosk')
          );
          if (clean.length > 0) return clean;
        }
      }
    } catch (e) {
      console.warn('Failed to load cached outlets from localStorage:', e);
    }
    return INITIAL_OUTLETS;
  });

  // Modal State for Outlet Management
  const [isOutletModalOpen, setIsOutletModalOpen] = useState<boolean>(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);

  // Real-time Firestore sync & seed
  useEffect(() => {
    // Seed initial outlets to Firestore if remote collection is empty
    seedInitialOutletsIfEmpty(INITIAL_OUTLETS);

    const unsubscribe = subscribeToOutlets(
      (remoteOutlets) => {
        if (remoteOutlets && remoteOutlets.length > 0) {
          setOutlets(remoteOutlets);
          try {
            localStorage.setItem(STORAGE_KEY_OUTLETS, JSON.stringify(remoteOutlets));
          } catch (e) {
            console.warn('Failed to cache outlets to localStorage:', e);
          }
        }
      },
      (err) => {
        console.warn('Firestore outlets subscription fallback:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Compute available outlet names
  const availableOutlets = useMemo(() => {
    const names = outlets.map((o) => o.name.trim()).filter(Boolean);
    return names.length > 0 ? Array.from(new Set(names)) : [DEFAULT_OUTLET];
  }, [outlets]);

  // Selected Active Outlet State
  const [selectedOutlet, setSelectedOutlet] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_OUTLET);
      if (saved) return saved;
    } catch (e) {
      console.warn('Failed to load active outlet:', e);
    }
    return DEFAULT_OUTLET;
  });

  // Cross-tab active outlet synchronization
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_ACTIVE_OUTLET && e.newValue) {
        setSelectedOutlet(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Validate active outlet against current available outlets
  useEffect(() => {
    if (availableOutlets.length > 0 && !availableOutlets.includes(selectedOutlet)) {
      if (!isStaff) {
        setSelectedOutlet(availableOutlets[0]);
      }
    }
  }, [availableOutlets, selectedOutlet, isStaff]);

  // When staff logs in, automatically sync view to their assigned physical outlet
  useEffect(() => {
    if (isStaff && currentUser?.outlet) {
      setSelectedOutlet(currentUser.outlet);
    } else if ((isAdmin || isManager) && currentUser?.outlet && !localStorage.getItem(STORAGE_KEY_ACTIVE_OUTLET)) {
      setSelectedOutlet(currentUser.outlet);
    }
  }, [currentUser, isStaff, isAdmin, isManager]);

  const handleSetOutlet = (outlet: string) => {
    // If staff, lock to their physical branch
    if (isStaff && currentUser?.outlet) {
      return;
    }
    setSelectedOutlet(outlet);
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_OUTLET, outlet);
    } catch (e) {
      console.warn('Failed to persist active outlet:', e);
    }
  };

  // Add a new outlet dynamically
  const addOutlet = async (name: string, address?: string, phone?: string): Promise<Outlet> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Outlet name cannot be blank.');
    }

    // Check duplicate
    const existing = outlets.find(
      (o) => o.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      throw new Error(`An outlet named "${trimmedName}" already exists.`);
    }

    const slug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');
    const newId = `outlet-${slug}-${Date.now()}`;

    const newOutlet: Outlet = {
      id: newId,
      name: trimmedName,
      address: address?.trim() || '',
      phone: phone?.trim() || '',
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    // Update state immediately for instant responsive UI
    const updated = [...outlets, newOutlet];
    setOutlets(updated);
    try {
      localStorage.setItem(STORAGE_KEY_OUTLETS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to cache new outlet:', e);
    }

    // Persist to Firestore
    await saveOutletToFirebase(newOutlet);

    return newOutlet;
  };

  // Update / Rename an existing outlet
  const updateOutlet = async (
    id: string,
    name: string,
    address?: string,
    phone?: string
  ): Promise<void> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Outlet name cannot be blank.');
    }

    const targetIndex = outlets.findIndex((o) => o.id === id);
    if (targetIndex === -1) {
      throw new Error('Outlet record not found.');
    }

    const oldName = outlets[targetIndex].name;

    // Check duplicate if name changed
    const duplicate = outlets.find(
      (o) => o.id !== id && o.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`Another outlet with the name "${trimmedName}" already exists.`);
    }

    const slug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');
    const expectedId = `outlet-${slug}`;
    const needsIdMigration = id !== expectedId && (id.includes('aundh') && trimmedName.toLowerCase().includes('kothrud') || id.includes('179025') || id.includes('179026'));
    const finalId = needsIdMigration ? expectedId : id;

    const updatedOutlet: Outlet = {
      ...outlets[targetIndex],
      id: finalId,
      name: trimmedName,
      address: address?.trim() ?? outlets[targetIndex].address,
      phone: phone?.trim() ?? outlets[targetIndex].phone,
    };

    const updated = [...outlets];
    updated[targetIndex] = updatedOutlet;
    setOutlets(updated);

    try {
      localStorage.setItem(STORAGE_KEY_OUTLETS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to cache updated outlets:', e);
    }

    // If currently selected outlet was the old name, update active selection
    if (selectedOutlet === oldName) {
      setSelectedOutlet(trimmedName);
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE_OUTLET, trimmedName);
      } catch (e) {
        console.warn('Failed to update active outlet selection:', e);
      }
    }

    // Delete old document if ID migrated
    if (needsIdMigration) {
      await deleteOutletFromFirebase(id);
    }

    // Persist to Firestore under final ID
    await saveOutletToFirebase(updatedOutlet);
  };

  // Delete an outlet
  const deleteOutlet = async (id: string): Promise<void> => {
    if (outlets.length <= 1) {
      throw new Error('Cannot delete the last remaining outlet.');
    }

    const target = outlets.find((o) => o.id === id);
    if (!target) {
      throw new Error('Outlet not found.');
    }

    if (target.isDefault) {
      throw new Error('The default headquarters outlet cannot be deleted.');
    }

    const updated = outlets.filter((o) => o.id !== id);
    setOutlets(updated);

    try {
      localStorage.setItem(STORAGE_KEY_OUTLETS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to cache outlets after deletion:', e);
    }

    // If active outlet was the deleted one, switch to the first remaining outlet
    if (selectedOutlet === target.name) {
      const nextOutlet = updated[0]?.name || DEFAULT_OUTLET;
      setSelectedOutlet(nextOutlet);
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE_OUTLET, nextOutlet);
      } catch (e) {
        console.warn('Failed to update active outlet after deletion:', e);
      }
    }

    // Delete in Firestore
    await deleteOutletFromFirebase(id);
  };

  const openOutletModal = (outlet?: Outlet | null) => {
    setEditingOutlet(outlet || null);
    setIsOutletModalOpen(true);
  };

  const closeOutletModal = () => {
    setIsOutletModalOpen(false);
    setEditingOutlet(null);
  };

  // Staff members are strictly locked to their physical outlet
  const isOutletLocked = isStaff;
  const activeOutlet = isStaff && currentUser?.outlet ? currentUser.outlet : selectedOutlet;

  return (
    <OutletContext.Provider
      value={{
        activeOutlet,
        setActiveOutlet: handleSetOutlet,
        availableOutlets,
        outlets,
        isOutletLocked,
        assignedOutlet: currentUser?.outlet,
        addOutlet,
        updateOutlet,
        deleteOutlet,
        isOutletModalOpen,
        openOutletModal,
        closeOutletModal,
        editingOutlet,
      }}
    >
      {children}
    </OutletContext.Provider>
  );
};

export const useOutlet = (): OutletContextType => {
  const context = useContext(OutletContext);
  if (!context) {
    throw new Error('useOutlet must be used within an OutletProvider');
  }
  return context;
};
