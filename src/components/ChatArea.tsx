import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Send,
  Paperclip,
  Smile,
  Mic,
  MicOff,
  Image as ImageIcon,
  FileText,
  X,
  CheckCheck,
  Check,
  MoreVertical,
  Play,
  Pause,
  Download,
  Reply,
  Trash2,
  Sparkles,
  Info
} from 'lucide-react';
import { Conversation, Message, PublicUser } from '../types';
import { getAvatarGradient, getInitials } from '../utils/crypto';
import { compressImage, fileToBase64, formatFileSize, VoiceRecorder } from '../utils/media';
import {
  listenToMessages,
  markConversationAsRead,
  sendMessage,
  toggleMessageReaction,
} from '../services/chatService';

interface ChatAreaProps {
  currentUser: { userId: string; username: string; firstName: string; lastName: string; displayName: string; avatarUrl?: string };
  conversation: Conversation;
  onBack: () => void;
  onViewProfile: (user: PublicUser) => void;
  onOpenMedia: (url: string, name?: string, caption?: string) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '👏', '🎉', '😍', '🚀'];
const STICKERS = [
  '👋 Hello!',
  '🚀 Let\'s Go!',
  '💯 100%',
  '✨ Superb!',
  '☕ Coffee Time',
  '😎 Cool!',
  '🙏 Thank You',
  '🎯 Bullseye'
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  currentUser,
  conversation,
  onBack,
  onViewProfile,
  onOpenMedia,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [sending, setSending] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const voiceRecorderRef = useRef<VoiceRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio player state for voice notes in chat
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // File input refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Other participant in direct chat
  const otherUserId = conversation.participantIds.find((id) => id !== currentUser.userId) || '';
  const otherUser = conversation.participants[otherUserId] || {
    userId: otherUserId,
    username: 'unknown',
    firstName: 'User',
    lastName: '',
    displayName: 'User',
    status: 'offline',
  };

  // Mark conversation read and listen to messages
  useEffect(() => {
    markConversationAsRead(conversation.id, currentUser.userId);
    const unsubscribe = listenToMessages(conversation.id, (newMsgs) => {
      setMessages(newMsgs);
      markConversationAsRead(conversation.id, currentUser.userId);
    });

    return () => {
      unsubscribe();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, [conversation.id, currentUser.userId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Text Send
  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    setInputText('');
    const prevReply = replyTo;
    setReplyTo(null);
    setSending(true);

    try {
      await sendMessage({
        conversationId: conversation.id,
        sender: currentUser,
        recipientId: otherUserId,
        text,
        type: 'text',
        replyTo: prevReply ? {
          id: prevReply.id,
          text: prevReply.text || (prevReply.type === 'image' ? '📷 Photo' : 'Attachment'),
          senderName: prevReply.senderName,
          type: prevReply.type,
        } : undefined,
      });
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  // Handle Image Upload
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAttachMenu(false);
    setSending(true);
    try {
      const compressedBase64 = await compressImage(file);
      await sendMessage({
        conversationId: conversation.id,
        sender: currentUser,
        recipientId: otherUserId,
        text: inputText.trim() || undefined,
        type: 'image',
        mediaUrl: compressedBase64,
        mediaName: file.name,
        mediaSize: formatFileSize(file.size),
        mediaType: file.type,
        replyTo: replyTo ? {
          id: replyTo.id,
          text: replyTo.text || 'Attachment',
          senderName: replyTo.senderName,
        } : undefined,
      });
      setInputText('');
      setReplyTo(null);
    } catch (err: any) {
      alert(err.message || 'Failed to upload photo');
    } finally {
      setSending(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // Handle Document / File Upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAttachMenu(false);
    setSending(true);
    try {
      const base64 = await fileToBase64(file);
      await sendMessage({
        conversationId: conversation.id,
        sender: currentUser,
        recipientId: otherUserId,
        text: inputText.trim() || undefined,
        type: 'file',
        mediaUrl: base64,
        mediaName: file.name,
        mediaSize: formatFileSize(file.size),
        mediaType: file.type,
        replyTo: replyTo ? {
          id: replyTo.id,
          text: replyTo.text || 'Attachment',
          senderName: replyTo.senderName,
        } : undefined,
      });
      setInputText('');
      setReplyTo(null);
    } catch (err: any) {
      alert(err.message || 'File upload failed. Ensure file size is under 800KB.');
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Voice Recording Start
  const startRecording = async () => {
    try {
      const recorder = new VoiceRecorder();
      await recorder.start();
      voiceRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone permission required for voice notes.');
    }
  };

  // Handle Voice Recording Stop & Send
  const stopAndSendRecording = async () => {
    if (!voiceRecorderRef.current) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    setIsRecording(false);
    setSending(true);

    try {
      const { audioUrl, durationSec } = await voiceRecorderRef.current.stop();
      await sendMessage({
        conversationId: conversation.id,
        sender: currentUser,
        recipientId: otherUserId,
        text: `Voice message (${durationSec}s)`,
        type: 'voice',
        mediaUrl: audioUrl,
        mediaName: `voice_${Date.now()}.webm`,
        mediaSize: `${durationSec}s`,
        mediaType: 'audio/webm',
      });
    } catch (err) {
      console.error('Failed to send voice note', err);
    } finally {
      setSending(false);
      voiceRecorderRef.current = null;
    }
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    voiceRecorderRef.current?.cancel();
    setIsRecording(false);
    setRecordingSeconds(0);
    voiceRecorderRef.current = null;
  };

  // Send Sticker
  const handleSendSticker = async (stickerText: string) => {
    setShowEmojiPicker(false);
    try {
      await sendMessage({
        conversationId: conversation.id,
        sender: currentUser,
        recipientId: otherUserId,
        text: stickerText,
        type: 'sticker',
      });
    } catch (err) {
      console.error('Failed to send sticker', err);
    }
  };

  // Play audio toggle
  const togglePlayAudio = (msgId: string, url: string) => {
    if (playingAudioId === msgId) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      audio.play();
      setPlayingAudioId(msgId);
      audio.onended = () => setPlayingAudioId(null);
      audio.onerror = () => setPlayingAudioId(null);
    }
  };

  // Format message time (12-hour)
  const formatMsgTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#0e1621] text-white relative">
      
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="*/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Top Header Bar */}
      <div className="px-4 py-3 bg-[#17212b] border-b border-[#232e3c] flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1 text-gray-400 hover:text-white rounded-lg hover:bg-[#202b36] transition"
            title="Back to chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div
            onClick={() =>
              onViewProfile({
                userId: otherUser.userId,
                username: otherUser.username,
                firstName: otherUser.firstName,
                lastName: otherUser.lastName,
                displayName: otherUser.displayName,
                status: otherUser.status || 'offline',
                lastSeen: otherUser.lastSeen || '',
                createdAt: '',
              })
            }
            className="flex items-center gap-3 cursor-pointer group min-w-0"
          >
            <div className="relative shrink-0">
              <div
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(
                  otherUser.displayName
                )} flex items-center justify-center font-bold text-sm text-white shadow ring-2 ring-transparent group-hover:ring-[#24A1DE] transition`}
              >
                {getInitials(otherUser.firstName, otherUser.lastName)}
              </div>
              {otherUser.status === 'online' && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#17212b]" />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white group-hover:text-sky-400 transition truncate">
                {otherUser.displayName}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-mono">
                <span className="text-sky-400">@{otherUser.username}</span>
                <span>•</span>
                <span className={otherUser.status === 'online' ? 'text-emerald-400' : 'text-gray-400'}>
                  {otherUser.status === 'online' ? 'online' : 'last seen recently'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Info Button */}
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              onViewProfile({
                userId: otherUser.userId,
                username: otherUser.username,
                firstName: otherUser.firstName,
                lastName: otherUser.lastName,
                displayName: otherUser.displayName,
                status: otherUser.status || 'offline',
                lastSeen: otherUser.lastSeen || '',
                createdAt: '',
              })
            }
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#202b36] transition"
            title="User Profile"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <div className="w-16 h-16 rounded-full bg-[#17212b] border border-[#232e3c] flex items-center justify-center text-[#24A1DE] mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <p className="text-sm font-medium text-white">This is the start of your chat with {otherUser.firstName}!</p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              Messages are encrypted & updated in real time. Send a text, photo, audio voice note, or sticker.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === currentUser.userId;
            const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
              >
                {/* Quoted / Reply Preview */}
                {msg.replyTo && (
                  <div
                    className={`text-[11px] mb-1 px-3 py-1 rounded-lg border-l-2 border-sky-400 bg-black/30 text-gray-300 max-w-sm truncate ${
                      isMe ? 'mr-1' : 'ml-1'
                    }`}
                  >
                    <span className="font-semibold text-sky-400">{msg.replyTo.senderName}: </span>
                    <span>{msg.replyTo.text}</span>
                  </div>
                )}

                {/* Main Message Bubble */}
                <div className="relative max-w-[85%] sm:max-w-md">
                  {msg.type === 'sticker' ? (
                    // Sticker format (no bubble background)
                    <div className="py-1 px-2 text-2xl font-bold bg-transparent select-none">
                      <span className="inline-block hover:scale-110 transition duration-150">
                        {msg.text}
                      </span>
                      <span className="text-[10px] text-gray-500 ml-2 font-normal">
                        {formatMsgTime(msg.timestamp)}
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`rounded-2xl p-3 shadow-md relative text-sm ${
                        isMe
                          ? 'bg-[#2b5278] text-white rounded-br-xs'
                          : 'bg-[#182533] text-gray-100 rounded-bl-xs border border-[#223446]/40'
                      }`}
                    >
                      {/* Media Image Content */}
                      {msg.type === 'image' && msg.mediaUrl && (
                        <div className="mb-2">
                          <img
                            src={msg.mediaUrl}
                            alt={msg.mediaName || 'Photo'}
                            onClick={() => onOpenMedia(msg.mediaUrl!, msg.mediaName, msg.text)}
                            className="rounded-xl max-h-72 w-full object-cover cursor-pointer hover:opacity-95 transition"
                          />
                        </div>
                      )}

                      {/* Voice Note Player */}
                      {msg.type === 'voice' && msg.mediaUrl && (
                        <div className="flex items-center gap-3 py-1 min-w-[200px]">
                          <button
                            onClick={() => togglePlayAudio(msg.id, msg.mediaUrl!)}
                            className="w-9 h-9 rounded-full bg-[#24A1DE] hover:bg-[#1e8cc3] text-white flex items-center justify-center shrink-0 shadow transition"
                          >
                            {playingAudioId === msg.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4 ml-0.5" />
                            )}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-1 h-5">
                              {[35, 60, 40, 80, 50, 95, 70, 45, 90, 60, 40, 75, 55].map((h, i) => (
                                <span
                                  key={i}
                                  style={{ height: `${h}%` }}
                                  className={`w-1 rounded-full transition-colors ${
                                    playingAudioId === msg.id ? 'bg-sky-400 animate-pulse' : 'bg-gray-400'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] text-gray-300 font-mono mt-0.5 block">
                              {msg.mediaSize || 'Voice note'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* File Attachment */}
                      {msg.type === 'file' && msg.mediaUrl && (
                        <div className="flex items-center gap-3 p-2 bg-black/20 rounded-xl mb-1.5">
                          <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-[#24A1DE] flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate text-white">
                              {msg.mediaName || 'Document'}
                            </p>
                            <p className="text-[10px] text-gray-400">{msg.mediaSize || 'File'}</p>
                          </div>
                          <a
                            href={msg.mediaUrl}
                            download={msg.mediaName || 'file'}
                            className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      )}

                      {/* Text Body */}
                      {msg.text && (
                        <p className="whitespace-pre-wrap break-words leading-relaxed text-sm">
                          {msg.text}
                        </p>
                      )}

                      {/* Timestamp & Read Receipt */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-sky-200/70 font-mono select-none">
                        <span>{formatMsgTime(msg.timestamp)}</span>
                        {isMe && (
                          <CheckCheck className="w-3.5 h-3.5 text-sky-300 inline" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hover Quick Action Buttons */}
                  <div
                    className={`absolute top-0 -translate-y-1/2 ${
                      isMe ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'
                    } hidden group-hover:flex items-center gap-1 z-10`}
                  >
                    <button
                      onClick={() => setReplyTo(msg)}
                      className="p-1 rounded-full bg-[#1f2b38] hover:bg-[#2b3c4e] text-gray-300 shadow text-xs transition"
                      title="Reply"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                    {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() =>
                          toggleMessageReaction(conversation.id, msg.id, emoji, currentUser.userId)
                        }
                        className="p-1 rounded-full bg-[#1f2b38] hover:bg-[#2b3c4e] text-xs shadow transition hover:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Displayed Emoji Reactions */}
                {hasReactions && (
                  <div
                    className={`flex flex-wrap gap-1 mt-1 ${
                      isMe ? 'justify-end mr-1' : 'justify-start ml-1'
                    }`}
                  >
                    {Object.entries(msg.reactions!).map(([emoji, users]) => {
                      if (!users || users.length === 0) return null;
                      const hasReacted = users.includes(currentUser.userId);
                      return (
                        <button
                          key={emoji}
                          onClick={() =>
                            toggleMessageReaction(conversation.id, msg.id, emoji, currentUser.userId)
                          }
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition ${
                            hasReacted
                              ? 'bg-[#24A1DE]/30 border border-[#24A1DE] text-white'
                              : 'bg-[#182533] border border-[#25394d] text-gray-300 hover:bg-[#203243]'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px] font-semibold">{users.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Banner */}
      {replyTo && (
        <div className="bg-[#17212b] border-t border-[#232e3c] px-4 py-2 flex items-center justify-between text-xs animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 border-l-2 border-[#24A1DE] pl-2 min-w-0">
            <Reply className="w-3.5 h-3.5 text-[#24A1DE] shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-sky-400">Replying to {replyTo.senderName}: </span>
              <span className="text-gray-300">
                {replyTo.text || (replyTo.type === 'image' ? '📷 Photo' : 'Attachment')}
              </span>
            </div>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="p-1 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji & Sticker Picker Popover */}
      {showEmojiPicker && (
        <div className="bg-[#17212b] border-t border-[#232e3c] p-3 max-h-56 overflow-y-auto">
          <div className="mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Telegram Quick Reactions & Emojis
            </span>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setInputText((prev) => prev + emoji);
                  }}
                  className="text-xl p-1.5 rounded-lg hover:bg-[#202b36] hover:scale-125 transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Quick Telegram Stickers
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
              {STICKERS.map((stk) => (
                <button
                  key={stk}
                  onClick={() => handleSendSticker(stk)}
                  className="py-1.5 px-2 bg-[#202b36] hover:bg-[#2b3c4e] rounded-xl text-xs font-medium text-left truncate transition"
                >
                  {stk}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Attachment Menu Popover */}
      {showAttachMenu && (
        <div className="absolute bottom-16 left-4 bg-[#1f2b38] border border-[#2e3e50] rounded-2xl shadow-2xl p-2 z-30 flex flex-col gap-1 w-44 animate-in fade-in zoom-in-95">
          <button
            onClick={() => {
              setShowAttachMenu(false);
              imageInputRef.current?.click();
            }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-[#29394b] text-gray-200 transition"
          >
            <ImageIcon className="w-4 h-4 text-sky-400" />
            <span>Send Photo</span>
          </button>
          <button
            onClick={() => {
              setShowAttachMenu(false);
              fileInputRef.current?.click();
            }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-[#29394b] text-gray-200 transition"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Send Document</span>
          </button>
        </div>
      )}

      {/* Input Action Bar */}
      <div className="p-3 bg-[#17212b] border-t border-[#232e3c]">
        {isRecording ? (
          // Recording Toolbar
          <div className="flex items-center justify-between bg-[#1f2b38] rounded-2xl px-4 py-2 text-xs border border-rose-500/30 animate-pulse">
            <div className="flex items-center gap-2 text-rose-400">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span className="font-semibold">Recording Voice Note...</span>
              <span className="font-mono text-white ml-2">
                {Math.floor(recordingSeconds / 60)}:
                {(recordingSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={cancelRecording}
                className="px-3 py-1.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={stopAndSendRecording}
                className="px-3 py-1.5 rounded-xl bg-[#24A1DE] hover:bg-[#1e8cc3] text-white font-medium flex items-center gap-1 shadow transition"
              >
                <Send className="w-3.5 h-3.5 -rotate-12" />
                <span>Send</span>
              </button>
            </div>
          </div>
        ) : (
          // Standard Message Input Bar
          <form onSubmit={handleSendText} className="flex items-center gap-2">
            
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="p-2.5 rounded-full text-gray-400 hover:text-white hover:bg-[#202b36] transition relative"
              title="Attach media"
            >
              <Paperclip className="w-5 h-5 -rotate-45" />
            </button>

            {/* Input field */}
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Write a message..."
                className="w-full bg-[#0e1621] border border-[#232e3c] rounded-2xl pl-4 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#24A1DE] focus:ring-1 focus:ring-[#24A1DE] transition"
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-3 text-gray-400 hover:text-yellow-400 transition"
                title="Emojis & Stickers"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>

            {/* Voice record button OR Send button */}
            {inputText.trim() ? (
              <button
                type="submit"
                disabled={sending}
                className="p-2.5 rounded-full bg-[#24A1DE] hover:bg-[#1e8cc3] text-white shadow-md transition disabled:opacity-50 cursor-pointer"
                title="Send Message"
              >
                <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="p-2.5 rounded-full bg-[#202b36] hover:bg-[#24A1DE] text-gray-300 hover:text-white transition cursor-pointer"
                title="Hold or click to record voice note"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
