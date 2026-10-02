import React, { useEffect } from 'react';
import { Bell, MessageSquare, X } from 'lucide-react';
import { getAvatarGradient, getInitials } from '../utils/crypto';

export interface UnreadNotification {
  id: string;
  conversationId: string;
  senderName: string;
  senderUsername: string;
  text: string;
  type?: string;
}

interface NotificationToastProps {
  notification: UnreadNotification | null;
  onOpen: (conversationId: string) => void;
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onClose();
    }, 6000);

    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-3 fade-in duration-200">
      <div
        onClick={() => {
          onOpen(notification.conversationId);
          onClose();
        }}
        className="bg-[#1e2c3a] border border-[#2b5278] rounded-2xl shadow-2xl p-3.5 flex items-start gap-3 text-white cursor-pointer hover:bg-[#253748] transition group relative overflow-hidden"
      >
        {/* Telegram Accent Bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#24A1DE]" />

        {/* Sender Avatar */}
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(
            notification.senderName
          )} flex items-center justify-center font-bold text-xs text-white shrink-0 shadow`}
        >
          {getInitials(notification.senderName)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-bold text-white truncate">
              {notification.senderName}
            </span>
            <span className="text-[10px] text-sky-400 font-mono truncate">
              @{notification.senderUsername}
            </span>
          </div>

          <p className="text-xs text-gray-200 truncate leading-relaxed">
            {notification.text || (
              notification.type === 'image' ? '📷 Sent a photo' :
              notification.type === 'voice' ? '🎤 Sent a voice note' :
              notification.type === 'file' ? '📁 Sent a file' : 'New message'
            )}
          </p>

          <span className="text-[10px] text-[#24A1DE] font-semibold mt-1 inline-flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            <span>Tap to open chat</span>
          </span>
        </div>

        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-2.5 right-2.5 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
