import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { app } from './firebase';

const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Configure Google Drive OAuth scopes
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
}

// Initialize Auth listener and restore in-memory cached token
export const initGoogleAuth = (
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onSuccess) onSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onFailure) onFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onFailure) onFailure();
    }
  });
};

// Sign in with Google to get access token for Google Drive API
export const googleSignInForDrive = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive access token');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('[Google Drive Auth] Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getDriveAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// -------------------------------------------------------------------
// GOOGLE DRIVE API OPERATIONS
// -------------------------------------------------------------------

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

// Find or create "Amarii Café Operations" dedicated folder on Google Drive
export async function getOrCreateAmariiFolder(token: string): Promise<string> {
  const folderName = 'Amarii Café Operations';
  const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  try {
    const listRes = await fetch(`${DRIVE_API_URL}?q=${encodeURIComponent(query)}&fields=files(id, name)`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (listRes.ok) {
      const data = await listRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // Create new folder if not found
    const createRes = await fetch(DRIVE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.warn('Could not create folder in root, returning default:', errText);
      return 'root';
    }

    const createdFolder = await createRes.json();
    return createdFolder.id;
  } catch (err) {
    console.error('Error fetching/creating Amarii Café Drive folder:', err);
    return 'root';
  }
}

// Upload file to Google Drive (PDFs, JSON, CSV, Images)
export async function uploadFileToGoogleDrive(
  token: string,
  fileName: string,
  mimeType: string,
  contentBlob: Blob | string,
  folderId?: string
): Promise<DriveFileItem> {
  let targetFolderId = folderId;
  if (!targetFolderId) {
    targetFolderId = await getOrCreateAmariiFolder(token);
  }

  const metadata = {
    name: fileName,
    mimeType,
    parents: targetFolderId ? [targetFolderId] : [],
  };

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );

  const fileBlob = typeof contentBlob === 'string'
    ? new Blob([contentBlob], { type: mimeType })
    : contentBlob;

  formData.append('file', fileBlob);

  const res = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Drive upload failed: ${res.status} - ${errorText}`);
  }

  const uploadedFile = await res.json();
  return uploadedFile;
}

// List files inside the Amarii Café Operations folder or drive root
export async function listGoogleDriveFiles(token: string, folderId?: string): Promise<DriveFileItem[]> {
  let query = "trashed = false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }

  const fields = 'files(id, name, mimeType, createdTime, modifiedTime, size, webViewLink, webContentLink, iconLink, thumbnailLink)';
  const res = await fetch(`${DRIVE_API_URL}?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=createdTime desc&pageSize=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to list Google Drive files: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  return data.files || [];
}

// Delete file from Google Drive with Mandatory User Confirmation Dialog Requirement
export async function deleteGoogleDriveFile(token: string, fileId: string, fileName: string): Promise<boolean> {
  // MANDATORY REQUIREMENT: Confirmation dialog before destructive operation
  const confirmed = window.confirm(
    `Are you sure you want to permanently delete "${fileName}" from Google Drive? This operation cannot be undone.`
  );
  if (!confirmed) return false;

  const res = await fetch(`${DRIVE_API_URL}/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 204) {
    const errorText = await res.text();
    throw new Error(`Failed to delete Google Drive file: ${res.status} - ${errorText}`);
  }

  return true;
}

// Backup full shift submission or checklist audit to Google Drive
export async function backupShiftToGoogleDrive(
  token: string,
  shiftData: any,
  pdfBlob?: Blob
): Promise<{ driveFileId: string; fileName: string; viewLink?: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const stationName = shiftData.department || 'Operations';
  const staffName = shiftData.staffName || 'Staff';

  // 1. Upload PDF if provided
  if (pdfBlob) {
    const pdfFileName = `Amarii_Shift_Report_${stationName}_${staffName}_${timestamp}.pdf`;
    const uploadedPdf = await uploadFileToGoogleDrive(
      token,
      pdfFileName,
      'application/pdf',
      pdfBlob
    );
    return {
      driveFileId: uploadedPdf.id,
      fileName: pdfFileName,
      viewLink: uploadedPdf.webViewLink,
    };
  }

  // 2. Otherwise upload formatted JSON backup
  const jsonFileName = `Amarii_Shift_Backup_${stationName}_${timestamp}.json`;
  const jsonBlob = new Blob([JSON.stringify(shiftData, null, 2)], { type: 'application/json' });
  const uploadedJson = await uploadFileToGoogleDrive(
    token,
    jsonFileName,
    'application/json',
    jsonBlob
  );

  return {
    driveFileId: uploadedJson.id,
    fileName: jsonFileName,
    viewLink: uploadedJson.webViewLink,
  };
}
