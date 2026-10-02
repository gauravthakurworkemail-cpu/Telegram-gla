import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { OperationType, PublicUser, UserProfile } from '../types';
import { generateSalt, hashPassword, sanitizeUsername } from '../utils/crypto';

export async function checkUsernameAvailable(usernameInput: string): Promise<boolean> {
  const username = sanitizeUsername(usernameInput);
  if (!username || username.length < 3) return false;

  const path = `usernames/${username}`;
  try {
    const docRef = doc(db, 'usernames', username);
    const snap = await getDoc(docRef);
    return !snap.exists();
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function registerUser(params: {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  bio?: string;
  avatarUrl?: string;
}): Promise<UserProfile> {
  const username = sanitizeUsername(params.username);
  if (!username || username.length < 3) {
    throw new Error('Username must be at least 3 alphanumeric characters');
  }
  if (!params.password || params.password.length < 4) {
    throw new Error('Password must be at least 4 characters long');
  }
  if (!params.firstName.trim()) {
    throw new Error('First name is required');
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(params.password, salt);
  const userId = `u_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();
  const displayName = `${params.firstName.trim()} ${params.lastName.trim()}`.trim();

  const userProfile: UserProfile = {
    userId,
    username,
    firstName: params.firstName.trim(),
    lastName: params.lastName.trim(),
    displayName,
    bio: params.bio?.trim() || '',
    avatarUrl: params.avatarUrl || '',
    passwordHash,
    passwordSalt: salt,
    status: 'online',
    lastSeen: now,
    createdAt: now,
  };

  try {
    // Atomic reservation of username and user record
    await runTransaction(db, async (tx) => {
      const usernameRef = doc(db, 'usernames', username);
      const usernameSnap = await tx.get(usernameRef);

      if (usernameSnap.exists()) {
        throw new Error(`Username @${username} is already taken. Please choose another.`);
      }

      const userRef = doc(db, 'users', userId);
      tx.set(usernameRef, {
        username,
        userId,
        createdAt: now,
      });
      tx.set(userRef, userProfile);
    });

    return userProfile;
  } catch (err) {
    if (err instanceof Error && err.message.includes('already taken')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
  }
}

export async function loginUser(usernameInput: string, passwordInput: string): Promise<UserProfile> {
  const username = sanitizeUsername(usernameInput);
  if (!username) {
    throw new Error('Please enter your username');
  }
  if (!passwordInput) {
    throw new Error('Please enter your password');
  }

  try {
    // 1. Find user ID from username index
    const usernameRef = doc(db, 'usernames', username);
    const usernameSnap = await getDoc(usernameRef);

    if (!usernameSnap.exists()) {
      throw new Error(`User @${username} does not exist. Check your username or register.`);
    }

    const userId = usernameSnap.data().userId;
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User account not found.');
    }

    const userData = userSnap.data() as UserProfile;
    const computedHash = await hashPassword(passwordInput, userData.passwordSalt);

    if (computedHash !== userData.passwordHash) {
      throw new Error('Incorrect password. Please try again.');
    }

    // Update status to online
    await updateDoc(userRef, {
      status: 'online',
      lastSeen: new Date().toISOString(),
    });

    return {
      ...userData,
      status: 'online',
      lastSeen: new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof Error && (err.message.includes('Incorrect') || err.message.includes('does not exist'))) {
      throw err;
    }
    handleFirestoreError(err, OperationType.GET, `users`);
  }
}

export async function searchUsers(searchTerm: string, currentUserId: string): Promise<PublicUser[]> {
  const term = sanitizeUsername(searchTerm);
  const rawTerm = searchTerm.trim().toLowerCase();
  if (!rawTerm) return [];

  try {
    // Fetch users up to limit 40
    const usersRef = collection(db, 'users');
    const q = query(usersRef, limit(40));
    const snapshot = await getDocs(q);

    const matches: PublicUser[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as UserProfile;
      if (data.userId === currentUserId) return; // skip self

      const matchUser = data.username.toLowerCase().includes(term);
      const matchName = data.displayName.toLowerCase().includes(rawTerm) ||
        data.firstName.toLowerCase().includes(rawTerm) ||
        data.lastName.toLowerCase().includes(rawTerm);

      if (matchUser || matchName) {
        // Strip sensitive fields
        const { passwordHash, passwordSalt, ...pub } = data;
        matches.push(pub);
      }
    });

    return matches;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }
}

export async function getUserByUsername(usernameInput: string): Promise<PublicUser | null> {
  const username = sanitizeUsername(usernameInput);
  if (!username) return null;

  try {
    const usernameSnap = await getDoc(doc(db, 'usernames', username));
    if (!usernameSnap.exists()) return null;

    const userId = usernameSnap.data().userId;
    return getUserById(userId);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `usernames/${username}`);
  }
}

export async function getUserById(userId: string): Promise<PublicUser | null> {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) return null;

    const data = userSnap.data() as UserProfile;
    const { passwordHash, passwordSalt, ...pub } = data;
    return pub;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}`);
  }
}

export async function updateUserStatus(userId: string, status: 'online' | 'offline'): Promise<void> {
  if (!userId) return;
  try {
    await updateDoc(doc(db, 'users', userId), {
      status,
      lastSeen: new Date().toISOString(),
    });
  } catch (err) {
    // Best-effort presence update
    console.warn('Could not update user status', err);
  }
}

export async function updateUserProfile(
  userId: string,
  updates: { firstName?: string; lastName?: string; bio?: string; avatarUrl?: string }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const displayName = `${(updates.firstName || '').trim()} ${(updates.lastName || '').trim()}`.trim();
    const payload: Record<string, any> = {};
    if (updates.firstName !== undefined) payload.firstName = updates.firstName;
    if (updates.lastName !== undefined) payload.lastName = updates.lastName;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.avatarUrl !== undefined) payload.avatarUrl = updates.avatarUrl;
    if (displayName) payload.displayName = displayName;

    await updateDoc(userRef, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}
