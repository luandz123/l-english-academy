import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookX, ChevronDown, ChevronUp, History, PlayCircle } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import {
  MISTAKE_STATUS_LABELS,
  createPracticeSession,
  getMistakeHistory,
  getMistakeSummary,
  listMistakes,
  type MistakeFilter,
  type MistakeItem,
  type MistakeStatus,
  type Skill,
} from "@/lib/api/practice";
import { PracticeQuestionCard } from "@/components/practice/PracticeQuestionCard";
import { BookmarkButton } from "@/components/practice/BookmarkButton";

const letter = (item: MistakeItem, answerId: number | null) => {
  const i = item.answers.findIndex((a) => a.id === answerId);
  return i >= 0 ? String.fromCharCode(65 + i) : "—";
};

const STATUS_CLS: Record<MistakeStatus, string> = {
  not_reviewed: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  improving: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  fixed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
};

const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={cn(
      "min-h-[40px] px-3 rounded-xl border text-xs font-bold transition-colors",
      on ? "border-cyan-500 bg-cyan-500/15 text-cyan-200" : "border-slate-800 text-slate-300 hover:bg-slate-800",
    )}
  >
    {children}
  </button>
);

const MistakeRow: React.FC<{ item: MistakeItem }> = ({ item }) => {
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { data: history } = useQuery({
    queryKey: ["mistake-history", item.id],
    queryFn: () => getMistakeHistory(item.id),
    enabled: showHistory,
  });
  const plain = (item.question_text ?? item.passage ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return (
    <div className="p-4 rounded-2xl border border-slate-800 bg-[#070e1c]/90 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
            {item.part && <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-200">Part {item.part}</span>}
            {item.category_label && <span className="text-cyan-300">{item.category_label}</span>}
            {item.wrong_count > 0 ? (
              <span className={cn("px-2 py-0.5 rounded-md border", STATUS_CLS[item.status])}>{MISTAKE_STATUS_LABELS[item.status]}</span>
            ) : (
              <span className="px-2 py-0.5 rounded-md border border-amber-500/40 text-amber-300">Đã lưu</span>
            )}
            <span className="text-slate-500">{(item.part ?? 5) <= 4 ? "listening" : "reading"}</span>
          </div>
          <p className="text-sm text-white font-semibold line-clamp-2">{plain || `Câu hỏi #${item.question_id}`}</p>
          {item.wrong_count > 0 && (
            <p className="text-xs text-slate-400">
              Đã chọn: <b className="text-rose-300">{letter(item, item.selected_answer_id)}</b> · Đáp án:{" "}
              <b className="text-emerald-300">{letter(item, item.correct_answer_id)}</b> · Sai {item.wrong_count} lần
              {item.last_wrong_at && ` · lần cuối ${new Date(item.last_wrong_at).toLocaleDateString("vi-VN")}`}
            </p>
          )}
          {item.source_test_title && <p className="text-[11px] text-slate-500">Nguồn: {item.source_test_title}</p>}
        </div>
        <BookmarkButton questionId={item.question_id} bookmarked={item.is_bookmarked} compact />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setOpen((v) => !v)} className="min-h-[36px] px-3 rounded-lg border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} {open ? "Thu gọn" : "Xem câu & giải thích"}
        </button>
        {item.wrong_count > 0 && (
          <button type="button" onClick={() => setShowHistory((v) => !v)} className="min-h-[36px] px-3 rounded-lg border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1">
            <History className="w-3.5 h-3.5" /> Lịch sử trả lời
          </button>
        )}
      </div>
      {showHistory && (
        <ul className="text-xs text-slate-300 space-y-1">
          {(history ?? []).map((h) => (
            <li key={h.id} className="flex gap-2">
              <span className={h.is_correct ? "text-emerald-300 font-bold" : "text-rose-300 font-bold"}>{h.is_correct ? "Đúng" : "Sai"}</span>
              <span>chọn {letter(item, h.selected_answer_id)}</span>
              <span className="text-slate-500">
                {h.source === "full_test" ? "Full Test" : "Luyện tập"} · {new Date(h.created_at).toLocaleString("vi-VN")}
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <PracticeQuestionCard
          index={0}
          question={{ ...item, id: item.question_id, bookmarked: item.is_bookmarked }}
          selectedId={item.selected_answer_id}
          transcript={item.transcript}
          feedback={
            item.correct_answer_id
              ? {
                  is_correct: item.selected_answer_id === item.correct_answer_id,
                  selected_answer_id: item.selected_answer_id,
                  correct_answer_id: item.correct_answer_id,
                  explanation: item.explanation,
                  answer_explanations: {},
                  transcript: item.transcript,
                  translation: null,
                }
              : null
          }
          disabled
        />
      )}
    </div>
  );
};

/** Sổ câu sai (R07 + L09): tự lưu câu sai, bookmark thủ công, lọc và luyện lại. */
const MistakeNotebookPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Vào từ Phân tích điểm yếu: ?parts=&categories= lọc sẵn
  const [params] = useSearchParams();
  const [skill, setSkill] = useState<Skill | undefined>();
  const [parts, setParts] = useState<number[]>(() => (params.get("parts") ?? "").split(",").map(Number).filter(Boolean));
  const [categories, setCategories] = useState<string[]>(() => (params.get("categories") ?? "").split(",").filter(Boolean));
  const [statuses, setStatuses] = useState<MistakeStatus[]>([]);
  const [recent, setRecent] = useState<number | undefined>();
  const [minWrong, setMinWrong] = useState<number | undefined>();
  const [bookmarked, setBookmarked] = useState(false);
  const [page, setPage] = useState(1);

  const filter: MistakeFilter = {
    skill,
    parts: parts.length ? parts : undefined,
    categories: categories.length ? categories : undefined,
    statuses: statuses.length ? statuses : undefined,
    recent_days: recent,
    min_wrong: minWrong,
    bookmarked: bookmarked || undefined,
  };

  const { data: summary } = useQuery({ queryKey: ["mistake-summary", user?.id], queryFn: getMistakeSummary, enabled: !!user });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mistakes", user?.id, filter, page],
    queryFn: () => listMistakes({ ...filter, page, limit: 20 }),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  const practice = useMutation({
    mutationFn: (f: MistakeFilter) =>
      createPracticeSession({ kind: "mistakes", mistake_filter: f, mode: "practice", feedback: "immediate", count: 20 }),
    onSuccess: (s) => {
      void queryClient.invalidateQueries({ queryKey: ["practice-active"] });
      navigate(`/practice/session/${s.id}`);
    },
    onError: (err) => toast({ title: "Không có câu để luyện", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });

  const listeningParts = [1, 2, 3, 4];
  const readingParts = [5, 6, 7];
  const visibleParts = skill === "listening" ? listeningParts : skill === "reading" ? readingParts : [...listeningParts, ...readingParts];
  const reset = () => setPage(1);

  return (
    <StudentLayout>
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-16 font-sans">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white flex items-center gap-2.5">
            <BookX className="w-7 h-7 text-rose-400" /> Sổ câu sai
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Câu bạn trả lời sai khi nộp bài được tự lưu ở đây. Làm đúng lại thì câu chuyển sang "Đã sửa đúng" — lịch sử sai vẫn được giữ.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Câu sai", value: summary?.total_wrong, cls: "text-white" },
            { label: "Đã sửa đúng", value: summary?.fixed, cls: "text-emerald-300" },
            { label: "Chưa ôn", value: summary?.not_reviewed, cls: "text-amber-300" },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-2xl border border-slate-800 bg-[#070e1c]/90 text-center">
              <div className={cn("text-2xl sm:text-3xl font-black", s.cls)}>{s.value ?? "–"}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-cyan-500/25 bg-[#070e1c]/90 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Luyện lại</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={practice.isPending}
              onClick={() => practice.mutate(filter)}
              className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm flex items-center gap-1.5"
            >
              <PlayCircle className="w-4 h-4" /> Practice Mistakes (theo bộ lọc)
            </button>
            <Chip on={false} onClick={() => practice.mutate({ skill, statuses: ["not_reviewed", "improving"] })}>Câu chưa sửa đúng</Chip>
            <Chip on={false} onClick={() => practice.mutate({ skill, recent_days: 7, statuses: ["not_reviewed", "improving"] })}>Câu sai gần đây (7 ngày)</Chip>
            <Chip on={false} onClick={() => practice.mutate({ skill, min_wrong: 2 })}>Câu sai nhiều lần</Chip>
            <Chip on={false} onClick={() => practice.mutate({ skill, statuses: ["fixed"] })}>Câu đã sửa đúng (kiểm tra ghi nhớ)</Chip>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Chip on={!skill} onClick={() => { setSkill(undefined); setParts([]); reset(); }}>Tất cả</Chip>
            <Chip on={skill === "listening"} onClick={() => { setSkill("listening"); setParts([]); reset(); }}>
              Listening {summary ? `(${summary.listening})` : ""}
            </Chip>
            <Chip on={skill === "reading"} onClick={() => { setSkill("reading"); setParts([]); reset(); }}>
              Reading {summary ? `(${summary.reading})` : ""}
            </Chip>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleParts.map((p) => (
              <Chip key={p} on={parts.includes(p)} onClick={() => { setParts(parts.includes(p) ? parts.filter((x) => x !== p) : [...parts, p]); reset(); }}>
                Part {p}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(MISTAKE_STATUS_LABELS) as MistakeStatus[]).map((s) => (
              <Chip key={s} on={statuses.includes(s)} onClick={() => { setStatuses(statuses.includes(s) ? statuses.filter((x) => x !== s) : [...statuses, s]); reset(); }}>
                {MISTAKE_STATUS_LABELS[s]}
              </Chip>
            ))}
            <Chip on={recent === 7} onClick={() => { setRecent(recent === 7 ? undefined : 7); reset(); }}>7 ngày qua</Chip>
            <Chip on={recent === 30} onClick={() => { setRecent(recent === 30 ? undefined : 30); reset(); }}>30 ngày qua</Chip>
            <Chip on={minWrong === 2} onClick={() => { setMinWrong(minWrong === 2 ? undefined : 2); reset(); }}>Sai ≥ 2 lần</Chip>
            <Chip on={bookmarked} onClick={() => { setBookmarked(!bookmarked); reset(); }}>Đã bookmark</Chip>
            {categories.length > 0 && (
              <Chip on onClick={() => { setCategories([]); reset(); }}>Dạng câu đã chọn ✕</Chip>
            )}
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : isError || !data ? (
          <ErrorState title="Không tải được sổ câu sai" message="Vui lòng thử lại." onRetry={() => refetch()} />
        ) : data.items.length === 0 ? (
          <div className="p-8 rounded-2xl border border-slate-800 text-center text-slate-300 text-sm">
            {summary && summary.total_wrong + summary.bookmarked === 0
              ? "Sổ còn trống. Hãy làm một lượt luyện hoặc một đề Full Test — câu sai sẽ tự xuất hiện ở đây."
              : "Không có câu nào khớp bộ lọc."}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">{data.total} câu</p>
            {data.items.map((item) => (
              <MistakeRow key={item.id} item={item} />
            ))}
            {data.total > data.limit && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="min-h-[40px] px-4 rounded-xl border border-slate-800 text-sm text-slate-200 disabled:opacity-30">
                  Trước
                </button>
                <span className="text-sm text-slate-400">
                  Trang {page}/{Math.ceil(data.total / data.limit)}
                </span>
                <button
                  type="button"
                  disabled={page * data.limit >= data.total}
                  onClick={() => setPage(page + 1)}
                  className="min-h-[40px] px-4 rounded-xl border border-slate-800 text-sm text-slate-200 disabled:opacity-30"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default MistakeNotebookPage;
