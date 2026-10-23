import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Share2,
  X,
  Calendar,
  User,
  MapPin,
  ClipboardCheck,
  ImageIcon,
  FileText,
  Loader2,
  Check,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { TaskItem, ShiftRecord } from '../types';
import { generateChecklistAuditPdf } from '../utils/checklistPdfGenerator';
import { shareChecklistUpdate } from '../utils/shareUtils';
import { useTheme } from '../context/ThemeContext';

export interface SubmissionSuccessData {
  checklistName: string;
  station: string;
  filledBy: string;
  timestamp: string;
  yesCount: number;
  noCount: number;
  photosCount: number;
  tasks: TaskItem[];
  outletName?: string;
}

interface SubmissionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SubmissionSuccessData | null;
}

export const SubmissionSuccessModal: React.FC<SubmissionSuccessModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const { isLightMode } = useTheme();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  if (!isOpen || !data) return null;

  const {
    checklistName,
    station,
    filledBy,
    timestamp,
    yesCount,
    noCount,
    photosCount,
    tasks = [],
    outletName = 'Amarii Café Kothrud',
  } = data;

  const totalTasks = tasks.length || (yesCount + noCount);
  const completionPercentage = totalTasks > 0 ? Math.round((yesCount / totalTasks) * 100) : 100;

  const dateObj = new Date(timestamp);
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

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setFeedbackNotice('Generating PDF summary report...');
    try {
      const pdfResult = await generateChecklistAuditPdf({
        checklistHeader: checklistName,
        department: station,
        submittedBy: filledBy,
        submittedAt: timestamp,
        outletName: outletName,
        tasks: tasks,
      });

      pdfResult.download();
      setFeedbackNotice('✓ PDF Downloaded successfully!');
      setTimeout(() => setFeedbackNotice(null), 4000);
    } catch (err) {
      console.error('PDF generation error:', err);
      setFeedbackNotice('Failed to generate PDF report.');
      setTimeout(() => setFeedbackNotice(null), 4000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    setIsSharingWhatsApp(true);
    setFeedbackNotice('Preparing WhatsApp share update...');
    try {
      const formattedMessage = `*AMARII CAFÉ — SHIFT SIGN-OFF REPORT*\n\n📋 *Checklist:* ${checklistName}\n📍 *Station:* ${station}\n👤 *Filled By:* ${filledBy}\n🏢 *Outlet:* ${outletName}\n⏰ *Time:* ${formattedDate} at ${formattedTime}\n\n✅ *Yes (Done):* ${yesCount}\n❌ *No (Incomplete):* ${noCount}\n📸 *Photo Attachments:* ${photosCount}\n📊 *Completion Score:* ${completionPercentage}%\n\nStatus: *Submitted & Finalized*`;

      const res = await shareChecklistUpdate({
        checklistName,
        staffName: filledBy,
        timeStr: formattedTime,
        department: station,
        tasks,
        outletName,
      });

      if (res.success) {
        setFeedbackNotice(res.notice || '✓ WhatsApp share link opened!');
      } else {
        // Fallback direct WhatsApp Web URL
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(formattedMessage)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        setFeedbackNotice('✓ Opened WhatsApp with shift summary text!');
      }
      setTimeout(() => setFeedbackNotice(null), 5000);
    } catch (err) {
      console.error('WhatsApp share error:', err);
      const formattedMessage = `*AMARII CAFÉ — SHIFT SIGN-OFF REPORT*\n📋 ${checklistName}\n👤 Filled By: ${filledBy}\n⏰ ${formattedDate} ${formattedTime}\nStatus: Submitted.`;
      window.open(`https://wa.me/?text=${encodeURIComponent(formattedMessage)}`, '_blank');
      setFeedbackNotice('Opened WhatsApp link.');
      setTimeout(() => setFeedbackNotice(null), 4000);
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submission-success-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
    >
      <div
        className={`relative w-full max-w-lg overflow-hidden rounded-xl border-2 sm:border-4 shadow-2xl animate-in zoom-in-95 duration-200 ${
          isLightMode
            ? 'bg-white text-zinc-950 border-emerald-600'
            : 'bg-zinc-950 text-zinc-100 border-emerald-500'
        }`}
      >
        {/* Success Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-5 text-center relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-lg animate-bounce">
            <CheckCircle2 className="w-9 h-9 stroke-[3]" />
          </div>

          <h2
            id="submission-success-modal-title"
            className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white"
          >
            Checklist Submitted Successfully!
          </h2>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-100 mt-1">
            Recorded in Amarii Café Master Audit Register
          </p>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackNotice && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold rounded text-center animate-in fade-in">
            {feedbackNotice}
          </div>
        )}

        {/* Modal Content Summary Grid */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Main Info Card */}
          <div
            className={`p-4 rounded-lg border space-y-3 ${
              isLightMode
                ? 'bg-zinc-50 border-zinc-200'
                : 'bg-zinc-900/80 border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-2 border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>{checklistName}</span>
              </span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-emerald-600 text-white rounded">
                {completionPercentage}% DONE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase text-zinc-500 font-bold block">Outlet</span>
                  <span className="font-bold truncate">{outletName}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-zinc-400 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase text-zinc-500 font-bold block">Station</span>
                  <span className="font-bold">{station}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-zinc-400 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase text-zinc-500 font-bold block">Filled By</span>
                  <span className="font-bold">{filledBy}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase text-zinc-500 font-bold block">Submitted At</span>
                  <span className="font-bold font-mono">{formattedTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Badges Row */}
          <div className="grid grid-cols-3 gap-2">
            {/* Yes Count */}
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                YES (DONE)
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {yesCount}
              </span>
            </div>

            {/* No Count */}
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-700 dark:text-red-300 block">
                NO (PENDING)
              </span>
              <span className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">
                {noCount}
              </span>
            </div>

            {/* Photos Count */}
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-800 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 block">
                PHOTOS
              </span>
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
                {photosCount}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {/* Download PDF Button */}
            <button
              type="button"
              id="submission-success-download-pdf-btn"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="w-full py-3 px-4 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition cursor-pointer flex items-center justify-center gap-2 min-h-[44px] active:scale-98"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Audit PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Download PDF Report</span>
                </>
              )}
            </button>

            {/* Share to WhatsApp Button */}
            <button
              type="button"
              id="submission-success-share-whatsapp-btn"
              onClick={handleShareWhatsApp}
              disabled={isSharingWhatsApp}
              className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition cursor-pointer flex items-center justify-center gap-2 min-h-[44px] active:scale-98"
            >
              {isSharingWhatsApp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Opening WhatsApp...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Share to WhatsApp</span>
                </>
              )}
            </button>

            {/* Done / Close Button */}
            <button
              type="button"
              id="submission-success-done-btn"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-bold uppercase tracking-wider rounded-lg transition cursor-pointer"
            >
              Done & Return to Checklists
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
