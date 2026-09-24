import jsPDF from 'jspdf';
import { TaskItem, TaskDepartment, StaffMember } from '../types';

interface PdfReportOptions {
  tasks: TaskItem[];
  staffList?: StaffMember[];
  stationFilter?: string;
  managerName?: string;
  shiftDate?: string;
  dateTimeRangeLabel?: string;
  notes?: string;
  includeMediaThumbnails?: boolean;
}

// Helper to safely load and convert image URL to base64 for jsPDF
const getBase64ImageFromUrl = async (imgUrl: string): Promise<string | null> => {
  if (!imgUrl) return null;
  if (imgUrl.startsWith('data:image')) {
    return imgUrl;
  }
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
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataURL);
      } catch (err) {
        console.warn('Canvas export tainted or failed:', err);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imgUrl;
  });
};

export const generateCompletedTasksPdf = async ({
  tasks,
  staffList = [],
  stationFilter = 'All Stations',
  managerName = 'Operations Manager',
  shiftDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }),
  dateTimeRangeLabel,
  notes = '',
  includeMediaThumbnails = true,
}: PdfReportOptions): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Filter completed tasks
  const completedTasks = tasks.filter((t) => t.completed);
  const totalScheduled = tasks.length;
  const completionRate = totalScheduled > 0 ? Math.round((completedTasks.length / totalScheduled) * 100) : 0;
  const urgentCompleted = completedTasks.filter((t) => t.priority === 'urgent').length;
  const photoProofCount = completedTasks.reduce(
    (acc, t) => acc + (t.media ? t.media.filter((m) => m.type === 'photo').length : 0),
    0
  );
  const videoProofCount = completedTasks.reduce(
    (acc, t) => acc + (t.media ? t.media.filter((m) => m.type === 'video').length : 0),
    0
  );

  let currentY = margin;

  // Header Banner
  doc.setFillColor(22, 40, 30); // Deep Forest Green (#16281E - Amarii Theme)
  doc.rect(margin, currentY, contentWidth, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('AMARII CAFÉ & ROASTERY', margin + 6, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(218, 203, 169); // Warm Gold (#DACBA9)
  doc.text('DAILY OPERATIONS AUDIT & COMPLETED TASKS RECORD', margin + 6, currentY + 15);
  const rangeSub = dateTimeRangeLabel ? ` | RANGE: ${dateTimeRangeLabel.toUpperCase()}` : '';
  doc.text(`DATE: ${shiftDate.toUpperCase()} | STATION: ${stationFilter.toUpperCase()}${rangeSub}`, margin + 6, currentY + 20);

  // Status Stamp on Right
  doc.setFillColor(224, 90, 71); // Accent Red (#E05A47)
  doc.rect(pageWidth - margin - 36, currentY + 4, 32, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('OFFICIAL AUDIT', pageWidth - margin - 20, currentY + 10, { align: 'center' });
  doc.text(`${completionRate}% DONE`, pageWidth - margin - 20, currentY + 16, { align: 'center' });

  currentY += 28;

  // Executive KPI Summary Grid
  doc.setFillColor(248, 246, 240); // Soft Warm Ivory (#F8F6F0)
  doc.rect(margin, currentY, contentWidth, 20, 'F');
  doc.setDrawColor(215, 210, 195);
  doc.rect(margin, currentY, contentWidth, 20, 'S');

  const colWidth = contentWidth / 4;

  const kpis = [
    { label: 'COMPLETED TASKS', value: `${completedTasks.length} / ${totalScheduled}`, sub: `${completionRate}% of target` },
    { label: 'URGENT RESOLVED', value: `${urgentCompleted}`, sub: 'Priority items cleared' },
    { label: 'PHOTO PROOFS', value: `${photoProofCount}`, sub: 'Visual verifications' },
    { label: 'VIDEO AUDITS', value: `${videoProofCount}`, sub: 'Recorded proofs' },
  ];

  kpis.forEach((kpi, index) => {
    const kpiX = margin + index * colWidth;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(120, 115, 100);
    doc.text(kpi.label, kpiX + 4, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(22, 40, 30);
    doc.text(kpi.value, kpiX + 4, currentY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(140, 135, 120);
    doc.text(kpi.sub, kpiX + 4, currentY + 17);

    if (index < 3) {
      doc.setDrawColor(220, 215, 205);
      doc.line(kpiX + colWidth, currentY + 2, kpiX + colWidth, currentY + 18);
    }
  });

  currentY += 25;

  // Management & Supervisor Context Line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text(`Report Prepared By: ${managerName}  |  Generated: ${new Date().toLocaleTimeString()}`, margin, currentY);
  if (notes) {
    currentY += 4;
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(90, 80, 70);
    doc.text(`Manager Notes: "${notes}"`, margin, currentY);
  }

  currentY += 6;

  // Completed Tasks Section Header
  doc.setFillColor(36, 67, 50); // Muted Emerald
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`VERIFIED COMPLETED TASKS (${completedTasks.length} TOTAL)`, margin + 4, currentY + 5);

  currentY += 10;

  if (completedTasks.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text('No tasks marked as completed for this shift yet.', margin + 4, currentY + 8);
    currentY += 20;
  }

  // Render Completed Tasks
  for (let i = 0; i < completedTasks.length; i++) {
    const task = completedTasks[i];

    // Estimated height of this task item block
    const hasPhotos = includeMediaThumbnails && task.media && task.media.some((m) => m.type === 'photo');
    const photoMedia = hasPhotos ? task.media?.filter((m) => m.type === 'photo') : [];
    const blockHeight = hasPhotos ? 36 : 19;

    // Check if new page is required
    if (currentY + blockHeight > pageHeight - 25) {
      doc.addPage();
      currentY = margin;

      // Repeat Page Header
      doc.setFillColor(22, 40, 30);
      doc.rect(margin, currentY, contentWidth, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`AMARII CAFÉ AUDIT REPORT - COMPLETED TASKS (CONTINUED)`, margin + 4, currentY + 5.5);
      currentY += 12;
    }

    // Task Item Box
    doc.setFillColor(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 249, i % 2 === 0 ? 255 : 245);
    doc.rect(margin, currentY, contentWidth, blockHeight - 2, 'F');
    doc.setDrawColor(225, 220, 210);
    doc.rect(margin, currentY, contentWidth, blockHeight - 2, 'S');

    // Priority marker line
    if (task.priority === 'urgent') {
      doc.setFillColor(224, 90, 71);
    } else if (task.priority === 'today') {
      doc.setFillColor(46, 117, 89);
    } else {
      doc.setFillColor(150, 150, 150);
    }
    doc.rect(margin, currentY, 2.5, blockHeight - 2, 'F');

    // Task Title & Checkmark
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(`[✓] ${task.title}`, margin + 5, currentY + 5.5);

    // Meta: Department, Assignee, Completion Timestamp
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    const dept = task.department || 'General';
    const assignee = task.assignee || 'Assigned Staff';
    const completedAtText = task.completedAt
      ? new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Done';

    doc.text(`Dept: ${dept}   |   Assignee: ${assignee}   |   Completed: ${completedAtText}`, margin + 5, currentY + 10);

    // Notes if present
    if (task.notes) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(80, 80, 80);
      const truncatedNotes = task.notes.length > 80 ? `${task.notes.substring(0, 80)}...` : task.notes;
      doc.text(`Note: "${truncatedNotes}"`, margin + 5, currentY + 14);
    }

    // Media Proofs & Thumbnails
    if (task.media && task.media.length > 0) {
      let mediaX = margin + 5;
      const mediaY = currentY + (task.notes ? 16 : 13);

      for (let mIdx = 0; mIdx < Math.min(task.media.length, 3); mIdx++) {
        const item = task.media[mIdx];
        if (item.type === 'photo' && includeMediaThumbnails && item.url) {
          try {
            const base64 = await getBase64ImageFromUrl(item.url);
            if (base64) {
              const thumbW = 16;
              const thumbH = 14;
              doc.addImage(base64, 'JPEG', mediaX, mediaY, thumbW, thumbH);
              doc.setDrawColor(20, 20, 20);
              doc.rect(mediaX, mediaY, thumbW, thumbH, 'S');

              // Small label
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(5);
              doc.setTextColor(80, 80, 80);
              doc.text(`Photo #${mIdx + 1}`, mediaX + 1, mediaY + thumbH + 2.5);

              mediaX += thumbW + 4;
            } else {
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6.5);
              doc.setTextColor(36, 67, 50);
              doc.text(`[Photo Proof: ${item.name || 'Verified'}]`, mediaX, mediaY + 4);
              mediaX += 35;
            }
          } catch (e) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(36, 67, 50);
            doc.text(`[Photo Proof Attached]`, mediaX, mediaY + 4);
            mediaX += 30;
          }
        } else if (item.type === 'video') {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(224, 90, 71);
          doc.text(`[Video Proof: ${item.name || 'Recorded'}]`, mediaX, mediaY + 4);
          mediaX += 38;
        }
      }
    }

    currentY += blockHeight;
  }

  // Management Sign-Off & Verification Footer
  if (currentY + 32 > pageHeight - 15) {
    doc.addPage();
    currentY = margin;
  } else {
    currentY += 4;
  }

  doc.setFillColor(242, 240, 235);
  doc.rect(margin, currentY, contentWidth, 24, 'F');
  doc.setDrawColor(200, 195, 185);
  doc.rect(margin, currentY, contentWidth, 24, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  doc.text('MANAGEMENT VERIFICATION & AUDIT SIGN-OFF', margin + 4, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  doc.text('Shift Supervisor / Duty Manager:', margin + 4, currentY + 11);
  doc.line(margin + 48, currentY + 11, margin + 105, currentY + 11);

  doc.text('Clearance Signature:', margin + 4, currentY + 18);
  doc.line(margin + 36, currentY + 18, margin + 105, currentY + 18);

  // Official Stamp Box
  doc.setDrawColor(22, 40, 30);
  doc.rect(pageWidth - margin - 45, currentY + 3, 40, 18, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(22, 40, 30);
  doc.text('AMARII CAFE & ROASTERY', pageWidth - margin - 25, currentY + 8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('DAILY AUDIT CLEARANCE', pageWidth - margin - 25, currentY + 12, { align: 'center' });
  doc.text(`REF: AMC-${Date.now().toString(36).toUpperCase()}`, pageWidth - margin - 25, currentY + 16, { align: 'center' });

  // Page Numbers
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Amarii Café Operations Audit  •  Page ${p} of ${totalPages}  •  Strictly for Internal Management Record-Keeping`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  // Trigger download
  const cleanDate = new Date().toISOString().split('T')[0];
  const filename = `Amarii_Completed_Tasks_Report_${cleanDate}.pdf`;
  doc.save(filename);
};
