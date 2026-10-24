import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  Upload,
  Trash2,
  ExternalLink,
  RefreshCw,
  FileText,
  Folder,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Lock,
  Search,
} from 'lucide-react';
import {
  googleSignInForDrive,
  getDriveAccessToken,
  googleSignOut,
  listGoogleDriveFiles,
  deleteGoogleDriveFile,
  uploadFileToGoogleDrive,
  getOrCreateAmariiFolder,
  DriveFileItem,
} from '../lib/googleDrive';
import { useTheme } from '../context/ThemeContext';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDriveConnectedChange?: (isConnected: boolean) => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  onDriveConnectedChange,
}) => {
  const { isLightMode } = useTheme();
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [folderId, setFolderId] = useState<string | null>(null);

  // Check if token exists on open
  useEffect(() => {
    if (isOpen) {
      getDriveAccessToken().then((activeToken) => {
        if (activeToken) {
          setToken(activeToken);
          if (onDriveConnectedChange) onDriveConnectedChange(true);
          loadDriveFiles(activeToken);
        } else {
          setToken(null);
          if (onDriveConnectedChange) onDriveConnectedChange(false);
        }
      });
    }
  }, [isOpen]);

  const loadDriveFiles = async (accessToken: string) => {
    setIsLoading(true);
    setStatusNotice(null);
    try {
      const amariiFolderId = await getOrCreateAmariiFolder(accessToken);
      setFolderId(amariiFolderId);
      const driveFiles = await listGoogleDriveFiles(accessToken, amariiFolderId);
      setFiles(driveFiles);
    } catch (err: any) {
      console.error('Failed to load Google Drive files:', err);
      setStatusNotice(`Drive Notice: ${err.message || 'Could not fetch files'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setStatusNotice(null);
    try {
      const result = await googleSignInForDrive();
      if (result) {
        setToken(result.accessToken);
        setUserEmail(result.user.email);
        if (onDriveConnectedChange) onDriveConnectedChange(true);
        setStatusNotice(`✓ Connected to Google Drive (${result.user.email || 'Google Account'})!`);
        await loadDriveFiles(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setStatusNotice(`Sign-in failed: ${err.message || 'Authentication error'}`);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await googleSignOut();
    setToken(null);
    setUserEmail(null);
    setFiles([]);
    if (onDriveConnectedChange) onDriveConnectedChange(false);
    setStatusNotice('Disconnected from Google Drive.');
  };

  const handleDeleteFile = async (file: DriveFileItem) => {
    if (!token) return;
    try {
      const deleted = await deleteGoogleDriveFile(token, file.id, file.name);
      if (deleted) {
        setFiles((prev) => prev.filter((f) => f.id !== file.id));
        setStatusNotice(`✓ File "${file.name}" deleted from Google Drive.`);
      }
    } catch (err: any) {
      console.error('Failed to delete Drive file:', err);
      setStatusNotice(`Delete error: ${err.message || 'Operation failed'}`);
    }
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-drive-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200 overflow-hidden"
    >
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col border-2 sm:border-4 border-white shadow-2xl overflow-hidden rounded-xl sm:rounded-none ${
          isLightMode ? 'bg-zinc-900 text-white' : 'bg-zinc-950 text-white'
        }`}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b-2 sm:border-b-4 border-white flex items-center justify-between bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-lg sm:rounded-none">
              <HardDrive className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2
                id="google-drive-modal-title"
                className="text-lg sm:text-xl font-black uppercase tracking-tight text-white flex items-center gap-2"
              >
                Google Drive Storage & Backup
              </h2>
              <p className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider">
                Cloud Backup for Amarii Café Shift Reports & Checklists
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-zinc-800 hover:bg-white hover:text-black text-white transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg sm:rounded-none"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Notice Bar */}
        {statusNotice && (
          <div className="mx-4 mt-3 p-3 bg-blue-950/80 border border-blue-500 text-blue-200 text-xs font-bold rounded flex items-center justify-between shrink-0">
            <span>{statusNotice}</span>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              className="text-blue-400 hover:text-white text-xs underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-zinc-950 modal-scroll-area">
          {!token ? (
            /* Unauthenticated / Sign in View */
            <div className="text-center py-8 px-4 space-y-6 bg-zinc-900/60 border border-zinc-800 rounded-xl">
              <div className="w-16 h-16 bg-blue-900/40 text-blue-400 rounded-full flex items-center justify-center mx-auto border border-blue-500/30">
                <HardDrive className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg font-black uppercase text-white">Connect Google Drive</h3>
                <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                  Authenticate with Google Drive to automatically back up daily shift sign-off reports, PDF audit exports, and operational logs to your personal or café Google Drive.
                </p>
              </div>

              {/* Official Google Sign-In Button Style */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="gsi-material-button inline-flex items-center gap-3 px-6 py-3 bg-white text-black hover:bg-zinc-100 transition font-bold text-xs uppercase tracking-wider shadow-lg rounded-lg border border-zinc-300 cursor-pointer disabled:opacity-50 min-h-[48px]"
                >
                  {isSigningIn ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                  )}
                  <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google Drive'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Connected / File Explorer View */
            <div className="space-y-4">
              {/* Connection Banner */}
              <div className="p-3.5 bg-emerald-950/60 border border-emerald-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block text-white">
                      Google Drive Connected
                    </span>
                    <span className="text-[11px] font-mono text-emerald-300">
                      Folder: "Amarii Café Operations" {userEmail ? `(${userEmail})` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadDriveFiles(token)}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer rounded"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 text-xs font-bold uppercase transition cursor-pointer rounded"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search backed up reports in Google Drive..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* File List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-zinc-400 px-1">
                  <span>Backed Up Reports ({filteredFiles.length})</span>
                  <span>Drive Folder: Amarii Café Operations</span>
                </div>

                {isLoading ? (
                  <div className="py-12 text-center text-xs font-bold text-zinc-500 flex flex-col items-center justify-center gap-2 bg-zinc-900/40 rounded">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    <span>Fetching files from Google Drive...</span>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="py-10 px-4 text-center text-xs font-bold uppercase tracking-wider text-zinc-500 bg-zinc-900/40 border border-dashed border-zinc-800 rounded space-y-2">
                    <p>No backed up files found in "Amarii Café Operations" Drive folder.</p>
                    <p className="text-[11px] text-zinc-600 font-normal">
                      Submit shift checklists or click "Backup to Google Drive" on any report to store a copy in Drive!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {filteredFiles.map((file) => {
                      const isPdf = file.name.endsWith('.pdf') || file.mimeType.includes('pdf');
                      const isJson = file.name.endsWith('.json') || file.mimeType.includes('json');

                      return (
                        <div
                          key={file.id}
                          className="p-3 bg-zinc-900/80 border border-zinc-800 hover:border-zinc-600 transition rounded flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`p-2 rounded ${isPdf ? 'bg-red-950/80 text-red-400' : isJson ? 'bg-amber-950/80 text-amber-400' : 'bg-blue-950/80 text-blue-400'}`}>
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-white truncate block">
                                {file.name}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono block">
                                {file.createdTime ? new Date(file.createdTime).toLocaleString() : 'Google Drive'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 bg-blue-900/50 hover:bg-blue-800 text-blue-200 transition rounded flex items-center justify-center"
                                title="Open in Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteFile(file)}
                              className="p-2 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 transition cursor-pointer rounded"
                              title="Delete from Google Drive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between text-xs">
          <span className="text-zinc-400 font-medium">
            Amarii Café Cloud Integration
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-wider rounded transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
