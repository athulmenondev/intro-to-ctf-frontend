const API_BASE = import.meta.env.VITE_API_URL || 'https://intro-to-ctf-backend.onrender.com/api';

/**
 * Gets the stored JWT token from localStorage.
 */
function getToken(): string | null {
  return localStorage.getItem('ctf_token');
}

/**
 * Stores the JWT token in localStorage.
 */
export function setToken(token: string): void {
  localStorage.setItem('ctf_token', token);
}

/**
 * Removes the JWT token from localStorage.
 */
export function clearToken(): void {
  localStorage.removeItem('ctf_token');
}

/**
 * Returns true if a JWT token exists in localStorage.
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Core fetch wrapper that attaches Authorization header and handles errors.
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401 && !endpoint.startsWith('/auth/')) {
      clearToken();
      window.dispatchEvent(new Event('auth:expired'));
    }
    const error = new Error(data.message || 'API request failed');
    (error as Error & { statusCode: number }).statusCode = res.status;
    throw error;
  }

  return data as T;
}

// ─── Auth API ──────────────────────────────────────────────

interface AuthResponse {
  message: string;
  token: string;
  user: { id: string; username: string; email: string; points?: number; isAdmin?: boolean };
}

export const authAPI = {
  register: (username: string, email: string, password: string): Promise<AuthResponse> =>
    apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  login: (username: string, password: string): Promise<AuthResponse> =>
    apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
};

// ─── Challenge API ─────────────────────────────────────────

import type { Challenge } from './types';

interface ChallengesResponse {
  challenges: Challenge[];
}

interface SubmitFlagResponse {
  correct: boolean;
  message: string;
  pointsAwarded?: number;
  totalPoints?: number;
  newRank?: number;
  attemptsRemaining?: number;
  alreadySolved?: boolean;
}

export const challengeAPI = {
  getAll: (): Promise<ChallengesResponse> =>
    apiFetch<ChallengesResponse>('/challenges'),

  submitFlag: (challengeId: string, flag: string): Promise<SubmitFlagResponse> =>
    apiFetch<SubmitFlagResponse>(`/challenges/${challengeId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ flag }),
    }),
};

// ─── User API ──────────────────────────────────────────────

interface UserProfile {
  id: string;
  username: string;
  email: string;
  points: number;
  rank: number;
  solvedChallenges: string[];
  totalChallenges: number;
  joinedAt: string;
}

export const userAPI = {
  getProfile: (): Promise<UserProfile> =>
    apiFetch<UserProfile>('/user/profile'),
};

// ─── Leaderboard API ───────────────────────────────────────

interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  solvedCount: number;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  totalPlayers: number;
}

export const leaderboardAPI = {
  get: (limit = 10): Promise<LeaderboardResponse> =>
    apiFetch<LeaderboardResponse>(`/leaderboard?limit=${limit}`),
};

// ─── Admin API ─────────────────────────────────────────────

export interface AdminChallenge {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  description: string;
  hint: string;
  flag: string;
  points: number;
  author: string;
  created_at: string;
  totalSolves: number;
}

interface AdminChallengesResponse {
  challenges: AdminChallenge[];
}

interface AdminStatsResponse {
  totalUsers: number;
  totalChallenges: number;
  totalSubmissions: number;
  totalSolves: number;
}

interface CreateChallengePayload {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  description: string;
  hint: string;
  flag: string;
  points: number;
}

export const adminAPI = {
  getStats: (): Promise<AdminStatsResponse> =>
    apiFetch<AdminStatsResponse>('/admin/stats'),

  getChallenges: (): Promise<AdminChallengesResponse> =>
    apiFetch<AdminChallengesResponse>('/admin/challenges'),

  createChallenge: (data: CreateChallengePayload): Promise<{ message: string }> =>
    apiFetch<{ message: string }>('/admin/challenges', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateChallenge: (id: string, data: Partial<CreateChallengePayload>): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`/admin/challenges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteChallenge: (id: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`/admin/challenges/${id}`, {
      method: 'DELETE',
    }),

  getParticipants: (): Promise<ParticipantsResponse> =>
    apiFetch<ParticipantsResponse>('/admin/participants'),

  /** Delete a participant */
  deleteParticipant: (id: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`/admin/participants/${id}`, {
      method: 'DELETE',
    }),

  /** Export current challenges as JSON (triggers file download) */
  exportSeed: async (): Promise<void> => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/admin/export-seed`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Export failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'challenges.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  /** Clear All Questions */
  clearAllQuestions: (): Promise<{ message: string; deleted: { challengesDeleted: number } }> =>
    apiFetch('/admin/clear-questions', { method: 'POST' }),

  /** Upload a file attachment for a challenge */
  uploadAttachment: async (challengeId: string, file: File): Promise<{ message: string; attachment: Attachment }> => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/admin/challenges/${challengeId}/attachments`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  },

  /** Delete a file attachment */
  deleteAttachment: (challengeId: string, filename: string): Promise<{ message: string }> =>
    apiFetch(`/admin/challenges/${challengeId}/attachments/${filename}`, { method: 'DELETE' }),
};

// ─── Attachment Types ──────────────────────────────────────

export interface Attachment {
  filename: string;
  originalName: string;
  mimeType: string;
  url?: string;
  size?: number;
}

// ─── Participant Types ─────────────────────────────────────

export interface Participant {
  id: string;
  rank: number;
  username: string;
  email: string;
  points: number;
  solveCount: number;
  submissionCount: number;
  accuracy: number;
  joinedAt: string;
  lastActive: string;
}

interface ParticipantsResponse {
  participants: Participant[];
  totalParticipants: number;
}

// ─── Challenge Attachment API (public, for players) ────────

export const attachmentAPI = {
  /** List attachments for a challenge */
  list: (challengeId: string): Promise<{ attachments: Attachment[] }> =>
    apiFetch(`/challenges/${challengeId}/attachments`),

  /** Get the full URL for an attachment */
  getUrl: (challengeId: string, filename: string): string =>
    `${API_BASE}/challenges/${challengeId}/attachments/${filename}`,
};

