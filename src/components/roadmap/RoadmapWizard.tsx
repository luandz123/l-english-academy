import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ClipboardCheck, Clock, Loader2, Target, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  markPlacementStarted,
  type Roadmap,
  type RoadmapCurrentMode,
  type RoadmapPlacement,
  type RoadmapPurpose,
  type SaveRoadmapBody,
} from "@/lib/api/roadmap";
import { PURPOSE_LABELS } from "./roadmapLabels";
import { loadDraft, saveDraft, type WizardDraft } from "./roadmapDraft";

const SCORE_CHIPS = [250, 350, 450, 550, 650, 750];
const TARGET_CHIPS = [450, 550, 650, 750, 800, 900];
const MONTH_CHIPS = [
  { months: 1, weeks: 4 },
  { months: 2, weeks: 9 },
  { months: 3, weeks: 13 },
  { months: 4, weeks: 17 },
  { months: 6, weeks: 26 },
];
const MINUTE_CHIPS = [30, 60, 90, 120];
const PURPOSE_HINTS: Record<RoadmapPurpose, string> = {
  graduation: "Đạt chuẩn đầu ra",
  job: "Chứng chỉ cho hồ sơ",
  promotion: "Đáp ứng yêu cầu công ty",
  reflex: "Nghe – phản xạ tốt hơn",
};


function defaultDraft(existing: Roadmap | null): WizardDraft {
  return {
    step: 1,
    mode: existing?.current_mode ?? "score",
    score: existing && existing.current_mode === "score" ? String(existing.current_score) : "",
    target: existing ? String(existing.target_score) : "",
    purpose: existing?.purpose ?? "job",
    timeframe: existing?.exam_date ? "date" : "weeks",
    weeks: existing?.exam_date ? 13 : existing?.duration_weeks ?? 13,
    examDate: existing?.exam_date ?? "",
    minutes: existing?.minutes_per_day ?? 60,
    days: existing?.days_per_week ?? 5,
  };
}

const card =
  "p-5 sm:p-7 rounded-3xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)]";
const chip = (active: boolean) =>
  cn(
    "min-h-[44px] px-4 rounded-xl border text-sm font-bold transition-all active:scale-95",
    active
      ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
      : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-cyan-500/50 hover:text-white",
  );
const inputCls =
  "w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#030712] px-4 text-white font-bold focus:outline-none focus:border-cyan-400";

const STEPS = ["Điểm xuất phát", "Mục tiêu", "Quỹ thời gian", "Lộ trình"];

const todayPlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface Props {
  existing: Roadmap | null;
  placement: RoadmapPlacement | undefined;
  submitting: boolean;
  error: string | null;
  onSubmit: (body: SaveRoadmapBody) => void;
  onCancel?: () => void;
}

