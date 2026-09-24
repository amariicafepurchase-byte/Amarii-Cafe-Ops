import React from 'react';
import { X, Download, Play, Film, Image as ImageIcon } from 'lucide-react';
import { TaskMedia } from '../types';

interface MediaPreviewModalProps {
  media: TaskMedia | null;
  onClose: () => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({ media, onClose }) => {
  if (!media) return null;

  const urlStr = media.url || '';
  const nameStr = media.name || '';
  const isVideo =
    media.type === 'video' ||
    urlStr.startsWith('data:video') ||
    /\.(mp4|mov|webm|ogg)$/i.test(nameStr);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Media Preview"
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-zinc-950 border-4 border-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-zinc-900 border-b-2 border-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isVideo ? (
              <Film className="w-5 h-5 text-red-500 stroke-[2.5]" />
            ) : (
              <ImageIcon className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
            )}
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase text-white tracking-tight truncate max-w-xs sm:max-w-md">
                {media.name || (isVideo ? 'Video Attachment' : 'Photo Attachment')}
              </h3>
              <p className="text-[10px] font-mono font-bold uppercase text-zinc-400">
                Uploaded: {new Date(media.uploadedAt).toLocaleString()} {media.size ? `• ${media.size}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={media.url}
              download={media.name || `amarii-ops-attachment-${Date.now()}`}
              className="p-2 bg-zinc-800 hover:bg-white hover:text-black text-white text-xs font-black uppercase transition border border-zinc-700 flex items-center gap-1.5 cursor-pointer"
              title="Download File"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-white text-black hover:bg-zinc-200 transition font-black cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Media Container */}
        <div className="flex-1 bg-black flex items-center justify-center p-2 sm:p-6 overflow-auto min-h-[300px]">
          {isVideo ? (
            <video
              src={media.url}
              controls
              autoPlay
              className="max-h-[70vh] max-w-full object-contain rounded border border-zinc-800"
            >
              Your browser does not support HTML5 video.
            </video>
          ) : (
            <img
              src={media.url}
              alt={media.name || 'Task attachment photo'}
              className="max-h-[70vh] max-w-full object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
};
