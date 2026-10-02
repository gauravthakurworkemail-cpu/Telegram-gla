import React from 'react';
import { X, Download } from 'lucide-react';

interface MediaViewerModalProps {
  mediaUrl: string;
  mediaName?: string;
  caption?: string;
  onClose: () => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  mediaUrl,
  mediaName,
  caption,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150">
      {/* Top action buttons */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <a
          href={mediaUrl}
          download={mediaName || 'telechat-media.jpg'}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 text-xs"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download</span>
        </a>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-4xl max-h-[85vh] flex flex-col items-center justify-center p-2">
        <img
          src={mediaUrl}
          alt={mediaName || 'Attached image'}
          className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-2xl"
        />
        {caption && (
          <p className="mt-3 text-sm text-gray-200 bg-black/60 px-4 py-2 rounded-xl backdrop-blur-sm max-w-lg text-center">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
};
