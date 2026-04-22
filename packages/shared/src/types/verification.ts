export type VerificationType = 'email' | 'selfie_capture' | 'photo_match';
export type VerificationStatus = 'pending' | 'in_review' | 'passed' | 'failed' | 'expired';

export interface Verification {
  id: string;
  userId: string;
  type: VerificationType;
  status: VerificationStatus;
  failureReason: string | null;
  attemptCount: number;
  verifiedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface VerificationState {
  email: VerificationStatus | null;
  selfie: VerificationStatus | null;
  overallLevel: 'none' | 'email' | 'partial' | 'full';
}
