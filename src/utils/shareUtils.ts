/**
 * Utility functions for sharing checklist completion updates.
 * Generates an exact styled PDF of the submitted audit form and shares it
 * via Native Web Share API (with files array on mobile) or auto-downloads
 * on desktop with WhatsApp link and clipboard sync.
 */

import { TaskItem } from '../types';
import { generateChecklistAuditPdf, GeneratedChecklistPdf } from './checklistPdfGenerator';

export interface ShareChecklistParams {
  checklistName: string;
  staffName?: string;
  timeStr?: string;
  department?: string;
  tasks?: TaskItem[];
  outletName?: string;
  onStatusUpdate?: (status: string) => void;
}

export interface ShareResult {
  method: 'web_share_file' | 'web_share_text' | 'download_and_whatsapp' | 'cancelled';
  message: string;
  success: boolean;
  filename?: string;
  notice: string;
}

/**
 * Formats the exact message required:
 * '✅ [Parent Checklist Name] completed by [Staff Name] at [Time]. Status: Submitted.'
 */
export function formatChecklistShareMessage(
  checklistName: string,
  staffName: string = 'Staff',
  timeStr?: string
): string {
  const cleanChecklist = checklistName || 'Live Shift Checklist';
  const cleanStaff = staffName || 'Staff';
  const cleanTime =
    timeStr ||
    new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  return `✅ ${cleanChecklist} completed by ${cleanStaff} at ${cleanTime}. Status: Submitted.`;
}

/**
 * Shares the checklist update:
 * 1. Awaits client-side PDF Blob generation
 * 2. Mobile: Converts Blob to File and calls navigator.share({ files: [pdfFile], text: message })
 * 3. Desktop/Fallback: Creates temporary <a> tag with URL.createObjectURL(blob) to force download,
 *    copies formatted text to clipboard, and prompts the user with toast: 'PDF Downloaded! Please attach it in WhatsApp.'
 */
export async function shareChecklistUpdate(
  params: ShareChecklistParams
): Promise<ShareResult> {
  const message = formatChecklistShareMessage(
    params.checklistName,
    params.staffName,
    params.timeStr
  );

  let pdfResult: GeneratedChecklistPdf | null = null;

  // 1. Silent client-side PDF Blob generation
  try {
    if (params.onStatusUpdate) {
      params.onStatusUpdate('Generating audit PDF...');
    }

    pdfResult = await generateChecklistAuditPdf({
      checklistHeader: params.checklistName,
      department: params.department || 'Operations',
      submittedBy: params.staffName || 'Staff',
      submittedAt: params.timeStr,
      outletName: params.outletName || 'Amarii Café & Roastery',
      tasks: params.tasks || [],
    });
  } catch (pdfErr) {
    console.warn('[Share] PDF generation error:', pdfErr);
  }

  // 2. Native File Share (Supported on mobile devices)
  if (
    typeof navigator !== 'undefined' &&
    navigator.share &&
    pdfResult &&
    pdfResult.file
  ) {
    const canShareFiles =
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [pdfResult.file] });

    if (canShareFiles) {
      try {
        if (params.onStatusUpdate) {
          params.onStatusUpdate('Opening share dialog...');
        }
        await navigator.share({
          title: `${params.checklistName} Submitted`,
          text: message,
          files: [pdfResult.file],
        });

        return {
          method: 'web_share_file',
          message,
          success: true,
          filename: pdfResult.filename,
          notice: '✓ PDF checklist shared directly to WhatsApp!',
        };
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return {
            method: 'cancelled',
            message,
            success: false,
            notice: 'Share cancelled.',
          };
        }
        console.warn('[Share] Native file share failed, proceeding to download fallback:', err);
      }
    }
  }

  // 3. CRITICAL FALLBACK (Desktop / WhatsApp Web): Force Download via <a> tag with URL.createObjectURL(blob)
  const fallbackNotice = 'PDF Downloaded! Text copied. Please attach it in WhatsApp.';

  if (pdfResult && pdfResult.blob) {
    try {
      const url = URL.createObjectURL(pdfResult.blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = pdfResult.filename || `${params.checklistName.replace(/\s+/g, '_')}_Audit.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (downloadErr) {
      console.warn('[Share] Direct blob download failed, trying doc fallback:', downloadErr);
      if (pdfResult.download) pdfResult.download();
    }
  }

  // Simultaneously copy text summary to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(message);
    } catch (clipErr) {
      console.warn('[Share] Clipboard copy warning:', clipErr);
    }
  }

  // Open WhatsApp with text prefilled
  try {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
    const opened = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      const link = document.createElement('a');
      link.href = whatsappUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (waErr) {
    console.warn('[Share] WhatsApp link trigger warning:', waErr);
  }

  return {
    method: 'download_and_whatsapp',
    message,
    success: true,
    filename: pdfResult?.filename,
    notice: fallbackNotice,
  };
}
