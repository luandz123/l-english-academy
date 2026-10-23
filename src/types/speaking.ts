export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export const ENGLISH_LEVELS: Array<{ level: EnglishLevel; label: string; desc: string; badgeColor: string }> = [
  { level: 'A1', label: 'A1 - Beginner', desc: 'Mới bắt đầu, từ vựng cơ bản', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { level: 'A2', label: 'A2 - Elementary', desc: 'Giao tiếp tình huống hàng ngày', badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' },
  { level: 'B1', label: 'B1 - Intermediate', desc: 'Tự tin trao đổi sở thích & công việc', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { level: 'B2', label: 'B2 - Upper-Intermediate', desc: 'Tranh luận, phản xạ lưu loát', badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  { level: 'C1', label: 'C1 - Advanced', desc: 'Học thuật, thương mại chuyên sâu', badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  { level: 'C2', label: 'C2 - Mastery', desc: 'Gần như người bản xứ tự nhiên', badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
];

export const SPEAKING_TOPICS = [
  'IELTS Speaking',
  'TOEIC Speaking',
  'TOEFL',
  'Business English',
  'Academic English',
  'Daily Conversation',
  'Travel',
  'Food',
  'Music',
  'Sport',
  'Technology',
  'Movies',
  'Books',
  'Science',
  'Art',
  'Gaming',
  'Health',
  'Fashion',
  'Nature',
] as const;

export type SpeakingTopic = (typeof SPEAKING_TOPICS)[number];

export type RoomVisibility = 'public' | 'private';
export type RoomStatus = 'active' | 'closed' | 'expired';

export interface SpeakingRoom {
  id: string;
  name: string;
  host_user_id: string;
  english_level: EnglishLevel;
  topics: string[];
  visibility: RoomVisibility;
  passcode?: string | null;
  capacity: number;
  status: RoomStatus;
  created_at: string;
  expires_at: string;
  current_members?: number;
  members?: SpeakingMember[];
  host_name?: string;
  host_avatar?: string;
}

export type ParticipantRole = 'host' | 'member';
export type ParticipantConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface SpeakingMember {
  id: string;
  room_id: string;
  user_id: string;
  role: ParticipantRole;
  joined_at: string;
  last_seen_at?: string;
  is_muted: boolean;
  is_speaking: boolean;
  full_name?: string;
  avatar_url?: string;
  audio_level?: number; // 0 to 1
  connection_status?: ParticipantConnectionStatus;
}

export interface SpeakingSession {
  id: string;
  user_id: string;
  room_id: string;
  started_at: string;
  ended_at?: string | null;
  duration_seconds: number;
}

export interface TopicPrompt {
  id: string;
  topic: string;
  question: string;
  followUps?: string[];
  vocabularyTips?: string[];
}
