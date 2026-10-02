import React, { useState, useEffect } from 'react';
import {
  Search,
  User,
  LogOut,
  X,
  MessageSquare,
  CheckCheck,
  Check,
  Circle,
  Sparkles,
  Camera,
  Mic,
  FileText
} from 'lucide-react';
import { Conversation, PublicUser } from '../types';
import { getAvatarGradient, getInitials } from '../utils/crypto';
import { searchUsers } from '../services/userService';

interface ChatListProps {
  currentUser: { userId: string; username: string; firstName: string; lastName: string; displayName: string; avatarUrl?: string };
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onSelectUserForChat: (user: PublicUser) => void;
  onViewUserProfile: (user: PublicUser) => void;
  onLogout: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  currentUser,
  conversations,
  activeConversationId,
  onSelectConversation,
  onSelectUserForChat,
  onViewUserProfile,
  onLogout,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Debounced search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchUsers(q, currentUser.userId);
        setSearchResults(results);
      } catch (e) {
        console.error('Search error', e);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser.userId]);

  // Format message time
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-[#17212b] border-r border-[#232e3c] text-white select-none">
      
      {/* Top Header */}
      <div className="p-3.5 pb-2.5 flex items-center justify-between border-b border-[#232e3c]/60">
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#24A1DE] to-[#1e88e5] flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-transparent hover:ring-[#24A1DE] transition"
              title="Your Account"
            >
              {getInitials(currentUser.firstName, currentUser.lastName)}
            </button>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#17212b]" />

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute left-0 mt-2 w-56 bg-[#1f2b38] border border-[#2e3e50] rounded-xl shadow-2xl py-2 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-[#2b3c4f]">
                    <p className="font-semibold text-white truncate">{currentUser.displayName}</p>
                    <p className="text-sky-400 font-mono mt-0.5 truncate">@{currentUser.username}</p>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onViewUserProfile({
                        userId: currentUser.userId,
                        username: currentUser.username,
                        firstName: currentUser.firstName,
                        lastName: currentUser.lastName,
                        displayName: currentUser.displayName,
                        status: 'online',
                        lastSeen: new Date().toISOString(),
                        createdAt: '',
                      });
                    }}
                    className="w-full text-left px-3 py-2 text-gray-200 hover:bg-[#253545] flex items-center gap-2 transition"
                  >
                    <User className="w-3.5 h-3.5 text-[#24A1DE]" />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 text-rose-400 hover:bg-[#253545] flex items-center gap-2 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <div>
            <h1 className="font-bold text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
              <span>TeleChat</span>
              <span className="text-[10px] uppercase tracking-wider bg-sky-500/20 text-[#24A1DE] px-1.5 py-0.5 rounded font-medium">
                Live
              </span>
            </h1>
            <p className="text-[11px] text-gray-400 font-mono">@{currentUser.username}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-[#232e3c] transition"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Telegram Search Bar */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search @username or name..."
            className="w-full bg-[#0e1621] border border-[#232e3c] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#24A1DE] focus:ring-1 focus:ring-[#24A1DE] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Search Results OR Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#232e3c]/40 scrollbar-thin">
        {searchQuery.trim() ? (
          <div>
            <div className="px-3 py-1.5 bg-[#1e2a38]/60 text-[11px] font-semibold text-sky-400 uppercase tracking-wider flex items-center justify-between">
              <span>Search Results</span>
              {isSearching && (
                <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {searchResults.length === 0 && !isSearching ? (
              <div className="p-6 text-center text-gray-400 text-xs">
                <p>No users found matching &quot;{searchQuery}&quot;</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Try typing the exact @username handle.
                </p>
              </div>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.userId}
                  className="p-3 flex items-center gap-3 hover:bg-[#202b36] transition cursor-pointer group"
                >
                  <div
                    onClick={() => onViewUserProfile(user)}
                    className="relative cursor-pointer shrink-0"
                    title="Click to view profile"
                  >
                    <div
                      className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarGradient(
                        user.displayName
                      )} flex items-center justify-center font-bold text-sm text-white shadow`}
                    >
                      {getInitials(user.firstName, user.lastName)}
                    </div>
                    {user.status === 'online' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#17212b]" />
                    )}
                  </div>

                  <div
                    className="flex-1 min-w-0"
                    onClick={() => {
                      onViewUserProfile(user);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-white truncate">
                        {user.displayName}
                      </p>
                    </div>
                    <p className="text-[11px] text-sky-400 font-mono truncate">
                      @{user.username}
                    </p>
                    {user.bio && (
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{user.bio}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onSelectUserForChat(user)}
                      className="px-2.5 py-1.5 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white rounded-lg text-xs font-medium transition flex items-center gap-1 shadow-sm"
                      title="Chat now"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-full bg-[#202c38] flex items-center justify-center mb-3 text-sky-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="font-semibold text-white text-sm">No Chats Yet</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
              Search for any user using their <b>@username</b> handle above to view their profile and start chatting!
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const otherUserId = conv.participantIds.find((id) => id !== currentUser.userId);
            const otherUser = otherUserId ? conv.participants[otherUserId] : null;
            const isActive = conv.id === activeConversationId;
            const unreadCount = conv.unreadCounts ? conv.unreadCounts[currentUser.userId] || 0 : 0;
            const lastMsg = conv.lastMessage;

            if (!otherUser) return null;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`p-3 flex items-center gap-3 cursor-pointer transition relative ${
                  isActive
                    ? 'bg-[#2b5278] text-white'
                    : 'hover:bg-[#202b36] text-gray-200'
                }`}
              >
                {/* Avatar */}
                <div
                  className="relative shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewUserProfile({
                      userId: otherUser.userId,
                      username: otherUser.username,
                      firstName: otherUser.firstName,
                      lastName: otherUser.lastName,
                      displayName: otherUser.displayName,
                      status: otherUser.status || 'offline',
                      lastSeen: otherUser.lastSeen || '',
                      createdAt: '',
                    });
                  }}
                  title="View Profile"
                >
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarGradient(
                      otherUser.displayName
                    )} flex items-center justify-center font-bold text-sm text-white shadow`}
                  >
                    {getInitials(otherUser.firstName, otherUser.lastName)}
                  </div>
                  {otherUser.status === 'online' && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#17212b]" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-semibold truncate text-white">
                      {otherUser.displayName}
                    </p>
                    <span className={`text-[10px] shrink-0 ${isActive ? 'text-sky-200' : 'text-gray-400'}`}>
                      {formatTime(lastMsg?.timestamp || conv.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] truncate text-gray-400">
                      {lastMsg ? (
                        <>
                          {lastMsg.senderId === currentUser.userId && (
                            otherUserId && conv.unreadCounts && (conv.unreadCounts[otherUserId] === 0 || !conv.unreadCounts[otherUserId]) ? (
                              <span className="flex items-center gap-0.5 text-sky-400 font-semibold text-[10px] shrink-0">
                                <CheckCheck className="w-3 h-3" />
                                <span>Seen</span>
                              </span>
                            ) : (
                              <Check className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            )
                          )}
                          <span className="truncate">
                            {lastMsg.text || (
                              lastMsg.type === 'image' ? '📷 Photo' :
                              lastMsg.type === 'voice' ? '🎤 Voice note' :
                              lastMsg.type === 'file' ? '📁 File' : 'Message'
                            )}
                          </span>
                        </>
                      ) : (
                        <span className="italic text-gray-500">Tap to start conversation</span>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <span className="ml-2 shrink-0 px-1.5 py-0.5 min-w-[18px] text-center text-[10px] font-bold rounded-full bg-[#24A1DE] text-white">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
