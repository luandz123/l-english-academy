import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowRight, Flame, GitCompare, LineChart as LineIcon, Target } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { getProgress, LEVEL_CLASS, type ScorePoint } from "@/lib/api/analytics";
import { getMyRoadmap } from "@/lib/api/roadmap";
import { listMyQuizResults } from "@/lib/api/assessment";
import { listMyFullTestResults } from "@/lib/api/fullTest";
import { listMyProgressRows } from "@/lib/api/learning";
import { computeActivityStats } from "@/lib/activityStats";
import { RecommendationCard, TrendBadge, WeaknessCard } from "@/components/analysis/AnalysisBits";

const CARD = "p-5 sm:p-6 rounded-3xl border border-slate-800 bg-[#070e1c]/90";
const KIND_LABELS: Record<string, string> = {
  full_test: "Full Test",
  question_type: "Theo dạng câu",
  mini_test: "Mini Test",
  daily: "Daily Challenge",
  diagnostic: "Kiểm tra trình độ",
  mistakes: "Câu sai",
  retry: "Luyện lại",
};
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

/** Tiến độ học tập (P10): điểm đang ở đâu, đi lên thế nào, học đều không, còn cách mục tiêu bao xa. */
const ProgressPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chartWindow, setChartWindow] = useState<"30" | "90" | "all">("all");
  const [compare, setCompare] = useState<number[]>([]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["analytics-progress", user?.id],
    queryFn: getProgress,
    enabled: !!user,
  });
  const { data: roadmap } = useQuery({ queryKey: ["roadmap", user?.id], queryFn: getMyRoadmap, enabled: !!user });
  // Chuỗi ngày học: cùng nguồn và cùng cách tính với Hồ sơ
  const { data: quizResults = [] } = useQuery({
    queryKey: ["profile-quiz-results", user?.id],
    queryFn: async () => (await listMyQuizResults()).data || [],
    enabled: !!user,
  });
  const { data: fullTestResults = [] } = useQuery({
    queryKey: ["profile-fulltest-results", user?.id],
    queryFn: async () => (await listMyFullTestResults()).data || [],
    enabled: !!user,
  });
  const { data: lessonProgress = [] } = useQuery({
    queryKey: ["profile-lesson-progress", user?.id],
    queryFn: async () => (await listMyProgressRows()).data || [],
    enabled: !!user,
  });
  const streak = useMemo(
    () => computeActivityStats({ quizResults, fullTestResults, lessonProgress }),
    [quizResults, fullTestResults, lessonProgress],
  );

  const target = roadmap?.target_score ?? null;
  const points = useMemo(() => {
    const all = data?.score_points ?? [];
    if (chartWindow === "all") return all;
    const since = Date.now() - Number(chartWindow) * 86_400_000;
    return all.filter((p) => new Date(p.date).getTime() >= since);
  }, [data, chartWindow]);

  if (isLoading) {
    return (
      <StudentLayout>
        <Skeleton className="h-[480px] w-full max-w-6xl mx-auto rounded-3xl" />
      </StudentLayout>
    );
  }
  if (isError || !data) {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto my-16">
          <ErrorState title="Không tải được tiến độ" message="Vui lòng thử lại." onRetry={() => refetch()} />
        </div>
      </StudentLayout>
    );
  }

  const header = (
    <div>
      <h1 className="text-2xl sm:text-3xl font-display font-black text-white flex items-center gap-2.5">
        <LineIcon className="w-7 h-7 text-cyan-400" /> Tiến độ học tập
      </h1>
      <p className="text-sm text-slate-400 mt-1">Điểm ước lượng, đường điểm qua thời gian, mức đều đặn và khoảng cách tới mục tiêu.</p>
    </div>
  );

  if (data.state === "empty") {
    return (
      <StudentLayout>
        <div className="w-full max-w-4xl mx-auto space-y-6 font-sans">
          {header}
          <div className="p-8 rounded-3xl border border-cyan-500/25 bg-[#070e1c]/90 text-center space-y-4">
            <Activity className="w-10 h-10 text-cyan-400 mx-auto" />
            <p className="text-white font-bold text-lg">Làm một bài đầu tiên để bắt đầu theo dõi tiến độ</p>
            <Link to="/diagnostic" className="min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm inline-flex items-center">
              Làm bài kiểm tra trình độ
            </Link>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const est = data.estimate;
  const phase = roadmap ? roadmap.phases[roadmap.summary.current_phase_index] : null;
  const fullHistory = data.history.filter((h) => h.kind === "full_test");
  const toggleCompare = (id: number) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 3 ? c : [...c, id]));

  return (
    <StudentLayout>
      <div className="w-full max-w-6xl mx-auto space-y-6 pb-16 font-sans">
        {header}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className={cn(CARD, "space-y-1")}>
            <div className="text-xs text-slate-400">Điểm ước lượng hiện tại</div>
            {est ? (
              <>
                <div className="text-2xl sm:text-3xl font-black text-white">{est.range ? `${est.range.min}–${est.range.max}` : est.total}</div>
                <div className="text-xs text-slate-400">
                  L {est.listening ?? "—"} · R {est.reading ?? "—"} · {new Date(est.date).toLocaleDateString("vi-VN")}
                </div>
                {est.stale && <div className="text-xs text-amber-300">Dựa trên bài làm cách đây {est.age_days} ngày — nên làm bài mới</div>}
                {data.change_30d !== null && (
                  <div className={cn("text-xs font-bold", data.change_30d >= 0 ? "text-emerald-300" : "text-rose-300")}>
                    {data.change_30d >= 0 ? "+" : ""}
                    {data.change_30d} điểm trong 30 ngày
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-xl font-black text-slate-400">Chưa có</div>
                <div className="text-xs text-slate-400">Làm Full Test hoặc bài kiểm tra trình độ để có điểm</div>
              </>
            )}
          </div>
          <div className={cn(CARD, "space-y-1")}>
            <div className="text-xs text-slate-400">Mục tiêu</div>
            {target ? (
              <>
                <div className="text-2xl sm:text-3xl font-black text-white">{target}</div>
                {est && <div className="text-xs text-cyan-300">{target > est.total ? `còn ${target - est.total} điểm` : "Đã đạt mục tiêu"}</div>}
              </>
            ) : (
              <>
                <div className="text-sm font-bold text-slate-400">Chưa đặt mục tiêu</div>
                <Link to="/roadmap" className="text-xs text-cyan-400 font-bold">Tạo lộ trình</Link>
              </>
            )}
          </div>
          <div className={cn(CARD, "space-y-1")}>
            <div className="text-xs text-slate-400">Số câu đã làm (30 ngày)</div>
            <div className="text-2xl sm:text-3xl font-black text-white">{data.last_30d.answered}</div>
            {data.last_30d.accuracy !== null && <div className="text-xs text-slate-400">Tỉ lệ đúng {data.last_30d.accuracy}%</div>}
          </div>
          <div className={cn(CARD, "space-y-1")}>
            <div className="text-xs text-slate-400">Chuỗi ngày học</div>
            <div className="text-2xl sm:text-3xl font-black text-white flex items-center gap-1.5">
              <Flame className="w-6 h-6 text-orange-400" /> {streak.currentStreak}
            </div>
            <div className="text-xs text-slate-400">Dài nhất {streak.maxYearStreak} ngày</div>
          </div>
        </div>

        <div className={CARD}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Điểm theo thời gian</h2>
            <div className="flex gap-1.5">
              {(["30", "90", "all"] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setChartWindow(w)}
                  className={cn(
                    "min-h-[36px] px-3 rounded-lg border text-xs font-bold",
                    chartWindow === w ? "border-cyan-500 bg-cyan-500/15 text-cyan-200" : "border-slate-800 text-slate-300",
                  )}
                >
                  {w === "all" ? "Toàn bộ" : `${w} ngày`}
                </button>
              ))}
            </div>
          </div>
          {data.score_points.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Làm Full Test đủ 7 Part hoặc bài kiểm tra trình độ để có điểm trên biểu đồ.</p>
          ) : points.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Không có bài cho ra điểm trong khoảng này.</p>
          ) : (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={points.map((p: ScorePoint) => ({ ...p, day: fmtDay(p.date) }))}
                    onClick={(e: { activePayload?: { payload: ScorePoint }[] } | null) => {
                      const p = e?.activePayload?.[0]?.payload;
                      if (p) navigate(p.link);
                    }}
                  >
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                    <YAxis domain={[0, 990]} stroke="#64748b" fontSize={11} width={36} />
                    <Tooltip
                      contentStyle={{ background: "#070e1c", border: "1px solid #1e293b", borderRadius: 12, fontSize: 12 }}
                      labelFormatter={(_l, payload) => {
                        const p = payload?.[0]?.payload as ScorePoint | undefined;
                        return p ? `${p.title} · ${new Date(p.date).toLocaleDateString("vi-VN")} (bấm để xem kết quả)` : "";
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {target && <ReferenceLine y={target} stroke="#f59e0b" strokeDasharray="6 4" label={{ value: "Mục tiêu", fill: "#f59e0b", fontSize: 11 }} />}
                    <Line type="monotone" dataKey="total" name="Tổng" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="listening" name="Listening" stroke="#a78bfa" strokeWidth={1.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="reading" name="Reading" stroke="#34d399" strokeWidth={1.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {data.score_points.length === 1 && <p className="text-xs text-slate-400 mt-2">Cần thêm ít nhất 1 bài nữa để thấy xu hướng.</p>}
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={CARD}>
            <h2 className="text-sm font-black uppercase tracking-wider text-white mb-3">Tỉ lệ đúng theo Part (30 ngày)</h2>
            <div className="space-y-2">
              {data.parts.map((p) => (
                <Link key={p.part} to={`/analysis?part=${p.part}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/50 min-h-[44px]">
                  <span className="w-14 text-sm font-bold text-white">Part {p.part}</span>
                  <span className="flex-1 text-sm text-slate-300">
                    {p.answered === 0 ? (
                      <span className="text-slate-500">Chưa làm</span>
                    ) : (
                      <>
                        {p.previous_accuracy !== null ? `${p.previous_accuracy}% → ` : ""}
                        <b className={LEVEL_CLASS[p.level].text}>{p.accuracy}%</b> <span className="text-xs text-slate-500">({p.answered} câu)</span>
                      </>
                    )}
                  </span>
                  <TrendBadge trend={p.trend} />
                </Link>
              ))}
            </div>
          </div>

          <div className={CARD}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">Hoạt động 8 tuần</h2>
              <Link to="/profile" className="text-xs text-cyan-400 font-bold">Xem lịch hoạt động cả năm</Link>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weekly.map((w) => ({ ...w, day: fmtDay(w.week_start), minutes: Math.round(w.seconds / 60) }))}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} width={30} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#070e1c", border: "1px solid #1e293b", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number, n: string) => [`${v} câu`, n]}
                    labelFormatter={(l, payload) => {
                      const m = (payload?.[0]?.payload as { minutes?: number } | undefined)?.minutes ?? 0;
                      return `Tuần từ ${l} · ${m} phút làm bài`;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="listening" name="Listening" stackId="a" fill="#a78bfa" />
                  <Bar dataKey="reading" name="Reading" stackId="a" fill="#34d399" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">Điểm yếu hàng đầu</h2>
              <Link to="/analysis" className="text-xs text-cyan-400 font-bold inline-flex items-center gap-1">
                Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {data.weaknesses.length === 0 ? (
              <p className={cn(CARD, "text-sm text-slate-400")}>Chưa đủ dữ liệu để kết luận điểm yếu (cần ≥ 10 câu một dạng trong 30 ngày).</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-3">
                {data.weaknesses.map((w) => (
                  <WeaknessCard key={`${w.part}-${w.category}`} item={w} compact />
                ))}
              </div>
            )}
          </div>
          <RecommendationCard />
        </div>

        <div className={CARD}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Lịch sử làm bài</h2>
            <div className="flex items-center gap-2">
              {compare.length >= 2 && (
                <Link
                  to={`/fulltests/compare?ids=${compare.join(",")}`}
                  className="min-h-[40px] px-3 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold inline-flex items-center gap-1"
                >
                  <GitCompare className="w-4 h-4" /> So sánh ({compare.length})
                </Link>
              )}
              <Link to="/practice/history" className="text-xs text-cyan-400 font-bold">Xem tất cả</Link>
            </div>
          </div>
          {fullHistory.length >= 2 && <p className="text-xs text-slate-500 mb-2">Chọn 2–3 Full Test để so sánh.</p>}
          <ul className="divide-y divide-slate-800">
            {data.history.map((h) => {
              const id = Number(h.id);
              const checked = compare.includes(id);
              return (
                <li key={`${h.kind}-${h.id}`} className="py-2.5 flex items-center gap-3">
                  {h.kind === "full_test" && fullHistory.length >= 2 ? (
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && compare.length >= 3}
                      onChange={() => toggleCompare(id)}
                      aria-label="Chọn để so sánh"
                      className="w-5 h-5 accent-cyan-500 shrink-0"
                    />
                  ) : (
                    <span className="w-5 shrink-0" />
                  )}
                  <Link to={h.link} className="flex-1 min-w-0 flex items-center justify-between gap-3 min-h-[40px]">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{h.title}</div>
                      <div className="text-xs text-slate-400">
                        {KIND_LABELS[h.kind] ?? h.kind}
                        {h.date ? ` · ${new Date(h.date).toLocaleDateString("vi-VN")}` : ""}
                        {h.parts && h.parts.length < 7 ? ` · Part ${h.parts.join(", ")}` : ""}
                      </div>
                    </div>
                    <span className="text-sm font-black text-white shrink-0">
                      {h.score !== null ? `${h.score}/990` : `${h.correct ?? 0}/${h.total ?? 0}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {compare.length >= 3 && <p className="text-xs text-amber-300 mt-2">Tối đa 3 lượt.</p>}
        </div>

        {roadmap && phase && (
          <div className="p-4 rounded-2xl border border-cyan-500/25 bg-cyan-500/5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-slate-200 flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" /> Theo lộ trình bạn đang ở tuần {roadmap.summary.current_week}/{roadmap.summary.total_weeks}, chặng {phase.title}{" "}
              {phase.from_score}–{phase.to_score}
            </span>
            <Link to="/roadmap" className="min-h-[40px] px-3 rounded-xl border border-cyan-500/40 text-cyan-300 text-xs font-bold inline-flex items-center">
              Mở lộ trình
            </Link>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default ProgressPage;
