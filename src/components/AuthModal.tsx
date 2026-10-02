import React, { useState } from 'react';
import {
  Send,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { checkUsernameAvailable, loginUser, registerUser } from '../services/userService';
import { sanitizeUsername, saveSessionUser } from '../utils/crypto';
import { UserProfile } from '../types';

interface AuthModalProps {
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(true);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('Hey there! I am using TeleChat.');

  // Validation / status
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Username availability check debounce
  const handleUsernameChange = async (val: string) => {
    const clean = sanitizeUsername(val);
    setUsername(clean);
    setError(null);

    if (clean.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    if (isRegistering) {
      setIsCheckingUsername(true);
      try {
        const available = await checkUsernameAvailable(clean);
        setUsernameAvailable(available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        if (!username || username.length < 3) {
          throw new Error('Username must be at least 3 characters');
        }
        if (usernameAvailable === false) {
          throw new Error('This username is already taken. Please pick another one.');
        }
        if (!password || password.length < 4) {
          throw new Error('Password must be at least 4 characters');
        }
        if (!firstName.trim()) {
          throw new Error('First name is required');
        }

        const newUser = await registerUser({
          username,
          password,
          firstName,
          lastName,
          bio,
        });

        saveSessionUser(newUser);
        onSuccess(newUser);
      } else {
        if (!username.trim()) {
          throw new Error('Please enter your username');
        }
        if (!password) {
          throw new Error('Please enter your password');
        }

        const user = await loginUser(username, password);
        saveSessionUser(user);
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#17212b] border border-[#2b5278]/40 rounded-2xl shadow-2xl overflow-hidden text-white animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Telegram style blue banner */}
        <div className="bg-gradient-to-r from-[#24A1DE] to-[#1e88e5] p-6 text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-sky-900/30">
            <Send className="w-8 h-8 text-[#24A1DE] -rotate-12 translate-x-0.5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">TeleChat</h1>
          <p className="text-sky-100 text-xs mt-1">
            Real-Time Cloud Messenger • Search by @username
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#232e3c]">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(true);
              setError(null);
            }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              isRegistering
                ? 'text-[#24A1DE] border-b-2 border-[#24A1DE] bg-[#1e2c3a]/50'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegistering(false);
              setError(null);
            }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              !isRegistering
                ? 'text-[#24A1DE] border-b-2 border-[#24A1DE] bg-[#1e2c3a]/50'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Username Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
              Username (@handle)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-sky-400 font-semibold text-sm">
                @
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="choose_username"
                className="w-full bg-[#0e1621] border border-[#232e3c] rounded-xl pl-8 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#24A1DE] focus:ring-1 focus:ring-[#24A1DE] transition"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {isCheckingUsername ? (
                  <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                ) : isRegistering && username.length >= 3 ? (
                  usernameAvailable ? (
                    <span title="Username available">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </span>
                  ) : usernameAvailable === false ? (
                    <span title="Username already taken">
                      <XCircle className="w-4 h-4 text-rose-400" />
                    </span>
                  ) : null
                ) : null}
              </div>
            </div>
            {isRegistering && (
              <p className="text-[11px] text-gray-400 mt-1">
                {usernameAvailable === true && (
                  <span className="text-emerald-400">✓ @{username} is available!</span>
                )}
                {usernameAvailable === false && (
                  <span className="text-rose-400">✗ @{username} is already registered.</span>
                )}
                {usernameAvailable === null && 'People can find and chat with you using this @username.'}
              </p>
            )}
          </div>

          {/* First Name & Last Name (only on registration) */}
          {isRegistering && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                  First Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Rahul"
                    className="w-full bg-[#0e1621] border border-[#232e3c] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#24A1DE] focus:ring-1 focus:ring-[#24A1DE] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Sharma"
                  className="w-full bg-[#0e1621] border border-[#232e3c] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#24A1DE] focus:ring-1 focus:ring-[#24A1DE] transition"
                />
              </div>
            </div>
          )}

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0e1621] border border-[#232e3c] rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#24A1DE] focus:ring-1 focus:ring-[#24A1DE] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Optional Bio */}
          {isRegistering && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                Bio / Status (Optional)
              </label>
              <input
                type="text"
                value={bio}
                maxLength={100}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Available on TeleChat"
                className="w-full bg-[#0e1621] border border-[#232e3c] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#24A1DE] focus:ring-1 focus:ring-[#24A1DE] transition"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#24A1DE] hover:bg-[#1f93cc] active:bg-[#1a82b4] text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isRegistering ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Create TeleChat Account</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 -rotate-12" />
                <span>Log In</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>End-to-End Database Protected with SHA-256 Hashing</span>
          </div>
        </form>
      </div>
    </div>
  );
};
