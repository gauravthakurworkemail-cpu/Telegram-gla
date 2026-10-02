/**
 * Secure hashing and session management utilities
 */

export function generateSalt(length = 16): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}:telechat_secure_pepper_2026`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function sanitizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');
}

const SESSION_KEY = 'telechat_active_user_v1';

export function saveSessionUser(user: { userId: string; username: string; firstName: string; lastName: string; displayName: string; avatarUrl?: string }): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save session user', e);
  }
}

export function getSessionUser(): { userId: string; username: string; firstName: string; lastName: string; displayName: string; avatarUrl?: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSessionUser(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.error('Failed to clear session', e);
  }
}

// Telegram-like vibrant gradient avatars generator
const GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-indigo-600',
  'from-cyan-500 to-blue-600',
  'from-emerald-400 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-blue-600 to-indigo-800',
  'from-fuchsia-500 to-purple-600',
  'from-lime-500 to-emerald-600',
];

export function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

export function getInitials(firstName: string, lastName?: string): string {
  const f = firstName ? firstName.trim()[0]?.toUpperCase() : '';
  const l = lastName ? lastName.trim()[0]?.toUpperCase() : '';
  return `${f}${l}` || 'U';
}
