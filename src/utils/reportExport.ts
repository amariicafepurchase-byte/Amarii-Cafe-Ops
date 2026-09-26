import jsPDF from 'jspdf';
import { TaskItem, StaffMember, DEFAULT_OUTLET } from '../types';

export type ReportType = 'detailed' | 'normal';

export interface ReportExportOptions {
  title?: string;
  outlet?: string;
  managerName?: string;
  notes?: string;
  stationFilter?: string;
  staffList?: StaffMember[];
  filterStatus?: 'all' | 'completed' | 'remaining';
  reportType?: ReportType;
  isHemenDas?: boolean;
}

// Format date helper
const getFormattedDate = () => {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getFormattedTime = () => {
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const getTimestampSlug = () => {
  const now = new Date();
  const d = now.toISOString().slice(0, 10);
  const t = `${now.getHours()}${now.getMinutes()}`;
  return `${d}_${t}`;
};

// ================= 1. PROFESSIONAL PDF REPORT =================
export const exportReportAsPdf = async (
  tasks: TaskItem[],
  options: ReportExportOptions = {}
): Promise<void> => {
  const {
    outlet = DEFAULT_OUTLET,
    managerName = 'Hemen Das (Owner & General Manager)',
    stationFilter = 'All Stations',
    notes = '',
    reportType = 'normal',
    isHemenDas = false,
  } = options;

  const isDetailed = reportType === 'detailed' && isHemenDas;
  const reportTitle = isDetailed
    ? 'Amarii Café Master Detailed Audit & Operations Report'
    : 'Amarii Café Daily Shift Operations Summary Report';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  const completedTasks = tasks.filter((t) => t.completed);
  const pendingTasks = tasks.filter((t) => !t.completed);
  const urgentTasks = tasks.filter((t) => t.priority === 'urgent');
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  let currentY = margin;

  // Header Banner - Deep Forest Green
  doc.setFillColor(22, 40, 30);
  doc.rect(margin, currentY, contentWidth, 26, 'F');

  // Cafe Brand Title
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text('AMARII CAFÉ & ROASTERY', margin + 6, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(218, 203, 169); // Warm Gold
  doc.text(reportTitle.toUpperCase(), margin + 6, currentY + 14);

  doc.setFontSize(7.5);
  doc.setTextColor(200, 200, 200);
  doc.text(
    `DATE: ${getFormattedDate().toUpperCase()} | TIME: ${getFormattedTime()} | BRANCH: ${outlet.toUpperCase()}`,
    margin + 6,
    currentY + 20
  );

  // Status Stamp on Right Header
  doc.setFillColor(isDetailed ? 185 : 224, isDetailed ? 28 : 90, isDetailed ? 28 : 71);
  doc.rect(pageWidth - margin - 38, currentY + 4, 34, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text(isDetailed ? '👑 HEMEN AUDIT' : 'MGMT SUMMARY', pageWidth - margin - 21, currentY + 10, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${completionRate}% DONE`, pageWidth - margin - 21, currentY + 17, { align: 'center' });

  currentY += 30;

  // KPI Metrics Summary Card
  doc.setFillColor(248, 246, 240);
  doc.rect(margin, currentY, contentWidth, 18, 'F');
  doc.setDrawColor(215, 210, 195);
  doc.rect(margin, currentY, contentWidth, 18, 'S');

  const colW = contentWidth / 4;
  const kpiData = [
    { label: 'TOTAL TASKS', val: `${totalTasks}`, sub: `${stationFilter}` },
    { label: 'COMPLETED', val: `${completedTasks.length}`, sub: `${completionRate}% completed` },
    { label: 'PENDING', val: `${pendingTasks.length}`, sub: 'Tasks remaining' },
    { label: 'URGENT ITEMS', val: `${urgentTasks.length}`, sub: `${urgentTasks.filter((t) => t.completed).length} resolved` },
  ];

  kpiData.forEach((kpi, idx) => {
    const kpiX = margin + idx * colW;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 115, 100);
    doc.text(kpi.label, kpiX + 4, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(22, 40, 30);
    doc.text(kpi.val, kpiX + 4, currentY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(140, 135, 120);
    doc.text(kpi.sub, kpiX + 4, currentY + 15);

    if (idx < 3) {
      doc.setDrawColor(220, 215, 205);
      doc.line(kpiX + colW, currentY + 2, kpiX + colW, currentY + 16);
    }
  });

  currentY += 22;

  // Notes section if present
  if (notes.trim()) {
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, currentY, contentWidth, 12, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(margin, currentY, contentWidth, 12, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(55, 65, 81);
    doc.text('SHIFT NOTES & SUPERVISOR INSTRUCTIONS:', margin + 3, currentY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(75, 85, 99);
    doc.text(notes.slice(0, 180), margin + 3, currentY + 9);
    currentY += 15;
  }

  // Section Header: Tasks Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 40, 30);
  doc.text(isDetailed ? 'DETAILED MASTER AUDIT LOG (CONFIDENTIAL - HEMEN DAS ONLY)' : 'SHIFT TASKS SUMMARY', margin, currentY + 4);
  currentY += 6;

  // Table Header
  doc.setFillColor(36, 67, 50);
  doc.rect(margin, currentY, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('STATUS', margin + 3, currentY + 4.2);
  doc.text(isDetailed ? 'TASK & AUDIT DETAILS' : 'TASK TITLE', margin + 26, currentY + 4.2);
  doc.text('DEPT', margin + 110, currentY + 4.2);
  doc.text('PRIORITY', margin + 135, currentY + 4.2);
  doc.text(isDetailed ? 'APPROVAL / ASSIGNEE' : 'ASSIGNEE', margin + 155, currentY + 4.2);
  currentY += 7;

  // Render Rows
  tasks.forEach((task, idx) => {
    // Check page overflow
    if (currentY > pageHeight - 22) {
      doc.addPage();
      currentY = margin;
      doc.setFillColor(36, 67, 50);
      doc.rect(margin, currentY, contentWidth, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text('STATUS', margin + 3, currentY + 4.2);
      doc.text(isDetailed ? 'TASK & AUDIT DETAILS' : 'TASK TITLE', margin + 26, currentY + 4.2);
      doc.text('DEPT', margin + 110, currentY + 4.2);
      doc.text('PRIORITY', margin + 135, currentY + 4.2);
      doc.text(isDetailed ? 'APPROVAL / ASSIGNEE' : 'ASSIGNEE', margin + 155, currentY + 4.2);
      currentY += 7;
    }

    const rowHeight = isDetailed && (task.approvalStatus || task.notes || task.rejectionReason) ? 10 : 7;
    const rowBg = idx % 2 === 0 ? 255 : 249;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, currentY + rowHeight, margin + contentWidth, currentY + rowHeight);

    // Status Badge
    if (task.completed) {
      doc.setFillColor(16, 185, 129); // Green
      doc.rect(margin + 2, currentY + 1.2, 18, 4.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text('✓ DONE', margin + 11, currentY + 4.3, { align: 'center' });
    } else {
      doc.setFillColor(239, 68, 68); // Red
      doc.rect(margin + 2, currentY + 1.2, 18, 4.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text('PENDING', margin + 11, currentY + 4.3, { align: 'center' });
    }

    // Task Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 30, 30);
    const cleanTitle = (task.title || '').slice(0, 48);
    doc.text(cleanTitle, margin + 26, currentY + 4.5);

    // Detailed Audit info if in detailed mode
    if (isDetailed && rowHeight > 7) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 100, 100);
      const auditMeta = [];
      if (task.notes) auditMeta.push(`Note: ${task.notes.slice(0, 30)}`);
      if (task.approvalStatus === 'approved') auditMeta.push('✓ Approved by Hemen Das');
      if (task.rejectionReason) auditMeta.push(`Rejection: ${task.rejectionReason.slice(0, 25)}`);
      if (auditMeta.length > 0) {
        doc.text(auditMeta.join(' | '), margin + 26, currentY + 8.5);
      }
    }

    // Dept
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(80, 80, 80);
    doc.text((task.department || 'General').slice(0, 14), margin + 110, currentY + 4.5);

    // Priority
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    if (task.priority === 'urgent') {
      doc.setTextColor(220, 38, 38);
      doc.text('URGENT', margin + 135, currentY + 4.5);
    } else if (task.priority === 'pending') {
      doc.setTextColor(217, 119, 6);
      doc.text('PENDING', margin + 135, currentY + 4.5);
    } else {
      doc.setTextColor(75, 85, 99);
      doc.text('ROUTINE', margin + 135, currentY + 4.5);
    }

    // Assignee / Approver
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(60, 60, 60);
    const assigneeStr = (task.assignee || task.completedBy || 'Shift Staff').slice(0, 22);
    doc.text(assigneeStr, margin + 155, currentY + 4.5);

    currentY += rowHeight + 0.5;
  });

  // Footer / Sign-off section
  if (currentY > pageHeight - 25) {
    doc.addPage();
    currentY = margin;
  }

  currentY += 6;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`Authorized by: ${managerName}`, margin, currentY);
  doc.text(`Amarii AI Operations ${isDetailed ? 'Master Detailed Audit' : 'Management Shift Summary'} | Outlet: ${outlet}`, margin, currentY + 4);
  doc.text(`Page ${doc.getNumberOfPages()}`, margin + contentWidth, currentY, { align: 'right' });

  // Trigger Instant Browser Download
  const prefix = isDetailed ? 'Amarii_Detailed_Audit_Hemen' : 'Amarii_Shift_Summary';
  const filename = `${prefix}_${getTimestampSlug()}.pdf`;
  doc.save(filename);
};

// ================= 2. PROFESSIONAL EXCEL (.XLS) SPREADSHEET =================
export const exportReportAsExcel = (
  tasks: TaskItem[],
  options: ReportExportOptions = {}
): void => {
  const {
    outlet = DEFAULT_OUTLET,
    managerName = 'Hemen Das',
    stationFilter = 'All Stations',
    reportType = 'normal',
    isHemenDas = false,
  } = options;

  const isDetailed = reportType === 'detailed' && isHemenDas;
  const reportTitle = isDetailed
    ? 'AMARII CAFÉ MASTER DETAILED OPERATIONS & AUDIT REPORT'
    : 'AMARII CAFÉ DAILY SHIFT OPERATIONS SUMMARY REPORT';

  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = tasks.filter((t) => !t.completed).length;
  const totalCount = tasks.length;
  const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>${reportTitle}</Title>
  <Author>${managerName}</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderBrand">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="15" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#16281E" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="HeaderSub">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#DACBA9"/>
   <Interior ss:Color="#16281E" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KpiTitle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#555555"/>
   <Interior ss:Color="#F4F6F2" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
   </Borders>
  </Style>
  <Style ss:ID="KpiVal">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#16281E"/>
   <Interior ss:Color="#F4F6F2" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
   </Borders>
  </Style>
  <Style ss:ID="ColHeader">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#244332" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#111F17"/>
   </Borders>
  </Style>
  <Style ss:ID="DoneCell">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#065F46"/>
   <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
  <Style ss:ID="PendingCell">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#991B1B"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
  <Style ss:ID="UrgentText">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#DC2626"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCell">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1F2937"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Shift Report">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="70"/>
   <Column ss:Width="240"/>
   <Column ss:Width="110"/>
   <Column ss:Width="90"/>
   <Column ss:Width="100"/>
   <Column ss:Width="130"/>
   <Column ss:Width="110"/>
   <Column ss:Width="150"/>
   ${isDetailed ? '<Column ss:Width="130"/><Column ss:Width="130"/>' : ''}

   <!-- Brand Header -->
   <Row ss:Height="30">
    <Cell ss:MergeAcross="${isDetailed ? 9 : 7}" ss:StyleID="HeaderBrand"><Data ss:Type="String">${reportTitle}</Data></Cell>
   </Row>

   <!-- Subtitle & Meta -->
   <Row ss:Height="20">
    <Cell ss:MergeAcross="${isDetailed ? 9 : 7}" ss:StyleID="HeaderSub"><Data ss:Type="String">Date: ${getFormattedDate()} | Time: ${getFormattedTime()} | Outlet: ${outlet} | Access: ${isDetailed ? '👑 HEMEN DAS EXCLUSIVE' : 'MANAGEMENT LEVEL'}</Data></Cell>
   </Row>

   <!-- Spacing -->
   <Row ss:Height="10"/>

   <!-- KPI Titles -->
   <Row ss:Height="18">
    <Cell ss:MergeAcross="1" ss:StyleID="KpiTitle"><Data ss:Type="String">TOTAL TASKS</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="KpiTitle"><Data ss:Type="String">COMPLETED</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="KpiTitle"><Data ss:Type="String">PENDING</Data></Cell>
    <Cell ss:MergeAcross="${isDetailed ? 3 : 1}" ss:StyleID="KpiTitle"><Data ss:Type="String">COMPLETION RATE</Data></Cell>
   </Row>

   <!-- KPI Values -->
   <Row ss:Height="24">
    <Cell ss:MergeAcross="1" ss:StyleID="KpiVal"><Data ss:Type="Number">${totalCount}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="KpiVal"><Data ss:Type="Number">${completedCount}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="KpiVal"><Data ss:Type="Number">${pendingCount}</Data></Cell>
    <Cell ss:MergeAcross="${isDetailed ? 3 : 1}" ss:StyleID="KpiVal"><Data ss:Type="String">${rate}%</Data></Cell>
   </Row>

   <!-- Spacing -->
   <Row ss:Height="14"/>

   <!-- Table Columns Header -->
   <Row ss:Height="24">
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Status</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Task Title</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Department</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Priority</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Checklist</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Assignee</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Completed At</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Notes &amp; Proofs</Data></Cell>
    ${isDetailed ? '<Cell ss:StyleID="ColHeader"><Data ss:Type="String">Hemen Approval</Data></Cell><Cell ss:StyleID="ColHeader"><Data ss:Type="String">Audit Verification</Data></Cell>' : ''}
   </Row>

   <!-- Task Data Rows -->
   ${tasks
     .map((t) => {
       const isDone = Boolean(t.completed);
       const statusStyle = isDone ? 'DoneCell' : 'PendingCell';
       const statusLabel = isDone ? 'COMPLETED' : 'PENDING';
       const priorityStyle = t.priority === 'urgent' ? 'UrgentText' : 'DataCell';
       const titleEsc = (t.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
       const deptEsc = (t.department || 'General').replace(/&/g, '&amp;');
       const chkEsc = (t.checklistHeader || '-').replace(/&/g, '&amp;');
       const assigneeEsc = (t.assignee || t.completedBy || 'Unassigned').replace(/&/g, '&amp;');
       const compAt = t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
       const notesEsc = (t.notes || t.details || '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
       const approvalEsc = t.approvalStatus === 'approved' ? 'APPROVED BY HEMEN' : t.approvalStatus === 'rejected' ? `REJECTED: ${t.rejectionReason || ''}` : 'Pending';
       const auditEsc = t.isPhotoMandatory || t.isVideoMandatory ? 'Photo/Video Required' : 'Standard';

       return `<Row ss:Height="20">
    <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${statusLabel}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${titleEsc}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${deptEsc}</Data></Cell>
    <Cell ss:StyleID="${priorityStyle}"><Data ss:Type="String">${t.priority ? t.priority.toUpperCase() : 'ROUTINE'}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${chkEsc}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${assigneeEsc}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${compAt}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${notesEsc}</Data></Cell>
    ${isDetailed ? `<Cell ss:StyleID="DataCell"><Data ss:Type="String">${approvalEsc}</Data></Cell><Cell ss:StyleID="DataCell"><Data ss:Type="String">${auditEsc}</Data></Cell>` : ''}
   </Row>`;
     })
     .join('\n')}

  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const prefix = isDetailed ? 'Amarii_Detailed_Report_Hemen' : 'Amarii_Shift_Summary';
  a.download = `${prefix}_${getTimestampSlug()}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ================= 3. PROFESSIONAL WORD DOCUMENT (.DOC) =================
export const exportReportAsDoc = (
  tasks: TaskItem[],
  options: ReportExportOptions = {}
): void => {
  const {
    outlet = DEFAULT_OUTLET,
    managerName = 'Hemen Das',
    stationFilter = 'All Stations',
    notes = '',
    reportType = 'normal',
    isHemenDas = false,
  } = options;

  const isDetailed = reportType === 'detailed' && isHemenDas;
  const reportTitle = isDetailed
    ? 'AMARII CAFÉ MASTER DETAILED OPERATIONS & AUDIT REPORT'
    : 'AMARII CAFÉ DAILY SHIFT OPERATIONS SUMMARY REPORT';

  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = tasks.filter((t) => !t.completed).length;
  const totalCount = tasks.length;
  const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const htmlContent = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>${reportTitle}</title>
<style>
  body {
    font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    color: #111827;
    margin: 20px;
  }
  .header-card {
    background-color: #16281E;
    color: #FFFFFF;
    padding: 24px;
    border-radius: 6px;
    margin-bottom: 20px;
  }
  .header-title {
    font-size: 22pt;
    font-weight: bold;
    color: #FFFFFF;
    margin: 0;
    letter-spacing: 1px;
  }
  .header-subtitle {
    font-size: 13pt;
    color: #DACBA9;
    margin: 6px 0 0 0;
    font-weight: 600;
  }
  .header-meta {
    font-size: 9pt;
    color: #E5E7EB;
    margin-top: 10px;
    border-top: 1px solid #244332;
    padding-top: 8px;
  }
  .badge-tier {
    display: inline-block;
    padding: 4px 10px;
    background-color: ${isDetailed ? '#DC2626' : '#059669'};
    color: #FFFFFF;
    font-weight: bold;
    font-size: 8.5pt;
    border-radius: 3px;
    margin-top: 6px;
  }
  .kpi-container {
    display: table;
    width: 100%;
    margin-bottom: 20px;
  }
  .kpi-box {
    display: table-cell;
    width: 25%;
    padding: 12px;
    background-color: #F8F6F0;
    border: 1px solid #D7D2C3;
    text-align: center;
  }
  .kpi-label {
    font-size: 9pt;
    font-weight: bold;
    color: #6B7280;
    text-transform: uppercase;
  }
  .kpi-value {
    font-size: 20pt;
    font-weight: bold;
    color: #16281E;
    margin: 4px 0;
  }
  .kpi-sub {
    font-size: 8pt;
    color: #9CA3AF;
  }
  .section-title {
    font-size: 14pt;
    font-weight: bold;
    color: #16281E;
    margin-top: 20px;
    margin-bottom: 10px;
    border-bottom: 2px solid #16281E;
    padding-bottom: 4px;
  }
  table.audit-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    font-size: 10pt;
  }
  table.audit-table th {
    background-color: #244332;
    color: #FFFFFF;
    text-align: left;
    padding: 8px;
    font-size: 9.5pt;
    font-weight: bold;
    border: 1px solid #111F17;
  }
  table.audit-table td {
    padding: 8px;
    border: 1px solid #E5E7EB;
    vertical-align: top;
  }
  tr:nth-child(even) td {
    background-color: #F9FAFB;
  }
  .badge-done {
    display: inline-block;
    padding: 3px 8px;
    background-color: #D1FAE5;
    color: #065F46;
    font-weight: bold;
    border-radius: 4px;
    font-size: 8.5pt;
  }
  .badge-pending {
    display: inline-block;
    padding: 3px 8px;
    background-color: #FEE2E2;
    color: #991B1B;
    font-weight: bold;
    border-radius: 4px;
    font-size: 8.5pt;
  }
  .urgent-text {
    color: #DC2626;
    font-weight: bold;
  }
  .footer {
    margin-top: 30px;
    border-top: 1px solid #D1D5DB;
    padding-top: 10px;
    font-size: 9pt;
    color: #6B7280;
  }
</style>
</head>
<body>

<div class="header-card">
  <div class="header-title">AMARII CAFÉ &amp; ROASTERY</div>
  <div class="header-subtitle">${reportTitle}</div>
  <div class="badge-tier">${isDetailed ? '👑 CONFIDENTIAL MASTER AUDIT - HEMEN DAS EXCLUSIVE' : 'MANAGEMENT SHIFT SUMMARY REPORT'}</div>
  <div class="header-meta">
    <strong>Date:</strong> ${getFormattedDate()} &nbsp;|&nbsp;
    <strong>Time:</strong> ${getFormattedTime()} &nbsp;|&nbsp;
    <strong>Outlet Branch:</strong> ${outlet} &nbsp;|&nbsp;
    <strong>Station:</strong> ${stationFilter}
  </div>
</div>

<div class="kpi-container">
  <div class="kpi-box">
    <div class="kpi-label">Total Tasks</div>
    <div class="kpi-value">${totalCount}</div>
    <div class="kpi-sub">Shift Target</div>
  </div>
  <div class="kpi-box">
    <div class="kpi-label">Completed</div>
    <div class="kpi-value" style="color: #059669;">${completedCount}</div>
    <div class="kpi-sub">${rate}% of tasks</div>
  </div>
  <div class="kpi-box">
    <div class="kpi-label">Pending</div>
    <div class="kpi-value" style="color: #DC2626;">${pendingCount}</div>
    <div class="kpi-sub">Action required</div>
  </div>
  <div class="kpi-box">
    <div class="kpi-label">Shift Status</div>
    <div class="kpi-value">${rate >= 80 ? 'EXCELLENT' : rate >= 50 ? 'IN PROGRESS' : 'ATTENTION'}</div>
    <div class="kpi-sub">${rate}% audited</div>
  </div>
</div>

${notes.trim() ? `
<div style="background-color: #F3F4F6; padding: 12px; border-left: 4px solid #16281E; margin-bottom: 20px;">
  <strong>Shift Notes:</strong> ${notes}
</div>
` : ''}

<div class="section-title">${isDetailed ? 'Confidential Task & Quality Audit Breakdown' : 'Daily Operations Task Status'}</div>

<table class="audit-table">
  <thead>
    <tr>
      <th style="width: 12%;">Status</th>
      <th style="width: 36%;">Task Title &amp; Details</th>
      <th style="width: 14%;">Department</th>
      <th style="width: 12%;">Priority</th>
      <th style="width: ${isDetailed ? '26%' : '26%'};">${isDetailed ? 'Sign-off & Approval' : 'Assignee'}</th>
    </tr>
  </thead>
  <tbody>
    ${tasks
      .map((t) => {
        const isDone = Boolean(t.completed);
        const statusBadge = isDone
          ? '<span class="badge-done">✓ COMPLETED</span>'
          : '<span class="badge-pending">PENDING</span>';
        const prioText =
          t.priority === 'urgent'
            ? '<span class="urgent-text">URGENT</span>'
            : t.priority === 'pending'
            ? '<span style="color: #D97706; font-weight: bold;">PENDING</span>'
            : 'ROUTINE';
        return `
      <tr>
        <td>${statusBadge}</td>
        <td>
          <strong>${t.title}</strong>
          ${t.checklistHeader ? `<br><small style="color: #6B7280;">Checklist: ${t.checklistHeader}</small>` : ''}
          ${t.notes ? `<br><small style="color: #4B5563;">Note: ${t.notes}</small>` : ''}
          ${isDetailed && t.approvalStatus === 'approved' ? '<br><small style="color: #059669; font-weight: bold;">✓ Approved by Hemen Das</small>' : ''}
          ${isDetailed && t.rejectionReason ? `<br><small style="color: #DC2626; font-weight: bold;">❌ Rejection: ${t.rejectionReason}</small>` : ''}
        </td>
        <td>${t.department || 'General'}</td>
        <td>${prioText}</td>
        <td>
          ${t.assignee || t.completedBy || 'Shift Staff'}
          ${t.completedAt ? `<br><small style="color: #059669;">Done: ${new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>` : ''}
        </td>
      </tr>`;
      })
      .join('')}
  </tbody>
</table>

<div class="footer">
  <p><strong>Approved / Certified By:</strong> ${managerName}</p>
  <p>Amarii Café Operations Management &bull; Official Digital Record &bull; Generated on ${new Date().toLocaleString()}</p>
</div>

</body>
</html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const prefix = isDetailed ? 'Amarii_Detailed_Report_Hemen' : 'Amarii_Shift_Summary';
  a.download = `${prefix}_${getTimestampSlug()}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
