export interface Challenge {
  id: string;
  title: string;
  category: ChallengeCategory;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  hint: string;
  flag: string;
  points: number;
  solved: boolean;
}

export type ChallengeCategory = 'OSINT' | 'Crypto' | 'Web' | 'Forensics' | 'Reverse';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  solved: number;
  avatar: string;
}

export interface UserStats {
  rank: number;
  points: number;
  solvedCount: number;
  totalChallenges: number;
}
