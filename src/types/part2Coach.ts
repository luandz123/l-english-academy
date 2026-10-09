export type Part2QuestionType =
  | 'wh-question'
  | 'yes-no'
  | 'choice-or'
  | 'tag-question'
  | 'request-offer'
  | 'statement';

export type Part2TrapType =
  | 'same_sound'
  | 'similar_sound'
  | 'wrong_tense'
  | 'yes_no_wh'
  | 'irrelevant'
  | 'wrong_person'
  | 'association';

export interface Part2FunctionalChunkVocab {
  term: string;
  phonetic: string;
  meaningVi: string;
  example?: string;
  audioUrl?: string;
}

export interface Part2IndirectReflex {
  vietnamesePrompt: string;
  englishResponse: string;
  explanation: string;
  category: 'khong_biet' | 'hoi_nguoi_khac' | 'thay_doi_ke_hoach' | 'tinh_huong_thuc_te';
}

export interface Part2ConnectedSpeechNote {
  segment: string;
  phoneticSpelling: string;
  type: 'linking' | 'reduction' | 'assimilation' | 'elision';
  explanation: string;
}

export interface Part2DistractorTrap {
  letter: 'A' | 'B' | 'C';
  text: string;
  translation: string;
  trapType: Part2TrapType;
  trapNameVi: string;
  analysisVi: string;
  audioTimestamp?: { start: number; end: number };
}

export interface Part2CoachQuestion {
  id: number;
  questionNumber: number; // e.g. 7, 8, 9, 10
  audioUrl: string;
  
  // Script & Audio
  questionText: string;
  questionAudioUrl?: string;
  questionTranslation: string;

  // BƯỚC 2: Functional Chunks
  questionStem: {
    text: string;
    type: Part2QuestionType;
    label: string;
    tip: string;
  };
  keywordsAndCollocations: Part2FunctionalChunkVocab[];

  // BƯỚC 3: Chiều 1 - Phản xạ Nghe hiểu tức thì
  reflexDirection1: {
    targetMeaningVi: string;
    questionIntent: string; // "Cần tìm mốc thời gian cụ thể / thời điểm dự kiến"
    quickTip: string;
  };

  // BƯỚC 4: Chiều 2 - Phản xạ Câu trả lời & Đoán hướng
  reflexDirection2: {
    predictedDirectDirections: string[];
    commonIndirectResponses: Part2IndirectReflex[];
  };

  // BƯỚC 5: Shadowing Cặp Đúng
  correctChoice: {
    letter: 'A' | 'B' | 'C';
    text: string;
    translation: string;
    connectedSpeechNotes: Part2ConnectedSpeechNote[];
  };

  // BƯỚC 6: Nhận diện bẫy ở các phương án sai
  distractors: Part2DistractorTrap[];
}

export interface Part2Cluster {
  id: string;
  title: string;
  description: string;
  testSource: string; // e.g. "ETS TOEIC Test 1"
  difficulty: 'Cơ bản (500+)' | 'Trung cấp (650+)' | 'Nâng cao (800+)';
  badgeColor?: string;
  sourceType?: 'fulltest' | 'dictation';
  quizId?: number;
  questions: Part2CoachQuestion[];
}

export type Part2StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Part2StepMeta {
  id: Part2StepId;
  name: string;
  shortName: string;
  subtitle: string;
  description: string;
  iconName: string;
  badge: string;
}

export interface Part2DiagnosticResult {
  questionId: number;
  selectedChoice?: 'A' | 'B' | 'C';
  comprehensionPercent?: number;
}
