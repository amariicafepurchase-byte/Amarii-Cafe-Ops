/**
 * Professional Operational Audit PDF Generator for Amarii Café & Roastery.
 * Formats checklist records into dense, standard audit reports (like PeakScale / SafetyCulture).
 * Uses clean text badges [ DONE ] / [ NOT DONE ], bulleted sub-tasks, embedded photo proofs,
 * and zero broken glyphs or text truncation.
 */

import jsPDF from 'jspdf';
import { TaskItem } from '../types';

export interface ChecklistPdfOptions {
  checklistHeader: string;
  department?: string;
  submittedBy?: string;
  submittedAt?: string;
  outletName?: string;
  tasks: TaskItem[];
}

export interface GeneratedChecklistPdf {
  blob: Blob;
  file: File;
  filename: string;
  download: () => void;
}

/**
 * Converts an image URL or data URI to Base64 JPEG for jsPDF embedding.
 */
async function getBase64Image(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;

  return new Promise((resolve) => {
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        console.warn('[PDF Generator] Image conversion skipped:', e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Generates a dense, professional audit PDF report.
 */
export async function generateChecklistAuditPdf(
  options: ChecklistPdfOptions
): Promise<GeneratedChecklistPdf> {
  const {
    checklistHeader,
    department = 'General Operations',
    submittedBy = 'Shift Staff',
    submittedAt,
    outletName = 'Amarii Café & Roastery',
    tasks = [],
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  const dateObj = submittedAt ? new Date(submittedAt) : new Date();
  const formattedDate = dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const isoDateStr = dateObj.toISOString().split('T')[0];
  const cleanHeader = checklistHeader.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
  const filename = `${cleanHeader}_${isoDateStr}.pdf`;

  let currentY = margin;

  const drawHeader = (pageNumber: number) => {
    // 1. Top Deep Green Brand Header Bar
    doc.setFillColor(22, 40, 30); // Amarii Deep Forest Green (#16281E)
    doc.rect(margin, currentY, contentWidth, 12, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('AMARII CAFÉ & ROASTERY', margin + 4, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(218, 203, 169); // Warm Gold (#DACBA9)
    doc.text(`OPERATIONAL AUDIT REPORT • ${outletName.toUpperCase()}`, margin + 4, currentY + 9.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(`PAGE ${pageNumber}`, margin + contentWidth - 16, currentY + 7);

    currentY += 13.5;

    // 2. Metadata Grid Table (Only on Page 1)
    if (pageNumber === 1) {
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, currentY, contentWidth, 18, 'F');
      doc.setDrawColor(220, 224, 230);
      doc.rect(margin, currentY, contentWidth, 18, 'S');

      // Row 1: Checklist Title & Score
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(22, 40, 30);
      doc.text(checklistHeader.toUpperCase(), margin + 3, currentY + 5);

      // Score Badge in Header
      const scoreBadgeText = `${completedCount}/${totalCount} COMPLETED (${percentage}%)`;
      doc.setFillColor(percentage === 100 ? 22 : 180, percentage === 100 ? 101 : 83, percentage === 100 ? 52 : 9);
      doc.rect(margin + contentWidth - 48, currentY + 1.5, 45, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text(scoreBadgeText, margin + contentWidth - 25.5, currentY + 5, { align: 'center' });

      // Divider inside metadata
      doc.setDrawColor(230, 233, 238);
      doc.line(margin + 3, currentY + 7.5, margin + contentWidth - 3, currentY + 7.5);

      // Row 2: Metadata Fields
      doc.setFontSize(7);
      doc.setTextColor(90, 90, 90);

      // Col 1: Staff
      doc.setFont('helvetica', 'bold');
      doc.text('Audited By:', margin + 3, currentY + 12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 20);
      doc.text(submittedBy, margin + 18, currentY + 12);

      // Col 2: Department
      doc.setTextColor(90, 90, 90);
      doc.setFont('helvetica', 'bold');
      doc.text('Department:', margin + 55, currentY + 12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 20);
      doc.text(department, margin + 72, currentY + 12);

      // Col 3: Date & Time
      doc.setTextColor(90, 90, 90);
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', margin + 110, currentY + 12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 20);
      doc.text(formattedDate, margin + 118, currentY + 12);

      doc.setTextColor(90, 90, 90);
      doc.setFont('helvetica', 'bold');
      doc.text('Time:', margin + 148, currentY + 12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 20);
      doc.text(formattedTime, margin + 156, currentY + 12);

      // Col 4: Audit Clearance
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(percentage === 100 ? 16 : 180, percentage === 100 ? 120 : 83, percentage === 100 ? 60 : 9);
      doc.text(`RESULT: ${percentage === 100 ? 'PASSED / 100% AUDIT' : 'REVIEW REQUIRED'}`, margin + 3, currentY + 16);

      currentY += 20;
    }

    // Table Header Row for Questions
    doc.setFillColor(235, 238, 242);
    doc.rect(margin, currentY, contentWidth, 5.5, 'F');
    doc.setDrawColor(200, 205, 212);
    doc.rect(margin, currentY, contentWidth, 5.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(60, 64, 70);
    doc.text('#', margin + 3, currentY + 3.8);
    doc.text('AUDIT ITEM / TASK DESCRIPTION', margin + 10, currentY + 3.8);
    doc.text('STATUS', margin + contentWidth - 28, currentY + 3.8);

    currentY += 6.5;
  };

  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 12) {
      doc.addPage();
      currentY = margin;
      drawHeader(doc.getNumberOfPages());
    }
  };

  // Draw Page 1 Header
  drawHeader(1);

  // 3. Render Each Question Row (Compact, dense table format)
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const isDone = Boolean(task.completed);
    const subTasks = task.subTasks || [];
    const media = task.media || [];
    const photoMedia = media.filter((m) => m.type === 'photo');
    const hasNote = Boolean(task.notes && task.notes.trim());

    // Compute title wrapping
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const titleLines = doc.splitTextToSize(task.title.toUpperCase(), contentWidth - 45);

    let detailsLines: string[] = [];
    if (task.details && task.details !== task.title) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      detailsLines = doc.splitTextToSize(task.details, contentWidth - 45);
    }

    // Dynamic height calculation
    let rowHeight = 7 + titleLines.length * 3.4;
    if (detailsLines.length > 0) {
      rowHeight += detailsLines.length * 3 + 1;
    }
    if (subTasks.length > 0) {
      rowHeight += 4 + subTasks.length * 3.2;
    }
    if (photoMedia.length > 0) {
      rowHeight += 18; // Embedded photos row
    }
    if (hasNote) {
      rowHeight += 6.5;
    }

    ensureSpace(rowHeight);

    const rowStartY = currentY;

    // Alternate row background for clean ledger reading
    if (i % 2 === 1) {
      doc.setFillColor(252, 253, 254);
      doc.rect(margin, rowStartY, contentWidth, rowHeight, 'F');
    }

    // Row border
    doc.setDrawColor(228, 231, 236);
    doc.rect(margin, rowStartY, contentWidth, rowHeight, 'S');

    // Left indicator bar (Green for DONE, Red/Amber for NOT DONE)
    doc.setFillColor(isDone ? 22 : 220, isDone ? 163 : 38, isDone ? 74 : 38);
    doc.rect(margin, rowStartY, 1.5, rowHeight, 'F');

    let textY = rowStartY + 4.2;

    // Item Number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 95, 105);
    doc.text(`${i + 1}`, margin + 3.5, textY);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 24, 30);
    doc.text(titleLines, margin + 9, textY);

    // Clean Text Badge: [ DONE ] or [ NOT DONE ] (Replaces broken HTML inputs)
    const badgeWidth = 24;
    const badgeHeight = 4.5;
    const badgeX = margin + contentWidth - badgeWidth - 2;
    const badgeY = rowStartY + 2.5;

    if (isDone) {
      doc.setFillColor(22, 163, 74); // Vibrant Green (#16a34a)
      doc.rect(badgeX, badgeY, badgeWidth, badgeHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text('[ DONE ]', badgeX + badgeWidth / 2, badgeY + 3.2, { align: 'center' });
    } else {
      doc.setFillColor(220, 38, 38); // Red (#dc2626)
      doc.rect(badgeX, badgeY, badgeWidth, badgeHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text('[ NOT DONE ]', badgeX + badgeWidth / 2, badgeY + 3.2, { align: 'center' });
    }

    textY += titleLines.length * 3.4;

    // Tags (PHOTO REQ, URGENT)
    if (task.isPhotoMandatory || task.priority === 'urgent') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      let tagX = margin + 9;

      if (task.isPhotoMandatory) {
        doc.setFillColor(254, 243, 199); // Amber-100
        doc.rect(tagX, textY - 2.5, 18, 3.5, 'F');
        doc.setDrawColor(217, 119, 6);
        doc.rect(tagX, textY - 2.5, 18, 3.5, 'S');
        doc.setTextColor(180, 83, 9);
        doc.text('PHOTO REQ', tagX + 2, textY);
        tagX += 20;
      }

      if (task.priority === 'urgent') {
        doc.setFillColor(254, 226, 226); // Red-100
        doc.rect(tagX, textY - 2.5, 14, 3.5, 'F');
        doc.setDrawColor(220, 38, 38);
        doc.rect(tagX, textY - 2.5, 14, 3.5, 'S');
        doc.setTextColor(185, 28, 28);
        doc.text('URGENT', tagX + 2, textY);
      }
      textY += 3.5;
    }

    // Details text
    if (detailsLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 105, 115);
      doc.text(detailsLines, margin + 9, textY);
      textY += detailsLines.length * 3;
    }

    // Sub-Tasks (Clean ASCII bullet list with status)
    if (subTasks.length > 0) {
      textY += 0.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(80, 85, 95);
      const doneSubs = subTasks.filter((s) => s.isDone).length;
      doc.text(`Sub-Tasks (${doneSubs}/${subTasks.length} Done):`, margin + 9, textY);
      textY += 3;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      for (const sub of subTasks) {
        if (sub.isDone) {
          doc.setTextColor(22, 101, 52); // Green
          doc.text(`• [Done] ${sub.title}`, margin + 12, textY);
        } else {
          doc.setTextColor(130, 135, 145); // Grey
          doc.text(`• [Pending] ${sub.title}`, margin + 12, textY);
        }
        textY += 3;
      }
    }

    // Embedded Photo Proofs
    if (photoMedia.length > 0) {
      textY += 0.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(22, 101, 52);
      doc.text(`Attached Proofs (${photoMedia.length}):`, margin + 9, textY);
      textY += 2;

      let photoX = margin + 9;
      const pW = 20;
      const pH = 14;

      for (let p = 0; p < Math.min(photoMedia.length, 5); p++) {
        const photo = photoMedia[p];
        try {
          const base64 = await getBase64Image(photo.url);
          if (base64) {
            doc.addImage(base64, 'JPEG', photoX, textY, pW, pH);
            doc.setDrawColor(180, 185, 195);
            doc.rect(photoX, textY, pW, pH, 'S');
          } else {
            doc.setFillColor(240, 242, 245);
            doc.rect(photoX, textY, pW, pH, 'F');
            doc.setFontSize(5.5);
            doc.setTextColor(120, 125, 135);
            doc.text('Photo Proof', photoX + 2, textY + 7);
          }
        } catch {
          // skip image
        }
        photoX += pW + 2.5;
      }
      textY += pH + 1;
    }

    // Observation Note
    if (hasNote) {
      textY += 0.5;
      doc.setFillColor(254, 252, 232); // Amber-50
      doc.rect(margin + 9, textY - 2.5, contentWidth - 36, 5, 'F');
      doc.setDrawColor(253, 230, 138);
      doc.rect(margin + 9, textY - 2.5, contentWidth - 36, 5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(180, 83, 9);
      doc.text('Note:', margin + 11, textY + 0.8);

      doc.setFont('helvetica', 'italic');
      doc.setTextColor(50, 50, 50);
      const noteCut = doc.splitTextToSize(`"${task.notes}"`, contentWidth - 55);
      doc.text(noteCut[0] || '', margin + 20, textY + 0.8);
    }

    currentY += rowHeight + 1.5;
  }

  // 4. Sign-Off Box on Last Page
  ensureSpace(20);
  doc.setFillColor(248, 249, 250);
  doc.rect(margin, currentY, contentWidth, 18, 'F');
  doc.setDrawColor(215, 220, 228);
  doc.rect(margin, currentY, contentWidth, 18, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 35, 45);
  doc.text('MANAGEMENT AUDIT VERIFICATION & CLEARANCE', margin + 3, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(90, 95, 105);
  doc.text('Duty Supervisor / Manager:', margin + 3, currentY + 9.5);
  doc.line(margin + 36, currentY + 9.5, margin + 85, currentY + 9.5);

  doc.text('Audit Signature:', margin + 3, currentY + 15);
  doc.line(margin + 24, currentY + 15, margin + 85, currentY + 15);

  // Digital Clearance Stamp
  doc.setDrawColor(22, 40, 30);
  doc.rect(margin + contentWidth - 44, currentY + 2.5, 41, 13, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(22, 40, 30);
  doc.text('AMARII AUDIT CLEARANCE', margin + contentWidth - 23.5, currentY + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text(`REF: AMC-${Date.now().toString(36).toUpperCase()}`, margin + contentWidth - 23.5, currentY + 9.5, { align: 'center' });
  doc.text(`TIME: ${formattedDate} ${formattedTime}`, margin + contentWidth - 23.5, currentY + 13, { align: 'center' });

  // 5. Bottom Page Numbers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(140, 145, 155);
    doc.text(
      `Amarii Café Operations Audit Ledger  •  Page ${p} of ${totalPages}  •  ${checklistHeader}`,
      pageWidth / 2,
      pageHeight - 4,
      { align: 'center' }
    );
  }

  // Create Blob & Native File
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  return {
    blob,
    file,
    filename,
    download: () => {
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } catch {
        doc.save(filename);
      }
    },
  };
}
