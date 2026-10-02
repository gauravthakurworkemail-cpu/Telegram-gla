import React, { useState, useEffect } from 'react';
import {
  Send,
  MessageSquare,
  Sparkles,
  Shield,
  Search,
  Users
} from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { ChatList } from './components/ChatList';
import { ChatArea } from './components/ChatArea';
import { UserProfileModal } from './components/UserProfileModal';
import { MediaViewerModal } from './components/MediaViewerModal';
import { Conversation, PublicUser, UserProfile } from './types';
import { clearSessionUser, getSessionUser, saveSessionUser } from './utils/crypto';
import {
  getOrCreateConversation,
  listenToConversations,
} from './services/chatService';
import { updateUserStatus } from './services/userService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Modals state
  const [inspectedUser, setInspectedUser] = useState<PublicUser | null>(null);
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    name?: string;
    caption?: string;
  } | null>(null);

  // Restore stored session on mount
  useEffect(() => {
    const saved = getSessionUser();
    if (saved) {
      setCurrentUser({
        ...saved,
        passwordHash: '',
        passwordSalt: '',
        status: 'online',
        lastSeen: new Date().toISOString(),
        createdAt: '',
      });
      updateUserStatus(saved.userId, 'online');
    }
  }, []);

  // Listen to conversations for current user
  useEffect(() => {
    if (!currentUser) {
      setConversations([]);
      return;
    }

    const unsubscribe = listenToConversations(currentUser.userId, (convs) => {
      setConversations(convs);
    });

    // Window presence handlers
    const handleBeforeUnload = () => {
      if (currentUser?.userId) {
        updateUserStatus(currentUser.userId, 'offline');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  // Handle successful login or registration
  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    saveSessionUser(user);
  };

  // Handle logout
  const handleLogout = () => {
    if (currentUser?.userId) {
      updateUserStatus(currentUser.userId, 'offline');
    }
    clearSessionUser();
    setCurrentUser(null);
    setActiveConversationId(null);
  };

  // Start chat with user (from search or profile modal)
  const handleStartChatWithUser = async (targetUser: PublicUser) => {
    if (!currentUser) return;
    try {
      const conv = await getOrCreateConversation(currentUser, targetUser);
      setActiveConversationId(conv.id);
      setInspectedUser(null);
    } catch (e) {
      console.error('Failed to start chat', e);
    }
  };

  // Active conversation object
  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0e1621] text-white font-sans antialiased">
      
      {/* Auth Modal if user not logged in */}
      {!currentUser && <AuthModal onSuccess={handleAuthSuccess} />}

      {/* Main Messenger Layout */}
      {currentUser && (
        <div className="flex w-full h-full">
          
          {/* Left Column: Chat List & Search (Hidden on mobile if chat is open) */}
          <div
            className={`w-full md:w-80 lg:w-96 shrink-0 h-full ${
              activeConversationId ? 'hidden md:block' : 'block'
            }`}
          >
            <ChatList
              currentUser={currentUser}
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={(id) => setActiveConversationId(id)}
              onSelectUserForChat={handleStartChatWithUser}
              onViewUserProfile={(user) => setInspectedUser(user)}
              onLogout={handleLogout}
            />
          </div>

          {/* Right Column: Active Chat Area OR Empty Placeholder */}
          <div
            className={`flex-1 h-full ${
              !activeConversationId ? 'hidden md:flex' : 'flex'
            } flex-col`}
          >
            {activeConversation ? (
              <ChatArea
                currentUser={currentUser}
                conversation={activeConversation}
                onBack={() => setActiveConversationId(null)}
                onViewProfile={(user) => setInspectedUser(user)}
                onOpenMedia={(url, name, caption) =>
                  setMediaPreview({ url, name, caption })
                }
              />
            ) : (
              // Empty Desktop Placeholder (Classic Telegram Pattern)
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0e1621] select-none">
                <div className="w-24 h-24 rounded-full bg-[#17212b] border border-[#232e3c] flex items-center justify-center mb-5 text-[#24A1DE] shadow-xl shadow-sky-950/20">
                  <Send className="w-12 h-12 -rotate-12 translate-x-1" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Welcome to TeleChat, {currentUser.firstName}!
                </h2>
                <p className="text-gray-400 text-sm mt-2 max-w-sm leading-relaxed">
                  Search any username handle (e.g. <span className="text-sky-400 font-mono">@username</span>) in the search bar on the left to inspect their profile and begin real-time messaging.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <span className="px-3 py-1.5 rounded-full bg-[#17212b] border border-[#232e3c] text-xs text-gray-300 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-[#24A1DE]" />
                    <span>Instant Handle Search</span>
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-[#17212b] border border-[#232e3c] text-xs text-gray-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Photo, Audio & Voice Notes</span>
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-[#17212b] border border-[#232e3c] text-xs text-gray-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Protected Cloud Firestore</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Profile Modal when a user is searched or profile clicked */}
      {inspectedUser && (
        <UserProfileModal
          user={inspectedUser}
          onClose={() => setInspectedUser(null)}
          onStartChat={handleStartChatWithUser}
        />
      )}

      {/* Full-screen Media Viewer */}
      {mediaPreview && (
        <MediaViewerModal
          mediaUrl={mediaPreview.url}
          mediaName={mediaPreview.name}
          caption={mediaPreview.caption}
          onClose={() => setMediaPreview(null)}
        />
      )}
    </div>
  );
}
