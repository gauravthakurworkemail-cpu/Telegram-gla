export interface UserProfile {
  userId: string;
  username: string; // unique lowercase e.g. "alex99"
  firstName: string;
  lastName: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  passwordHash: string;
  passwordSalt: string;
  status: 'online' | 'offline';
  lastSeen: string;
  createdAt: string;
}

export type PublicUser = Omit<UserProfile, 'passwordHash' | 'passwordSalt'>;

export interface Conversation {
  id: string;
  participantIds: string[];
  participants: Record<string, {
    userId: string;
    username: string;
    firstName: string;
    lastName: string;
    displayName: string;
    avatarUrl?: string;
    status?: 'online' | 'offline';
    lastSeen?: string;
  }>;
  lastMessage?: {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    timestamp: string;
    type: 'text' | 'image' | 'file' | 'audio' | 'voice' | 'sticker';
    mediaName?: string;
  };
  updatedAt: string;
  unreadCounts?: Record<string, number>;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderName: string;
  recipientId: string;
  text: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'voice' | 'sticker';
  mediaUrl?: string; // base64 or URL
  mediaName?: string;
  mediaSize?: string;
  mediaType?: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  reactions?: Record<string, string[]>; // emoji -> [userId, ...]
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
    type?: string;
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}
