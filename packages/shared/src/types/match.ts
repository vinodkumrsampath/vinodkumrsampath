export type MatchStatus = 'pending' | 'active' | 'expired' | 'unmatched';
export type SwipeDirection = 'like' | 'pass';

export interface Match {
  id: string;
  userAId: string;
  userBId: string;
  status: MatchStatus;
  matchedAt: string;
  expiresAt: string;
  firstMessageAt: string | null;
  unmatchedBy: string | null;
  unmatchReason: string | null;
  matchScore: number | null;
  matchReasons: MatchReason[] | null;
}

export interface MatchReason {
  factor: string;
  weight: number;
  detail: string;
}

export interface Swipe {
  id: string;
  swiperId: string;
  swipedId: string;
  direction: SwipeDirection;
  createdAt: string;
}

export interface MatchWithProfile extends Match {
  profile: {
    displayName: string;
    age: number;
    cityDisplay: string | null;
    primaryPhoto: string | null;
    verificationLevel: string;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
}
