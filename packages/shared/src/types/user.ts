export type AccountStatus = 'active' | 'suspended' | 'banned' | 'pending_verification';
export type VerificationLevel = 'none' | 'email' | 'partial' | 'full';
export type UserRole = 'user' | 'moderator' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  verificationLevel: VerificationLevel;
  createdAt: string;
  lastActiveAt: string | null;
}

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  birthDate: string;
  gender: string;
  lookingFor: string[];
  bio: string | null;
  occupation: string | null;
  education: string | null;
  heightCm: number | null;
  cityDisplay: string | null;
  photos: ProfilePhoto[];
  prompts: ProfilePrompt[];
  interests: string[];
  lifestyle: Lifestyle | null;
  matchDistanceKm: number;
  agePrefMin: number;
  agePrefMax: number;
  isDiscoverable: boolean;
  profileComplete: boolean;
}

export interface ProfilePhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  isPrimary: boolean;
  order: number;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  faceMatchScore: number | null;
}

export interface ProfilePrompt {
  questionId: string;
  questionText: string;
  answer: string;
}

export interface Lifestyle {
  drinking: 'never' | 'socially' | 'regularly' | null;
  smoking: 'never' | 'socially' | 'regularly' | null;
  exercise: 'never' | 'sometimes' | 'often' | 'daily' | null;
  kidsWant: 'yes' | 'no' | 'open' | 'have_and_want_more' | null;
  religion: string | null;
  politics: string | null;
}

export const PROFILE_PROMPTS: Array<{ id: string; text: string }> = [
  { id: 'love_language', text: 'My love language is...' },
  { id: 'perfect_day', text: 'My perfect Sunday looks like...' },
  { id: 'argue_about', text: 'I could talk for hours about...' },
  { id: 'hidden_talent', text: 'My hidden talent is...' },
  { id: 'dealbreaker', text: 'A green flag for me is...' },
  { id: 'first_date', text: 'My ideal first date is...' },
  { id: 'currently_obsessed', text: 'Currently obsessed with...' },
  { id: 'getting_to_know', text: 'You should know that I...' },
  { id: 'values', text: 'I value most in a partner...' },
  { id: 'life_goal', text: 'In 5 years, I want to...' },
  { id: 'fun_fact', text: 'A fun fact about me is...' },
  { id: 'morning_night', text: 'I am a morning/night person because...' },
];
