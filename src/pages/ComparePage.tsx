import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus, ChevronDown, ChevronUp, GitCompare, RotateCcw } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { listMyFullTestResults } from "@/lib/api/fullTest";
import { compareAttempts, type CompareQuestion } from "@/lib/api/analytics";
import { bookmarkQuestions, createPracticeSession } from "@/lib/api/practice";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("vi-VN") : "—");
const Delta: React.FC<{ v: number | null; suffix?: string }> = ({ v, suffix = "" }) =>
  v === null ? (
    <span className="text-slate-500">—</span>
  ) : (
    <span className={cn("font-black", v > 0 ? "text-emerald-300" : v < 0 ? "text-rose-300" : "text-slate-300")}>
      {v > 0 ? "+" : ""}
      {v}
      {suffix}
    </span>
  );

const partsOf = (detail: unknown): number[] | null => {
  const meta = (detail as { _meta?: { selected_parts?: unknown } } | null)?._meta;
  return meta && Array.isArray(meta.selected_parts) ? (meta.selected_parts as number[]) : null;
};

/** Màn chọn 2–3 lượt Full Test. */
const Picker: React.FC<{ initial: number[] }> = ({ initial }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<number[]>(initial);
  const { data = [], isLoading } = useQuery({
    queryKey: ["profile-fulltest-results", user?.id],
    queryFn: async () => (await listMyFullTestResults()).data || [],
    enabled: !!user,
  });
  // Vào từ "So sánh với lần trước": chọn sẵn lần gần nhất của cùng đề, không có thì Full Test gần nhất của đề khác
  useEffect(() => {
    if (initial.length !== 1 || data.length < 2) return;
    const current = data.find((r) => r.id === initial[0]);
    if (!current) return;
    const others = data.filter((r) => r.id !== current.id);
    const before = (r: (typeof data)[number]) => (r.completed_at ?? "") <= (current.completed_at ?? "");
    const partner = others.find((r) => r.test_id === current.test_id && before(r)) ?? others.find((r) => r.test_id === current.test_id) ?? others[0];
    if (partner) navigate(`/fulltests/compare?ids=${partner.id},${current.id}`, { replace: true });
  }, [data, initial, navigate]);
  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (data.length === 0) {
    return (
      <div className="p-8 rounded-2xl border border-slate-800 text-center space-y-3">
        <p className="text-white font-bold">Bạn chưa làm Full Test nào</p>
        <Link to="/fulltests" className="min-h-[40px] px-4 rounded-xl border border-cyan-500/40 text-cyan-300 font-bold text-sm inline-flex items-center">
          Vào thư viện đề
        </Link>
      </div>
    );
  }
  if (data.length === 1) {
    return (
      <div className="p-8 rounded-2xl border border-slate-800 text-center space-y-3">
        <p className="text-white font-bold">Làm thêm 1 đề để so sánh</p>
        <Link to="/dashboard" className="min-h-[40px] px-4 rounded-xl border border-cyan-500/40 text-cyan-300 font-bold text-sm inline-flex items-center">
          Xem đề nên làm tiếp
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">Chọn 2 hoặc 3 lượt Full Test.</p>
      <ul className="space-y-2">
        {data.map((r) => {
          const on = picked.includes(r.id);
          const parts = partsOf(r.answers_detail);
          return (
            <li key={r.id}>
              <label
                className={cn(
                  "p-3 rounded-2xl border flex items-center gap-3 cursor-pointer min-h-[56px]",
                  on ? "border-cyan-500 bg-cyan-500/10" : "border-slate-800 bg-[#070e1c]/90",
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!on && picked.length >= 3}
                  onChange={() => setPicked(on ? picked.filter((x) => x !== r.id) : [...picked, r.id])}
                  className="w-5 h-5 accent-cyan-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{r.full_tests?.title ?? `Đề #${r.test_id}`}</div>
                  <div className="text-xs text-slate-400">
                    {fmt(r.completed_at)} · {parts && parts.length < 7 ? `Part ${parts.join(", ")}` : "Đủ 7 Part"}
                  </div>
                </div>
                <span className="text-sm font-black text-white">{r.total_score ?? "—"}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {picked.length >= 3 && <p className="text-xs text-amber-300">Tối đa 3 lượt.</p>}
      <button
        type="button"
        disabled={picked.length < 2}
        onClick={() => navigate(`/fulltests/compare?ids=${picked.join(",")}`)}
        className="min-h-[48px] px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm disabled:opacity-40"
      >
        So sánh ({picked.length})
      </button>
    </div>
  );
};

const QuestionRow: React.FC<{ q: CompareQuestion; attempts: number }> = ({ q, attempts }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-3 rounded-xl border border-slate-800 bg-[#070e1c]/90 space-y-2">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex flex-wrap items-center gap-2 text-left min-h-[40px]">
        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-black">Câu {q.number ?? "?"}</span>
        <span className="text-xs text-slate-300 font-bold">Part {q.part}</span>
        {q.label && <span className="text-xs text-cyan-300">{q.label}</span>}
        <span className="text-xs text-slate-400 ml-auto">
          {q.picks.slice(0, attempts).map((p, i) => (
            <span key={i} className={cn("ml-2 font-bold", p?.correct ? "text-emerald-300" : "text-rose-300")}>
              Lượt {i + 1}: {p?.letter ?? "bỏ trống"}
            </span>
          ))}
          <span className="ml-2">· Đáp án {q.correct_letter ?? "?"}</span>
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {q.answer_updated && <p className="text-xs text-amber-300">Đáp án đã được cập nhật sau lượt này.</p>}
      {open &&
        (q.content ? (
          <div className="text-sm text-slate-200 space-y-2 border-t border-slate-800 pt-2">
            {q.content.text && <p className="font-semibold whitespace-pre-line">{q.content.text}</p>}
            <ul className="space-y-1">
              {q.content.answers.map((a) => (
                <li key={a.letter} className={cn(a.letter === q.correct_letter && "text-emerald-300 font-bold")}>
                  ({a.letter}) {a.text}
                </li>
              ))}
            </ul>
            {q.content.explanation && <p className="text-xs text-emerald-300 whitespace-pre-line">Giải thích: {q.content.explanation}</p>}
            {q.content.transcript && <p className="text-xs text-cyan-200 whitespace-pre-line">Transcript: {q.content.transcript}</p>}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Cần mở khóa đề để xem lại nội dung câu.</p>
        ))}
    </div>
  );
};

/** So sánh 2–3 lần làm Full Test (E09). */
const ComparePage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const ids = useMemo(
    () => (params.get("ids") ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0),
    [params],
  );
  const [picking, setPicking] = useState(false);
  const [tab, setTab] = useState<"fixed" | "regressed" | "still_wrong" | "still_right">("fixed");

  const valid = ids.length >= 2 && ids.length <= 3;
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["analytics-compare", user?.id, ids.join(",")],
    queryFn: () => compareAttempts(ids),
    enabled: !!user && valid && !picking,
    retry: false,
  });

  const stillWrongIds = (data?.questions?.still_wrong ?? []).map((q) => q.question_id);
  const save = useMutation({
    mutationFn: () => bookmarkQuestions(stillWrongIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mistake-summary"] });
      toast({ title: `Đã lưu ${stillWrongIds.length} câu vào Sổ câu sai` });
    },
    onError: (err) => toast({ title: "Không lưu được", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  const retry = useMutation({
    mutationFn: () => createPracticeSession({ kind: "questions", question_ids: stillWrongIds, mode: "practice", feedback: "immediate" }),
    onSuccess: (s) => navigate(`/practice/session/${s.id}`),
    onError: (err) => toast({ title: "Không tạo được lượt luyện", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });

  return (
    <StudentLayout>
      <div className="w-full max-w-6xl mx-auto space-y-6 pb-16 font-sans">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white flex items-center gap-2.5">
            <GitCompare className="w-7 h-7 text-cyan-400" /> So sánh các lần làm đề
          </h1>
          {valid && !picking && (
            <button type="button" onClick={() => setPicking(true)} className="min-h-[40px] px-4 rounded-xl border border-slate-700 text-slate-200 text-sm font-bold">
              Đổi lượt so sánh
            </button>
          )}
        </div>

        {!valid || picking ? (
          <Picker initial={ids} />
        ) : isLoading ? (
          <Skeleton className="h-96 w-full rounded-3xl" />
        ) : isError || !data ? (
          <ErrorState
            title="Không tìm thấy bài làm"
            message={getFriendlyErrorMessage(error)}
            onRetry={() => setPicking(true)}
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#070e1c]/90">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-800">
                    <th className="p-3">Chỉ số</th>
                    {data.attempts.map((a, i) => (
                      <th key={a.id} className="p-3">
                        <div className="text-white font-bold">Lượt {i + 1}</div>
                        <div className="font-normal">{fmt(a.completed_at)}</div>
                        <div className="font-normal truncate max-w-[180px]">{a.title}</div>
                      </th>
                    ))}
                    <th className="p-3">Chênh lệch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {(
                    [
                      ["Tổng", "total_score", data.score_diff.total],
                      ["Listening", "listening_score", data.score_diff.listening],
                      ["Reading", "reading_score", data.score_diff.reading],
                    ] as const
                  ).map(([label, key, diff]) => (
                    <tr key={key}>
                      <td className="p-3 font-bold text-white">{label}</td>
                      {data.attempts.map((a) => (
                        <td key={a.id} className="p-3 text-slate-200">
                          {a[key] ?? "—"}
                        </td>
                      ))}
                      <td className="p-3">
                        <Delta v={diff} />
                      </td>
                    </tr>
                  ))}
                  {data.parts.map((p) => (
                    <tr key={p.part}>
                      <td className="p-3 text-slate-300">Part {p.part}</td>
                      {p.cells.map((c, i) => (
                        <td key={i} className="p-3 text-slate-200">
                          {c ? `${c.correct}/${c.total} (${c.accuracy ?? 0}%)` : <span className="text-slate-500">Không làm</span>}
                        </td>
                      ))}
                      <td className="p-3">
                        <Delta v={p.diff} suffix="%" />
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="p-3 text-slate-300">Thời gian · bỏ trống</td>
                    {data.attempts.map((a) => (
                      <td key={a.id} className="p-3 text-slate-200">
                        {a.time_spent_seconds !== null ? `${Math.round(a.time_spent_seconds / 60)} phút` : "—"} · {a.blank} câu
                      </td>
                    ))}
                    <td className="p-3" />
                  </tr>
                </tbody>
              </table>
            </div>

            {(data.category_changes.up.length > 0 || data.category_changes.down.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(
                  [
                    ["Tăng mạnh nhất", data.category_changes.up],
                    ["Giảm mạnh nhất", data.category_changes.down],
                  ] as const
                ).map(([title, list]) => (
                  <div key={title} className="p-4 rounded-2xl border border-slate-800 bg-[#070e1c]/90">
                    <h3 className="text-sm font-black text-white mb-2">{title}</h3>
                    {list.length === 0 ? (
                      <p className="text-xs text-slate-500">Không có</p>
                    ) : (
                      list.map((c) => (
                        <div key={`${c.part}-${c.category}`} className="flex justify-between text-sm py-1">
                          <span className="text-slate-300">
                            Part {c.part} · {c.label}
                          </span>
                          <span>
                            {c.before}% → {c.after}% <Delta v={c.delta} suffix="%" />
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            )}

            {data.questions ? (
              <div className="space-y-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-white">So sánh từng câu (lượt đầu → lượt cuối)</h2>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["fixed", "Sai → Đúng", data.questions.fixed.length],
                      ["regressed", "Đúng → Sai", data.questions.regressed.length],
                      ["still_wrong", "Sai cả hai lần", data.questions.still_wrong.length],
                      ["still_right", "Đúng cả hai lần", data.questions.still_right.length],
                    ] as const
                  ).map(([k, label, n]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setTab(k)}
                      className={cn(
                        "min-h-[40px] px-3 rounded-xl border text-xs font-bold",
                        tab === k ? "border-cyan-500 bg-cyan-500/15 text-cyan-200" : "border-slate-800 text-slate-300",
                      )}
                    >
                      {label} ({n})
                    </button>
                  ))}
                </div>
                {tab === "still_wrong" && stillWrongIds.length > 0 && data.questions.accessible && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={retry.isPending}
                      onClick={() => retry.mutate()}
                      className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold text-sm inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" /> Luyện lại {stillWrongIds.length} câu này
                    </button>
                    <button
                      type="button"
                      disabled={save.isPending}
                      onClick={() => save.mutate()}
                      className="min-h-[44px] px-4 rounded-xl border border-amber-500/50 text-amber-300 font-bold text-sm inline-flex items-center gap-1.5"
                    >
                      <BookmarkPlus className="w-4 h-4" /> Lưu vào Sổ câu sai
                    </button>
                  </div>
                )}
                <div className="space-y-2">
                  {data.questions[tab].length === 0 ? (
                    <p className="text-sm text-slate-500">Không có câu nào.</p>
                  ) : (
                    data.questions[tab].map((q) => <QuestionRow key={q.question_id} q={q} attempts={data.attempts.length} />)
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Hai đề khác nhau nên chỉ so theo Part và dạng câu.</p>
            )}
          </>
        )}
      </div>
    </StudentLayout>
  );
};

export default ComparePage;
