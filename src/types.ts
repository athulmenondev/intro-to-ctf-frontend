export interface Challenge {
  id: string;
  title: string;
  category: ChallengeCategory;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  hint: string;
  points: number;
  solved: boolean;
  totalSolves: number;
}

export type ChallengeCategory = 'OSINT' | 'Crypto' | 'Web' | 'Forensics' | 'Reverse';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  solvedCount: number;
}

export interface UserStats {
  rank: number;
  points: number;
  solvedCount: number;
  totalChallenges: number;
}
