export type ReportType =
  | 'fake_profile'
  | 'harassment'
  | 'inappropriate_content'
  | 'underage'
  | 'hate_speech'
  | 'spam'
  | 'scam'
  | 'other';

export type ReportStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporterId: string;
  reportedId: string;
  reportType: ReportType;
  description: string | null;
  evidence: ReportEvidence[];
  status: ReportStatus;
  resolution: string | null;
  moderatorId: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface ReportEvidence {
  type: 'screenshot' | 'message_id';
  url?: string;
  messageId?: string;
  capturedAt?: string;
}

export interface SafetyCheckIn {
  id: string;
  userId: string;
  matchId: string | null;
  meetingLocation: string | null;
  meetingTime: string | null;
  checkInUrl: string;
  status: 'active' | 'checked_in' | 'sos_triggered' | 'expired';
  sosTriggereddAt: string | null;
  createdAt: string;
}
