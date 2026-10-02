import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { Conversation, Message, OperationType, PublicUser } from '../types';

/**
 * Creates deterministic conversation ID for 1-on-1 direct chat
 */
export function getDirectChatId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `c_${sorted[0]}_${sorted[1]}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Get or initialize conversation between current user and target user
 */
export async function getOrCreateConversation(
  currentUser: { userId: string; username: string; firstName: string; lastName: string; displayName: string; avatarUrl?: string },
  targetUser: { userId: string; username: string; firstName: string; lastName: string; displayName: string; avatarUrl?: string }
): Promise<Conversation> {
  const convId = getDirectChatId(currentUser.userId, targetUser.userId);
  const convRef = doc(db, 'conversations', convId);

  try {
    const snap = await getDoc(convRef);
    if (snap.exists()) {
      return snap.data() as Conversation;
    }

    const now = new Date().toISOString();
    const newConv: Conversation = {
      id: convId,
      participantIds: [currentUser.userId, targetUser.userId],
      participants: {
        [currentUser.userId]: {
          userId: currentUser.userId,
          username: currentUser.username,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          displayName: currentUser.displayName,
          avatarUrl: currentUser.avatarUrl || '',
          status: 'online',
        },
        [targetUser.userId]: {
          userId: targetUser.userId,
          username: targetUser.username,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          displayName: targetUser.displayName,
          avatarUrl: targetUser.avatarUrl || '',
          status: 'offline',
        },
      },
      updatedAt: now,
      unreadCounts: {
        [currentUser.userId]: 0,
        [targetUser.userId]: 0,
      },
    };

    await setDoc(convRef, newConv);
    return newConv;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `conversations/${convId}`);
  }
}

/**
 * Real-time listener for user's conversations
 */
export function listenToConversations(
  userId: string,
  onUpdate: (convs: Conversation[]) => void
): () => void {
  const convCol = collection(db, 'conversations');
  const path = 'conversations';

  const unsubscribe = onSnapshot(
    convCol,
    (snapshot) => {
      const list: Conversation[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Conversation;
        if (data.participantIds && data.participantIds.includes(userId)) {
          list.push(data);
        }
      });
      // Sort newest updated first
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );

  return unsubscribe;
}

/**
 * Real-time listener for messages in a conversation
 */
export function listenToMessages(
  conversationId: string,
  onUpdate: (messages: Message[]) => void
): () => void {
  const msgsCol = collection(db, 'conversations', conversationId, 'messages');
  const q = query(msgsCol, orderBy('timestamp', 'asc'));
  const path = `conversations/${conversationId}/messages`;

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((d) => {
        msgs.push(d.data() as Message);
      });
      onUpdate(msgs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );

  return unsubscribe;
}

/**
 * Send a message with text or media
 */
export async function sendMessage(params: {
  conversationId: string;
  sender: { userId: string; username: string; displayName: string };
  recipientId: string;
  text?: string;
  type?: 'text' | 'image' | 'file' | 'audio' | 'voice' | 'sticker';
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: string;
  mediaType?: string;
  replyTo?: { id: string; text: string; senderName: string; type?: string };
}): Promise<Message> {
  const msgId = `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const type = params.type || 'text';

  const message: Message = {
    id: msgId,
    conversationId: params.conversationId,
    senderId: params.sender.userId,
    senderUsername: params.sender.username,
    senderName: params.sender.displayName,
    recipientId: params.recipientId,
    text: params.text || '',
    type,
    mediaUrl: params.mediaUrl,
    mediaName: params.mediaName,
    mediaSize: params.mediaSize,
    mediaType: params.mediaType,
    timestamp: now,
    status: 'sent',
    reactions: {},
    replyTo: params.replyTo,
  };

  const convRef = doc(db, 'conversations', params.conversationId);
  const msgRef = doc(db, 'conversations', params.conversationId, 'messages', msgId);

  try {
    await runTransaction(db, async (tx) => {
      tx.set(msgRef, message);

      const convSnap = await tx.get(convRef);
      const currentUnreads = convSnap.exists() ? (convSnap.data().unreadCounts || {}) : {};
      const nextUnreads = {
        ...currentUnreads,
        [params.recipientId]: (currentUnreads[params.recipientId] || 0) + 1,
      };

      let previewText = params.text || '';
      if (!previewText) {
        if (type === 'image') previewText = '📷 Photo';
        else if (type === 'voice') previewText = '🎤 Voice message';
        else if (type === 'audio') previewText = '🎵 Audio file';
        else if (type === 'sticker') previewText = '✨ Sticker';
        else if (type === 'file') previewText = `📁 ${params.mediaName || 'File'}`;
      }

      tx.update(convRef, {
        updatedAt: now,
        lastMessage: {
          id: msgId,
          text: previewText,
          senderId: params.sender.userId,
          senderName: params.sender.displayName,
          timestamp: now,
          type,
          mediaName: params.mediaName,
        },
        unreadCounts: nextUnreads,
      });
    });

    return message;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `conversations/${params.conversationId}/messages/${msgId}`);
  }
}

/**
 * Add or toggle emoji reaction on a message
 */
export async function toggleMessageReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> {
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  const path = `conversations/${conversationId}/messages/${messageId}`;

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(msgRef);
      if (!snap.exists()) return;

      const data = snap.data() as Message;
      const reactions = { ...(data.reactions || {}) };
      const currentUsers = reactions[emoji] || [];

      if (currentUsers.includes(userId)) {
        // Remove reaction
        reactions[emoji] = currentUsers.filter((u) => u !== userId);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      } else {
        // Add reaction
        reactions[emoji] = [...currentUsers, userId];
      }

      tx.update(msgRef, { reactions });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Reset unread count for current user in conversation
 */
export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  try {
    const snap = await getDoc(convRef);
    if (!snap.exists()) return;

    const data = snap.data() as Conversation;
    if (!data.unreadCounts || data.unreadCounts[userId] === 0) return;

    await updateDoc(convRef, {
      [`unreadCounts.${userId}`]: 0,
    });
  } catch (err) {
    console.warn('Could not mark conversation as read', err);
  }
}
