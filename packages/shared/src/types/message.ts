export type ContentType = 'text' | 'image' | 'gif' | 'system';
export type ModerationStatus = 'approved' | 'flagged' | 'removed';

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string | null;
  contentType: ContentType;
  mediaUrl: string | null;
  isDeleted: boolean;
  moderationStatus: ModerationStatus;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ConversationStarter {
  id: string;
  text: string;
  category: 'interest' | 'humor' | 'deep' | 'activity';
}

export interface SocketEvents {
  join_match_room: { matchId: string };
  send_message: { matchId: string; content: string; contentType: ContentType };
  typing: { matchId: string };
  read_messages: { matchId: string; upToMessageId: string };
  new_message: { message: Message };
  message_read: { matchId: string; readerId: string; readAt: string };
  new_match: { match: import('./match').MatchWithProfile };
  match_expired: { matchId: string };
  user_typing: { matchId: string; userId: string };
}
