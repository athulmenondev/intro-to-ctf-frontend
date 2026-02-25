const API_BASE = 'http://localhost:3001/api';

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
  user: { id: number; username: string; email: string; points?: number; isAdmin?: boolean };
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
  id: number;
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
};

