import React, { useState } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  Check,
  Calendar,
  AtSign,
  Info,
  Shield,
  Circle
} from 'lucide-react';
import { PublicUser } from '../types';
import { getAvatarGradient, getInitials } from '../utils/crypto';

interface UserProfileModalProps {
  user: PublicUser;
  onClose: () => void;
  onStartChat: (user: PublicUser) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  onClose,
  onStartChat,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(`@${user.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recently';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-[#17212b] border border-[#2b5278]/40 rounded-2xl shadow-2xl overflow-hidden text-white relative">
        
        {/* Top close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-gray-300 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero Avatar Header */}
        <div className="pt-8 pb-6 px-6 text-center bg-gradient-to-b from-[#1e2c3a] to-[#17212b] relative">
          <div className="relative inline-block mx-auto mb-3">
            <div
              className={`w-24 h-24 rounded-full bg-gradient-to-br ${getAvatarGradient(
                user.displayName || user.username
              )} flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-black/40 ring-4 ring-[#17212b]`}
            >
              {getInitials(user.firstName, user.lastName)}
            </div>

            {/* Online/Offline status pill */}
            <span
              className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-[#17212b] flex items-center justify-center ${
                user.status === 'online' ? 'bg-emerald-500' : 'bg-gray-500'
              }`}
              title={user.status === 'online' ? 'Online' : 'Offline'}
            />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white">
            {user.displayName || `${user.firstName} ${user.lastName}`}
          </h2>

          <div className="flex items-center justify-center gap-1.5 mt-1 text-sm text-sky-400 font-medium">
            <span>@{user.username}</span>
            <button
              onClick={handleCopyUsername}
              className="p-1 hover:text-sky-300 transition text-gray-400"
              title="Copy username"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
            <Circle className={`w-2 h-2 fill-current ${user.status === 'online' ? 'text-emerald-400' : 'text-gray-500'}`} />
            {user.status === 'online' ? 'Online' : 'last seen recently'}
          </p>
        </div>

        {/* User Details list */}
        <div className="px-6 py-4 space-y-3.5 border-t border-[#232e3c]">
          {/* Bio */}
          {user.bio && (
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-[#24A1DE] mt-1 shrink-0" />
              <div>
                <span className="block text-[11px] text-gray-400 uppercase tracking-wider">Bio</span>
                <p className="text-sm text-gray-200 leading-relaxed">{user.bio}</p>
              </div>
            </div>
          )}

          {/* Username */}
          <div className="flex items-center gap-3">
            <AtSign className="w-4 h-4 text-[#24A1DE] shrink-0" />
            <div className="flex-1">
              <span className="block text-[11px] text-gray-400 uppercase tracking-wider">Username</span>
              <p className="text-sm text-gray-200">@{user.username}</p>
            </div>
            <button
              onClick={handleCopyUsername}
              className="text-xs text-sky-400 hover:text-sky-300 transition"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Member since */}
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-[#24A1DE] shrink-0" />
            <div>
              <span className="block text-[11px] text-gray-400 uppercase tracking-wider">Joined</span>
              <p className="text-sm text-gray-200">{formattedDate}</p>
            </div>
          </div>
        </div>

        {/* Primary Action: Send Message */}
        <div className="p-6 pt-2">
          <button
            onClick={() => {
              onStartChat(user);
              onClose();
            }}
            className="w-full bg-[#24A1DE] hover:bg-[#1f93cc] active:bg-[#1a82b4] text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 transition cursor-pointer"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Send Message</span>
          </button>
        </div>
      </div>
    </div>
  );
};
