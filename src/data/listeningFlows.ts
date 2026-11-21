/**
 * Luồng bước của "Luyện nghe từng bước" theo từng Part (quyết định D17, docs/UX_REVIEW.md).
 * Khung chung: Làm thử → Từ vựng → (học theo Part) → Nhại theo → Làm lại & nghe lặp.
 */
export type ListeningPart = "part1" | "part2" | "part3" | "part4";

export type ListeningStepKind =
  | "attempt"
  | "vocab"
  | "reflexQ"
  | "reflexA"
  | "questions"
  | "sentences"
  | "shadowing"
  | "review";

export interface ListeningFlowStep {
  id: number;
  kind: ListeningStepKind;
  name: string;
  shortName: string;
  description: string;
  /** Một câu hướng dẫn thao tác, hiện ở đầu bước */
  howTo: string;
}

const ATTEMPT_P12: Omit<ListeningFlowStep, "id"> = {
  kind: "attempt",
  name: "Làm thử như thi",
  shortName: "Làm thử",
  description: "Nghe và chọn đáp án như thi thật để biết mình đang ở đâu.",
  howTo: "Nghe từng câu và chọn đáp án như thi thật. Nộp bài để xem mình đúng bao nhiêu câu.",
};

const VOCAB: Omit<ListeningFlowStep, "id"> = {
  kind: "vocab",
  name: "Từ vựng quan trọng",
  shortName: "Từ vựng",
  description: "Học các từ quan trọng có trong bài, lấy từ kho từ vựng TOEIC.",
  howTo: "Nghe phát âm, đọc nghĩa và câu trong bài, lưu từ cần nhớ rồi làm bài kiểm tra nhanh.",
};

const SHADOWING: Omit<ListeningFlowStep, "id"> = {
  kind: "shadowing",
  name: "Nhại theo",
  shortName: "Nhại theo",
  description: "Nghe mẫu rồi thu âm nhại lại từng câu, máy chấm độ chính xác.",
  howTo: "Bấm Nghe mẫu, rồi Thu âm và nói lại câu đó. Đạt từ 60% là qua câu.",
};

const REVIEW: Omit<ListeningFlowStep, "id"> = {
  kind: "review",
  name: "Làm lại & nghe lặp",
  shortName: "Làm lại",
  description: "Làm lại bài để so với lần đầu, rồi nghe lặp cả bài cho ngấm.",
  howTo: "Làm lại các câu như thi thật, xem kết quả so với lần đầu, rồi nghe lặp cả bài.",
};

const withIds = (steps: Omit<ListeningFlowStep, "id">[]): ListeningFlowStep[] =>
  steps.map((s, i) => ({ ...s, id: i + 1 }));

const PART34_STEPS = (kind: "hội thoại" | "bài nói"): ListeningFlowStep[] =>
  withIds([
    {
      kind: "attempt",
      name: "Làm thử như thi",
      shortName: "Làm thử",
      description: `Đọc trước câu hỏi, nghe ${kind} một lần và trả lời như thi thật.`,
      howTo: `Đọc trước 3 câu hỏi trong thời gian đếm ngược, nghe ${kind} rồi chọn đáp án và nộp bài.`,
    },
    VOCAB,
    {
      kind: "questions",
      name: "Hiểu từng câu hỏi",
      shortName: "Hiểu câu hỏi",
      description: "Hiểu nghĩa câu hỏi, dạng câu và từ khóa cần nghe.",
      howTo: "Đọc câu hỏi, bấm chọn các từ khóa cần nghe, rồi mở gợi ý để so sánh.",
    },
    {
      kind: "sentences",
      name: kind === "hội thoại" ? "Học từng câu thoại" : "Học từng câu",
      shortName: "Học từng câu",
      description: `Học lần lượt từng câu của ${kind}: nghe, tự hiểu, điền từ khóa, xem nghĩa.`,
      howTo: "Với mỗi câu: nghe, tự hiểu nghĩa, điền từ còn thiếu, rồi xem nghĩa và sang câu tiếp.",
    },
    SHADOWING,
    REVIEW,
  ]);

export const LISTENING_FLOWS: Record<ListeningPart, ListeningFlowStep[]> = {
  part1: withIds([
    {
      ...ATTEMPT_P12,
      howTo: "Nhìn tranh, nghe 4 câu mô tả và chọn câu đúng với tranh. Nộp bài để xem kết quả.",
    },
    VOCAB,
    {
      kind: "sentences",
      name: "Học từng câu mô tả",
      shortName: "Học từng câu",
      description: "Học lần lượt từng câu A–D: nghe, tự hiểu, đối chiếu tranh, điền từ, xem nghĩa.",
      howTo: "Với mỗi câu: nghe, tự hiểu nghĩa, đoán đúng/sai với tranh, điền từ còn thiếu rồi xem nghĩa.",
    },
    SHADOWING,
    REVIEW,
  ]),
  part2: withIds([
    ATTEMPT_P12,
    VOCAB,
    {
      kind: "reflexQ",
      name: "Hiểu câu hỏi",
      shortName: "Hiểu câu hỏi",
      description: "Nghe câu hỏi và bật ngay nghĩa tiếng Việt.",
      howTo: "Nghe câu hỏi, tự nghĩ nghĩa tiếng Việt trước khi hết giờ, rồi bấm Xem nghĩa để kiểm tra.",
    },
    {
      kind: "reflexA",
      name: "Bật câu đáp",
      shortName: "Bật câu đáp",
      description: "Tự phản xạ câu trả lời và đối chiếu đáp án chuẩn.",
      howTo: "Nghe câu hỏi, tự nghĩ hoặc nói to câu trả lời hợp lý, rồi bấm Đáp án để so sánh.",
    },
    SHADOWING,
    REVIEW,
  ]),
  part3: PART34_STEPS("hội thoại"),
  part4: PART34_STEPS("bài nói"),
};

export const getFlow = (part: ListeningPart | undefined): ListeningFlowStep[] =>
  LISTENING_FLOWS[part ?? "part2"];

export const PART_NUMBER: Record<ListeningPart, number> = {
  part1: 1,
  part2: 2,
  part3: 3,
  part4: 4,
};
