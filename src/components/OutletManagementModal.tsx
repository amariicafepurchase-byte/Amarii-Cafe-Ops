import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  X,
  MapPin,
  Phone,
  Check,
  Edit2,
  Trash2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useOutlet } from '../context/OutletContext';
import { useAuth } from '../context/AuthContext';
import { Outlet } from '../types';

interface OutletManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLightMode: boolean;
}

export const OutletManagementModal: React.FC<OutletManagementModalProps> = ({
  isOpen,
  onClose,
  isLightMode,
}) => {
  const {
    outlets,
    activeOutlet,
    setActiveOutlet,
    addOutlet,
    updateOutlet,
    deleteOutlet,
    editingOutlet,
  } = useOutlet();

  const { isAdmin } = useAuth();

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [outletName, setOutletName] = useState<string>('');
  const [outletAddress, setOutletAddress] = useState<string>('');
  const [outletPhone, setOutletPhone] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setOutletName('');
    setOutletAddress('');
    setOutletPhone('');
    setErrorMessage(null);
    setConfirmDeleteId(null);
  }, []);

  // Sync editing outlet if opened directly with an outlet to edit
  useEffect(() => {
    if (!isOpen) return;

    if (editingOutlet) {
      setEditingId(editingOutlet.id);
      setOutletName(editingOutlet.name);
      setOutletAddress(editingOutlet.address || '');
      setOutletPhone(editingOutlet.phone || '');
    } else {
      resetForm();
    }
  }, [editingOutlet, isOpen, resetForm]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const startEdit = (outlet: Outlet) => {
    setEditingId(outlet.id);
    setOutletName(outlet.name);
    setOutletAddress(outlet.address || '');
    setOutletPhone(outlet.phone || '');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const cancelEdit = () => {
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const name = outletName.trim();
    if (!name) {
      setErrorMessage('Please enter a valid outlet name.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingId) {
        // Update existing outlet
        await updateOutlet(editingId, name, outletAddress, outletPhone);
        setSuccessMessage(`Outlet "${name}" updated successfully!`);
        resetForm();
      } else {
        // Add new outlet
        const newOutlet = await addOutlet(name, outletAddress, outletPhone);
        setSuccessMessage(`New branch "${newOutlet.name}" created and synced globally!`);
        resetForm();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save outlet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (outlet: Outlet) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (outlet.isDefault) {
      setErrorMessage('The primary default headquarters outlet cannot be removed.');
      return;
    }

    try {
      await deleteOutlet(outlet.id);
      setSuccessMessage(`Outlet "${outlet.name}" was successfully removed.`);
      setConfirmDeleteId(null);
      if (editingId === outlet.id) {
        resetForm();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete outlet.');
    }
  };

  return (
    <div
      id="outlet-management-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="outlet-management-modal-container"
        className={`relative w-full max-w-2xl my-auto border-2 sm:border-4 shadow-2xl overflow-hidden transition-all ${
          isLightMode ? 'bg-white border-zinc-400 text-zinc-900' : 'bg-[#122118] border-[#2E553F] text-[#F7F4EB]'
        }`}
      >
        {/* Header Bar */}
        <div
          className={`p-4 sm:p-5 border-b-2 flex items-center justify-between gap-3 ${
            isLightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#0D1812] border-[#2E553F]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 text-black flex items-center justify-center font-black border border-amber-600 shadow-xs">
              <Building2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">
                  Outlet & Branch Management
                </h2>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-red-600 text-white tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>ADMIN ONLY</span>
                </span>
              </div>
              <p
                className={`text-[11px] sm:text-xs font-semibold ${
                  isLightMode ? 'text-zinc-600' : 'text-zinc-400'
                }`}
              >
                Configure physical cafe locations, branches, and multi-unit operations
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-outlet-modal"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status Banners */}
          {errorMessage && (
            <div
              id="outlet-modal-error-banner"
              role="alert"
              className="p-3 bg-red-950/90 border-2 border-red-600 text-red-100 text-xs font-bold flex items-start gap-2.5 animate-in shake"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-300 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {successMessage && (
            <div
              id="outlet-modal-success-banner"
              role="status"
              className="p-3 bg-emerald-950/90 border-2 border-emerald-600 text-emerald-100 text-xs font-bold flex items-center gap-2.5 animate-in fade-in"
            >
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1">{successMessage}</div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-300 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Form: Add or Edit Outlet */}
          <div
            className={`p-4 border-2 transition ${
              editingId
                ? 'border-amber-500 bg-amber-500/10'
                : isLightMode
                ? 'bg-zinc-50 border-zinc-300'
                : 'bg-black/30 border-[#2E553F]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {editingId ? (
                  <Edit2 className="w-4 h-4 text-amber-400" />
                ) : (
                  <Plus className="w-4 h-4 text-emerald-400" />
                )}
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                  {editingId ? 'Edit Outlet Details' : 'Add New Cafe Outlet'}
                </h3>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-[11px] font-bold text-zinc-400 hover:text-white uppercase underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} id="form-outlet-management" className="space-y-3">
              {/* Outlet Name Input (Primary field requested) */}
              <div>
                <label
                  htmlFor="input-outlet-name"
                  className={`block text-[11px] font-black uppercase tracking-wider mb-1 flex items-center justify-between ${
                    isLightMode ? 'text-zinc-800' : 'text-zinc-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Outlet / Branch Name *</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-normal">
                    e.g. Amarii - Downtown Boulevard
                  </span>
                </label>
                <input
                  id="input-outlet-name"
                  type="text"
                  required
                  value={outletName}
                  onChange={(e) => {
                    setOutletName(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Amarii - Downtown Boulevard"
                  className={`w-full px-3.5 py-2 text-xs sm:text-sm font-bold border-2 outline-none transition min-h-[42px] ${
                    isLightMode
                      ? 'bg-white border-zinc-400 text-zinc-950 focus:border-amber-500'
                      : 'bg-black/60 border-zinc-700 text-white focus:border-amber-500'
                  }`}
                />
              </div>

              {/* Optional Physical Address and Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="input-outlet-address"
                    className={`block text-[11px] font-black uppercase tracking-wider mb-1 flex items-center gap-1.5 ${
                      isLightMode ? 'text-zinc-800' : 'text-zinc-300'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Street Address (Optional)</span>
                  </label>
                  <input
                    id="input-outlet-address"
                    type="text"
                    value={outletAddress}
                    onChange={(e) => setOutletAddress(e.target.value)}
                    placeholder="Shop 14, Promenade Mall"
                    className={`w-full px-3 py-2 text-xs font-medium border outline-none transition min-h-[38px] ${
                      isLightMode
                        ? 'bg-white border-zinc-300 text-zinc-900 focus:border-amber-500'
                        : 'bg-black/50 border-zinc-800 text-white focus:border-amber-500'
                    }`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-outlet-phone"
                    className={`block text-[11px] font-black uppercase tracking-wider mb-1 flex items-center gap-1.5 ${
                      isLightMode ? 'text-zinc-800' : 'text-zinc-300'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Contact Phone (Optional)</span>
                  </label>
                  <input
                    id="input-outlet-phone"
                    type="text"
                    value={outletPhone}
                    onChange={(e) => setOutletPhone(e.target.value)}
                    placeholder="+91 98765 01004"
                    className={`w-full px-3 py-2 text-xs font-medium border outline-none transition min-h-[38px] ${
                      isLightMode
                        ? 'bg-white border-zinc-300 text-zinc-900 focus:border-amber-500'
                        : 'bg-black/50 border-zinc-800 text-white focus:border-amber-500'
                    }`}
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-3 py-2 text-xs font-black uppercase tracking-wider text-zinc-400 hover:text-white border border-zinc-700 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  id={editingId ? 'btn-update-outlet' : 'btn-save-outlet'}
                  disabled={isSubmitting}
                  className={`px-5 py-2.5 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm transition ${
                    editingId
                      ? 'bg-amber-500 hover:bg-amber-400 text-black'
                      : 'bg-[#E05A47] hover:bg-[#D44A35] text-white'
                  }`}
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : editingId ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Update Outlet</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Save & Synchronize Outlet</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Existing Outlets Directory List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Configured Branches ({outlets.length})</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                Active Session Branch: <strong className="text-amber-400">{activeOutlet}</strong>
              </span>
            </div>

            <div className="space-y-2">
              {outlets.map((outlet) => {
                const isActive = outlet.name === activeOutlet;
                const isConfirming = confirmDeleteId === outlet.id;

                return (
                  <div
                    key={outlet.id}
                    id={`outlet-item-${outlet.id}`}
                    className={`p-3 sm:p-3.5 border-2 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isActive
                        ? 'border-amber-500 bg-amber-500/10'
                        : isLightMode
                        ? 'border-zinc-300 bg-zinc-50 hover:border-zinc-400'
                        : 'border-[#2E553F] bg-black/40 hover:border-zinc-600'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <MapPin
                          className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-[#E05A47]'}`}
                        />
                        <span className="text-sm font-black uppercase tracking-tight">
                          {outlet.name}
                        </span>

                        {outlet.isDefault && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-zinc-800 text-amber-300 border border-amber-500/40">
                            HQ / DEFAULT
                          </span>
                        )}

                        {isActive && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-amber-500 text-black">
                            ACTIVE SESSION
                          </span>
                        )}
                      </div>

                      {(outlet.address || outlet.phone) && (
                        <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 font-medium">
                          {outlet.address && <span>{outlet.address}</span>}
                          {outlet.phone && (
                            <span className="font-mono text-zinc-500">📞 {outlet.phone}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons for this Outlet */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {/* Set Active Button */}
                      {!isActive && (
                        <button
                          type="button"
                          id={`btn-select-outlet-${outlet.id}`}
                          onClick={() => {
                            setActiveOutlet(outlet.name);
                            setSuccessMessage(`Switched active operational view to "${outlet.name}".`);
                          }}
                          className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 transition cursor-pointer"
                          title="Switch active session branch to this outlet"
                        >
                          Switch To
                        </button>
                      )}

                      {/* Edit Button */}
                      <button
                        type="button"
                        id={`btn-edit-outlet-${outlet.id}`}
                        onClick={() => startEdit(outlet)}
                        className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10 border border-transparent hover:border-amber-400/40 transition cursor-pointer"
                        title="Edit outlet details"
                        aria-label={`Edit ${outlet.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button (with confirmation state) */}
                      {!outlet.isDefault && (
                        <>
                          {isConfirming ? (
                            <div className="flex items-center gap-1 animate-in fade-in">
                              <button
                                type="button"
                                id={`btn-confirm-delete-${outlet.id}`}
                                onClick={() => handleDelete(outlet)}
                                className="px-2 py-1 text-[9px] font-black uppercase bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-1 text-[9px] text-zinc-400 hover:text-white"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              id={`btn-delete-outlet-${outlet.id}`}
                              onClick={() => setConfirmDeleteId(outlet.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 border border-transparent hover:border-red-400/40 transition cursor-pointer"
                              title="Delete custom outlet"
                              aria-label={`Delete ${outlet.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div
          className={`p-3 sm:p-4 border-t text-[10px] sm:text-xs flex items-center justify-between ${
            isLightMode ? 'bg-zinc-100 border-zinc-300 text-zinc-600' : 'bg-[#0D1812] border-[#2E553F] text-zinc-400'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Changes reflect immediately in the Header and Staff Management</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase text-[10px] tracking-wider cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