export const RoadmapWizard: React.FC<Props> = ({ existing, placement, submitting, error, onSubmit, onCancel }) => {
  const navigate = useNavigate();
  const [d, setD] = useState<WizardDraft>(() => loadDraft() ?? defaultDraft(existing));
  const set = (patch: Partial<WizardDraft>) => setD((prev) => ({ ...prev, ...patch }));
  // Chỉ báo lỗi của bước sau khi học viên bấm "Tiếp tục"
  const [showErrors, setShowErrors] = useState(false);

  // Giữ nháp khi rời sang làm bài test nhanh rồi quay lại
  useEffect(() => saveDraft(d), [d]);

  const placementResult = placement?.latest_result ?? null;
  const currentScore =
    d.mode === "score" ? Number(d.score) || null : d.mode === "none" ? 150 : placementResult?.estimated_score ?? null;
  const target = Number(d.target) || null;

  const step1Error =
    d.mode === "score"
      ? !d.score
        ? "Nhập điểm TOEIC hiện tại"
        : !Number.isInteger(Number(d.score)) || Number(d.score) < 10 || Number(d.score) > 985
          ? "Điểm hiện tại từ 10 đến 985"
          : null
      : d.mode === "placement" && !placementResult
        ? "Hãy làm bài test nhanh trước"
        : null;
  const step2Error = !target
    ? "Chọn hoặc nhập điểm mục tiêu"
    : target < 300 || target > 990 || target % 5 !== 0
      ? "Điểm mục tiêu từ 300 đến 990, bội số của 5"
      : currentScore !== null && target <= currentScore
        ? `Mục tiêu phải cao hơn điểm xuất phát (${currentScore})`
        : null;
  const step3Error = d.timeframe === "date" && !d.examDate ? "Chọn ngày dự kiến thi" : null;
  const stepError = d.step === 1 ? step1Error : d.step === 2 ? step2Error : step3Error;

  const startPlacement = () => {
    if (!placement?.quiz) return;
    saveDraft({ ...d, mode: "placement" });
    markPlacementStarted(placement.quiz.id);
    navigate(`/courses/${placement.quiz.course_id}/quiz/${placement.quiz.id}`);
  };

  const submit = () => {
    const body: SaveRoadmapBody = {
      current_mode: d.mode,
      target_score: Number(d.target),
      purpose: d.purpose,
      minutes_per_day: d.minutes,
      days_per_week: d.days,
      ...(d.mode === "score" ? { current_score: Number(d.score) } : {}),
      ...(d.timeframe === "date" ? { exam_date: d.examDate } : { duration_weeks: d.weeks }),
    };
    onSubmit(body);
  };

  const next = () => {
    if (stepError) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (d.step < 3) set({ step: d.step + 1 });
    else {
      submit();
    }
  };

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < d.step;
          const active = n === d.step;
          return (
            <li key={label} className="flex flex-col items-center gap-1.5 text-center">
              <span
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border",
                  done && "bg-cyan-500 border-cyan-400 text-slate-950",
                  active && "bg-cyan-500/20 border-cyan-400 text-cyan-200",
                  !done && !active && "bg-slate-900 border-slate-700 text-slate-500",
                )}
              >
                {done ? <Check className="w-4 h-4" /> : n}
              </span>
              <span className={cn("text-[11px] sm:text-xs font-bold", active ? "text-white" : "text-slate-400")}>{label}</span>
            </li>
          );
        })}
      </ol>

      <div className={cn(card, "space-y-6")}>
        {d.step === 1 && (
          <>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">Điểm TOEIC hiện tại của bạn?</h2>
              <p className="text-sm text-slate-400 mt-1">Dùng để tính bạn cần bao nhiêu giờ học.</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {(
                [
                  { mode: "score", title: "Tôi biết điểm", desc: "Điểm thi thật hoặc đề thử gần đây" },
                  { mode: "none", title: "Chưa thi / Mất gốc", desc: "Bắt đầu từ nền tảng" },
                  ...(placement?.quiz ? [{ mode: "placement", title: "Làm bài test nhanh", desc: "Không rõ trình độ hiện tại" }] : []),
                ] as Array<{ mode: RoadmapCurrentMode; title: string; desc: string }>
              ).map((o) => (
                <button
                  key={o.mode}
                  type="button"
                  onClick={() => set({ mode: o.mode })}
                  className={cn(
                    "text-left p-4 rounded-2xl border transition-all min-h-[44px]",
                    d.mode === o.mode ? "border-cyan-400 bg-cyan-500/10" : "border-slate-700 bg-slate-900/50 hover:border-cyan-500/50",
                  )}
                >
                  <div className="font-bold text-white">{o.title}</div>
                  <div className="text-xs text-slate-400 mt-1">{o.desc}</div>
                </button>
              ))}
            </div>

            {d.mode === "score" && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {SCORE_CHIPS.map((s) => (
                    <button key={s} type="button" className={chip(d.score === String(s))} onClick={() => set({ score: String(s) })}>
                      {s}
                    </button>
                  ))}
                </div>
                <label className="block max-w-xs">
                  <span className="text-xs font-bold text-slate-400">Hoặc nhập chính xác</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={10}
                    max={985}
                    step={5}
                    value={d.score}
                    onChange={(e) => set({ score: e.target.value })}
                    className={cn(inputCls, "mt-1")}
                    placeholder="VD: 420"
                  />
                </label>
              </div>
            )}

            {d.mode === "placement" && placement?.quiz && (
              <div className="p-4 rounded-2xl bg-[#030712]/90 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <ClipboardCheck className="w-5 h-5 text-cyan-400" /> {placement.quiz.title}
                </div>
                <p className="text-sm text-slate-400">
                  {placement.quiz.total_questions} câu
                  {placement.quiz.time_limit_seconds ? ` · khoảng ${Math.round(placement.quiz.time_limit_seconds / 60)} phút` : ""}. Làm xong
                  bạn quay lại đây, lựa chọn đã nhập được giữ nguyên.
                </p>
                {placementResult && (
                  <p className="text-sm text-emerald-300 font-bold">
                    Kết quả gần nhất: đúng {placementResult.correct_answers}/{placementResult.total_questions} câu → ước lượng khoảng{" "}
                    {placementResult.estimated_score} điểm.
                  </p>
                )}
                <button
                  type="button"
                  onClick={startPlacement}
                  className="min-h-[44px] px-4 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-sm font-bold inline-flex items-center gap-2"
                >
                  <Timer className="w-4 h-4" /> {placementResult ? "Làm lại bài test" : "Bắt đầu bài test"}
                </button>
              </div>
            )}
          </>
        )}

        {d.step === 2 && (
          <>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">Bạn muốn đạt bao nhiêu điểm?</h2>
              {currentScore !== null && <p className="text-sm text-slate-400 mt-1">Điểm xuất phát: {currentScore}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {TARGET_CHIPS.map((s) => (
                <button key={s} type="button" className={chip(d.target === String(s))} onClick={() => set({ target: String(s) })}>
                  {s}+
                </button>
              ))}
            </div>
            <label className="block max-w-xs">
              <span className="text-xs font-bold text-slate-400">Hoặc nhập con số cụ thể</span>
              <input
                type="number"
                inputMode="numeric"
                min={300}
                max={990}
                step={5}
                value={d.target}
                onChange={(e) => set({ target: e.target.value })}
                className={cn(inputCls, "mt-1")}
                placeholder="VD: 700"
              />
            </label>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-300">Mục đích học</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {(Object.keys(PURPOSE_LABELS) as RoadmapPurpose[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set({ purpose: p })}
                    className={cn(
                      "text-left p-4 rounded-2xl border transition-all min-h-[44px]",
                      d.purpose === p ? "border-cyan-400 bg-cyan-500/10" : "border-slate-700 bg-slate-900/50 hover:border-cyan-500/50",
                    )}
                  >
                    <div className="font-bold text-white text-sm">{PURPOSE_LABELS[p]}</div>
                    <div className="text-xs text-slate-400 mt-1">{PURPOSE_HINTS[p]}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {d.step === 3 && (
          <>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">Bạn có bao nhiêu thời gian?</h2>
            </div>

            <div className="space-y-3">
              <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-700">
                {(
                  [
                    { k: "weeks", label: "Tổng thời gian", icon: Clock },
                    { k: "date", label: "Ngày thi", icon: CalendarDays },
                  ] as const
                ).map(({ k, label, icon: Icon }) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set({ timeframe: k })}
                    className={cn(
                      "min-h-[40px] px-4 rounded-lg text-sm font-bold inline-flex items-center gap-1.5",
                      d.timeframe === k ? "bg-cyan-500/20 text-cyan-200" : "text-slate-400",
                    )}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>

              {d.timeframe === "weeks" ? (
                <div className="flex flex-wrap gap-2">
                  {MONTH_CHIPS.map((m) => (
                    <button key={m.months} type="button" className={chip(d.weeks === m.weeks)} onClick={() => set({ weeks: m.weeks })}>
                      {m.months} tháng
                    </button>
                  ))}
                </div>
              ) : (
                <label className="block max-w-xs">
                  <span className="text-xs font-bold text-slate-400">Ngày dự kiến thi (cách hôm nay ít nhất 2 tuần)</span>
                  <input
                    type="date"
                    min={todayPlus(14)}
                    max={todayPlus(730)}
                    value={d.examDate}
                    onChange={(e) => set({ examDate: e.target.value })}
                    className={cn(inputCls, "mt-1 [color-scheme:dark]")}
                  />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-300">Mỗi ngày học</h3>
              <div className="flex flex-wrap gap-2">
                {MINUTE_CHIPS.map((m) => (
                  <button key={m} type="button" className={chip(d.minutes === m)} onClick={() => set({ minutes: m })}>
                    {m < 60 ? `${m} phút` : `${m / 60} tiếng`.replace(".5", ",5")}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-300">Số ngày rảnh mỗi tuần</h3>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button key={n} type="button" className={cn(chip(d.days === n), "w-12 px-0")} onClick={() => set({ days: n })}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {((showErrors && stepError) || error) && (
          <p className="text-sm font-bold text-rose-300" role="alert">
            {error ?? stepError}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          {d.step > 1 ? (
            <button
              type="button"
              onClick={() => {
                setShowErrors(false);
                set({ step: d.step - 1 });
              }}
              className="min-h-[44px] px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-sm font-bold text-slate-200 inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại
            </button>
          ) : onCancel ? (
            <button
              type="button"
              onClick={() => {
                saveDraft(null);
                onCancel();
              }}
              className="min-h-[44px] px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-sm font-bold text-slate-200"
            >
              Hủy
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={next}
            disabled={submitting}
            className="btn-3d btn-3d-primary min-h-[44px] px-6 text-sm font-extrabold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang tạo lộ trình...
              </>
            ) : d.step < 3 ? (
              <>
                Tiếp tục <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Target className="w-4 h-4" /> Tạo lộ trình
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

