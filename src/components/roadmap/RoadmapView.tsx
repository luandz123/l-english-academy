import React from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileCheck2,
  Hourglass,
  Layers,
  PenLine,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Roadmap, RoadmapResource } from "@/lib/api/roadmap";
import { PURPOSE_LABELS, STATUS_META, formatDate } from "./roadmapLabels";
import { RoadmapPersonalPanel } from "./RoadmapPersonalPanel";

const card =
  "p-5 sm:p-7 rounded-3xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)]";

const FOCUS_ROWS = [
  { key: "listening", label: "Nghe", color: "bg-cyan-400" },
  { key: "reading", label: "Đọc", color: "bg-blue-500" },
  { key: "grammar", label: "Ngữ pháp", color: "bg-amber-400" },
  { key: "vocab", label: "Từ vựng", color: "bg-emerald-400" },
] as const;

const RESOURCE_ICON: Record<RoadmapResource["type"], React.ElementType> = {
  module: BookOpen,
  vocab: Layers,
  full_test: FileCheck2,
};

const hours = (h: number) => `${Math.round(h)} giờ`;

interface Props {
  roadmap: Roadmap;
  onRedo: () => void;
  onDelete: () => void;
  deleting: boolean;
}

export const RoadmapView: React.FC<Props> = ({ roadmap, onRedo, onDelete, deleting }) => {
  const s = roadmap.summary;
  const status = STATUS_META[s.status];
  const weekPercent = Math.round((s.current_week / s.total_weeks) * 100);

  return (
    <div className="space-y-6">
      {/* Tổng quan */}
      <div className={cn(card, "space-y-5 relative overflow-hidden")}>
        <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              {PURPOSE_LABELS[roadmap.purpose]}
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-white mt-1">
              {roadmap.current_score} → {roadmap.target_score}+ TOEIC
            </h2>
            <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              {formatDate(roadmap.started_at)} – {formatDate(roadmap.end_date)}
              {roadmap.exam_date ? ` · thi ngày ${formatDate(roadmap.exam_date)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRedo}
              className="min-h-[44px] px-4 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-sm font-bold inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Làm lại lộ trình
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={onDelete}
              className="min-h-[44px] px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-sm font-bold text-slate-300 disabled:opacity-50"
            >
              Xóa
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Hourglass, label: "Tổng giờ cần học", value: hours(s.required_hours) },
            { icon: Clock, label: "Quỹ giờ của bạn", value: hours(s.available_hours), sub: `${s.weekly_hours} giờ/tuần` },
            { icon: CalendarDays, label: "Thời gian", value: `${s.total_weeks} tuần` },
            { icon: Target, label: "Đang ở", value: `Tuần ${s.current_week}/${s.total_weeks}` },
          ].map((t) => (
            <div key={t.label} className="p-4 rounded-2xl bg-[#030712]/90 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                <t.icon className="w-4 h-4 text-cyan-400" /> {t.label}
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">{t.value}</div>
              {t.sub && <div className="text-xs text-slate-400">{t.sub}</div>}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-300 font-medium">Thời gian đã đi</span>
            <span className="text-white font-extrabold">{weekPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#030712] border border-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" style={{ width: `${weekPercent}%` }} />
          </div>
        </div>

        <div className={cn("p-4 rounded-2xl border flex gap-3", status.className)}>
          {s.status === "on_track" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            <p className="font-extrabold">{status.label}</p>
            {s.status === "on_track" ? (
              <p className="text-slate-200 mt-0.5">Quỹ thời gian đủ để đạt mục tiêu nếu bạn học đều đặn.</p>
            ) : (
              <p className="text-slate-200 mt-0.5">
                Với {roadmap.minutes_per_day} phút/ngày, bạn có thể đạt khoảng {s.achievable_score} điểm. Để đạt{" "}
                {roadmap.target_score}, hãy học khoảng {s.recommended_minutes_per_day} phút mỗi ngày ({roadmap.days_per_week} ngày/tuần)
                hoặc kéo dài thời gian.
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-slate-300 flex gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" /> {roadmap.purpose_note}
        </p>
      </div>

      {/* Cá nhân hóa theo điểm yếu (P03) */}
      <RoadmapPersonalPanel roadmap={roadmap} />

      {/* Các chặng */}
      <div className="space-y-4">
        {roadmap.phases.map((p, i) => {
          const isCurrent = i === s.current_phase_index;
          const isDone = i < s.current_phase_index;
          return (
            <section
              key={p.key}
              className={cn(
                card,
                "space-y-4",
                isCurrent && "border-cyan-400/70 shadow-[0_0_30px_rgba(6,182,212,0.15)]",
                isDone && "opacity-70",
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex gap-3">
                  <span
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 border",
                      isCurrent ? "bg-cyan-500 text-slate-950 border-cyan-400" : "bg-slate-900 text-slate-300 border-slate-700",
                    )}
                  >
                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2 flex-wrap">
                      {p.title}
                      {isCurrent && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300">
                          Đang học
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-slate-400 mt-0.5">{p.description}</p>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 font-bold sm:text-right shrink-0">
                  <div>
                    Tuần {p.start_week}
                    {p.end_week > p.start_week ? `–${p.end_week}` : ""} · {hours(p.hours)}
                  </div>
                  <div className="text-slate-500 font-medium">
                    {formatDate(p.start_date)} – {formatDate(p.end_date)}
                  </div>
                  {p.key !== "test_practice" && (
                    <div className="text-cyan-300">
                      Mốc: {p.from_score} → {p.to_score}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {FOCUS_ROWS.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-bold">{f.label}</span>
                      <span className="text-white font-extrabold">{p.focus[f.key]}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#030712] border border-slate-800 overflow-hidden">
                      <div className={cn("h-full rounded-full", f.color)} style={{ width: `${p.focus[f.key]}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <TopicList title="Ngữ pháp" icon={PenLine} items={p.grammar_topics} />
                <TopicList title="Từ vựng" icon={Layers} items={p.vocab_topics} />
                <TopicList title="Luyện tập" icon={Target} items={p.practice} />
              </div>

              {p.resources.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    {p.key === "test_practice" ? "Đề luyện" : "Bài học & đề luyện gợi ý"}
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {p.resources.map((r) => {
                      const Icon = RESOURCE_ICON[r.type];
                      return (
                        <Link
                          key={`${r.type}-${r.id}`}
                          to={r.url}
                          className="min-h-[44px] p-3 rounded-xl bg-[#030712]/80 border border-slate-800 hover:border-cyan-500/50 flex items-center gap-3 transition-colors"
                        >
                          <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="min-w-0">
                            <span className="block text-sm font-bold text-white truncate">{r.title}</span>
                            {r.subtitle && <span className="block text-xs text-slate-500 truncate">{r.subtitle}</span>}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

const TopicList: React.FC<{ title: string; icon: React.ElementType; items: string[] }> = ({ title, icon: Icon, items }) => (
  <div className="p-4 rounded-2xl bg-[#030712]/80 border border-slate-800">
    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
      <Icon className="w-4 h-4 text-cyan-400" /> {title}
    </h4>
    <ul className="mt-2 space-y-1.5">
      {items.map((t) => (
        <li key={t} className="text-sm text-slate-200 flex gap-2">
          <span className="text-cyan-400">•</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  </div>
);
