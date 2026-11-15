import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ListChecks } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { FormulaCard } from "@/components/grammar/LessonView";
import { cn } from "@/lib/utils";
import { LEVELS, LEVEL_LABELS, getFormulaSheet, type GrammarLevel } from "@/lib/api/grammar";

/** Bảng công thức tổng hợp (G02): công thức của mọi chủ điểm đang hiện, lọc theo nhóm và cấp độ. */
const GrammarFormulasPage: React.FC = () => {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["grammar-formulas"], queryFn: getFormulaSheet });
  const [group, setGroup] = useState<string>("all");
  const [level, setLevel] = useState<GrammarLevel | "all">("all");
  const groups = useMemo(() => [...new Set((data ?? []).map((d) => d.topic.group))], [data]);
  const shown = (data ?? []).filter((d) => (group === "all" || d.topic.group === group) && (level === "all" || d.topic.level === level));

  const chip = (active: boolean) =>
    cn("min-h-[40px] px-3 rounded-xl border text-xs font-bold whitespace-nowrap", active ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-slate-700 text-slate-300");

  return (
    <StudentLayout>
      <div className="w-full max-w-4xl mx-auto space-y-5 pb-16 font-sans">
        <Link to="/grammar" className="text-sm text-slate-400 hover:text-white inline-flex items-center gap-1.5 min-h-[40px]">
          <ArrowLeft className="w-4 h-4" /> Grammar Center
        </Link>
        <h1 className="text-2xl font-display font-black text-white flex items-center gap-2.5">
          <ListChecks className="w-7 h-7 text-cyan-400" /> Bảng công thức tổng hợp
        </h1>
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-3xl" />
        ) : isError ? (
          <ErrorState title="Không tải được bảng công thức" message="Vui lòng thử lại." onRetry={() => refetch()} />
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button type="button" className={chip(group === "all")} onClick={() => setGroup("all")}>
                Mọi nhóm
              </button>
              {groups.map((g) => (
                <button key={g} type="button" className={chip(group === g)} onClick={() => setGroup(g)}>
                  {g}
                </button>
              ))}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button type="button" className={chip(level === "all")} onClick={() => setLevel("all")}>
                Mọi cấp độ
              </button>
              {LEVELS.map((l) => (
                <button key={l} type="button" className={chip(level === l)} onClick={() => setLevel(l)}>
                  {LEVEL_LABELS[l]}
                </button>
              ))}
            </div>
            {shown.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Không có công thức nào khớp bộ lọc.</p>
            ) : (
              shown.map((d) => (
                <section key={d.topic.slug} className="space-y-3">
                  <Link to={`/grammar/${d.topic.slug}?tab=formulas`} className="text-base font-bold text-white hover:text-cyan-300 inline-flex items-center min-h-[40px]">
                    {d.topic.name}
                    <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-800 text-[11px] text-slate-300">{LEVEL_LABELS[d.topic.level]}</span>
                  </Link>
                  <div className="grid md:grid-cols-2 gap-3">
                    {d.formulas.map((f) => (
                      <FormulaCard key={f.id} formula={f} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </>
        )}
      </div>
    </StudentLayout>
  );
};

export default GrammarFormulasPage;
