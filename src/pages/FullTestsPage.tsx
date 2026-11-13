import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Bookmark, FileCheck2, Filter, Layers, Search, X, Zap } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  DIFFICULTY_LABELS,
  EXAM_TYPE_LABELS,
  SKILL_LABELS,
  listExamLibrary,
  type ExamLibraryQuery,
  type Facet,
} from "@/lib/api/practice";
import { ExamCard } from "@/components/practice/ExamBits";
import { RecommendationCard } from "@/components/analysis/AnalysisBits";

type GroupKey = "years" | "difficulties" | "topics" | "types" | "skills" | "parts" | "statuses" | "access" | "verified";

const STATUS_LABELS: Record<string, string> = { not_started: "Chưa làm", in_progress: "Đã làm", completed: "Đã hoàn thành" };

const GROUPS: { key: GroupKey; title: string; label: (v: string) => string; single?: boolean }[] = [
  { key: "years", title: "Năm", label: (v) => (v === "older" ? "Các năm trước" : v) },
  { key: "difficulties", title: "Độ khó", label: (v) => DIFFICULTY_LABELS[v] ?? v },
  { key: "topics", title: "Chủ đề", label: (v) => v },
  { key: "types", title: "Loại đề", label: (v) => EXAM_TYPE_LABELS[v] ?? v },
  { key: "skills", title: "Kỹ năng", label: (v) => SKILL_LABELS[v] ?? v },
  { key: "parts", title: "Part", label: (v) => `Part ${v}` },
  { key: "statuses", title: "Trạng thái", label: (v) => STATUS_LABELS[v] ?? v },
  { key: "access", title: "Gói", label: (v) => (v === "free" ? "Miễn phí" : "Premium"), single: true },
  { key: "verified", title: "Xác minh", label: (v) => (v === "verified" ? "Đã xác minh" : "Chưa xác minh"), single: true },
];

const SORTS = [
  { value: "newest", label: "Mới nhất" },
  { value: "popular", label: "Phổ biến nhất" },
  { value: "difficulty", label: "Độ khó (dễ → khó)" },
  { value: "attempts", label: "Lượt làm nhiều nhất" },
] as const;

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

/** Thư viện đề TOEIC (E05): lọc nhiều điều kiện, sắp xếp, tìm theo tên/mã đề; kèm yêu thích & đã xác minh. */
export const FullTestsPage: React.FC = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [showFilters, setShowFilters] = useState(false);

  const query: ExamLibraryQuery = useMemo(
    () => ({
      q: params.get("q") ?? undefined,
      years: list(params.get("years")),
      difficulties: list(params.get("difficulties")),
      topics: list(params.get("topics")),
      types: list(params.get("types")),
      skills: list(params.get("skills")),
      parts: list(params.get("parts")).map(Number),
      statuses: list(params.get("statuses")),
      access: (params.get("access") as ExamLibraryQuery["access"]) ?? undefined,
      verified: (params.get("verified") as ExamLibraryQuery["verified"]) ?? undefined,
      sort: (params.get("sort") as ExamLibraryQuery["sort"]) ?? "newest",
    }),
    [params],
  );

  // Gõ tìm kiếm: chờ 300ms rồi mới gọi API
  useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (search.trim()) next.set("q", search.trim());
      else next.delete("q");
      if (next.toString() !== params.toString()) setParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(id);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["exam-library", user?.id, query],
    queryFn: () => listExamLibrary(query),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  const activeCount = GROUPS.reduce((n, g) => n + list(params.get(g.key)).length, 0);

  const toggle = (key: string, value: string, single?: boolean) => {
    const next = new URLSearchParams(params);
    const cur = list(next.get(key));
    let vals: string[];
    if (single) vals = cur[0] === value ? [] : [value];
    else vals = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    if (vals.length) next.set(key, vals.join(","));
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const clearAll = () => {
    const next = new URLSearchParams();
    const sort = params.get("sort");
    if (sort) next.set("sort", sort);
    setSearch("");
    setParams(next, { replace: true });
  };

  const facets = data?.facets;
  const filterPanel = (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        // Không hiển thị lựa chọn không có đề nào
        const options: Facet[] = (facets?.[g.key] ?? []).filter((o) => o.count > 0);
        if (options.length === 0) return null;
        const selected = list(params.get(g.key));
        return (
          <div key={g.key}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{g.title}</div>
            <div className="flex flex-wrap gap-1.5">
              {options.map((o) => {
                const on = selected.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggle(g.key, o.value, g.single)}
                    aria-pressed={on}
                    className={cn(
                      "min-h-[36px] px-3 rounded-xl border text-xs font-bold transition-colors",
                      on ? "border-cyan-500 bg-cyan-500/15 text-cyan-200" : "border-slate-800 text-slate-300 hover:bg-slate-800",
                    )}
                  >
                    {g.label(o.value)} <span className="text-slate-500 font-medium">{o.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="text-xs font-bold text-rose-300 hover:text-rose-200 min-h-[36px] flex items-center gap-1"
        >
          <X className="w-3.5 h-3.5" /> Xóa toàn bộ bộ lọc
        </button>
      )}
    </div>
  );

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Thư Viện Đề Thi TOEIC"
          description="Tìm đề theo năm, độ khó, chủ đề, trạng thái. Luyện Full Test 200 câu chuẩn format ETS hoặc luyện ngắn theo Part và dạng câu hỏi."
          icon={FileCheck2}
          iconBgColor="bg-emerald-500/10"
          iconTextColor="text-emerald-600 dark:text-emerald-400"
          badge={data ? `${data.total_all} Đề` : undefined}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/practice"
            className="p-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors flex items-center gap-3 min-h-[64px]"
          >
            <Layers className="w-6 h-6 text-cyan-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-sm">Luyện theo dạng câu hỏi</div>
              <div className="text-xs text-slate-400">Chọn Part → dạng câu → số câu</div>
            </div>
          </Link>
          <Link
            to="/practice?tab=mini"
            className="p-4 rounded-2xl border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 transition-colors flex items-center gap-3 min-h-[64px]"
          >
            <Zap className="w-6 h-6 text-violet-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-sm">Mini Test</div>
              <div className="text-xs text-slate-400">5–30 câu, làm nhanh mỗi ngày</div>
            </div>
          </Link>
          <Link
            to="/favorites"
            className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors flex items-center gap-3 min-h-[64px]"
          >
            <Bookmark className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-sm">Đề yêu thích</div>
              <div className="text-xs text-slate-400">Những đề bạn đã lưu</div>
            </div>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc mã đề (vd. LE-0052)"
              className="pl-9 h-11"
              aria-label="Tìm đề thi"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={query.sort ?? "newest"}
              onValueChange={(v) => {
                const next = new URLSearchParams(params);
                next.set("sort", v);
                setParams(next, { replace: true });
              }}
            >
              <SelectTrigger className="h-11 flex-1 sm:w-[200px]" aria-label="Sắp xếp">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="lg:hidden h-11 px-3 rounded-xl border border-slate-800 text-slate-200 text-sm font-bold flex items-center gap-1.5 shrink-0"
            >
              <Filter className="w-4 h-4" /> Bộ lọc{activeCount > 0 ? ` (${activeCount})` : ""}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          <aside className={cn("lg:block p-4 rounded-2xl border border-slate-800 bg-[#070e1c]/80 h-fit", showFilters ? "block" : "hidden")}>
            {facets ? filterPanel : <Skeleton className="h-64 w-full rounded-xl" />}
          </aside>

          <section className="space-y-4 min-w-0">
            {/* Gợi ý cho bạn (E10): ẩn khi đang dùng bộ lọc hoặc tìm kiếm */}
            {activeCount === 0 && !params.get("q") && <RecommendationCard title="Gợi ý cho bạn" />}
            {data && (
              <p className={cn("text-sm text-slate-400", isFetching && "opacity-60")}>
                Tìm thấy <b className="text-white">{data.total}</b> / {data.total_all} đề phù hợp
              </p>
            )}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-56 rounded-2xl" />
                ))}
              </div>
            ) : isError ? (
              <ErrorState
                title="Không thể tải thư viện đề"
                message="Không thể kết nối đến máy chủ. Vui lòng thử lại."
                onRetry={() => refetch()}
              />
            ) : data && data.items.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {data.items.map((e) => (
                  <ExamCard key={e.id} exam={e} />
                ))}
              </div>
            ) : data && data.total_all === 0 ? (
              <div className="p-8 rounded-2xl border border-slate-800 text-center text-slate-300">
                Các bộ đề thi đang chuẩn bị xuất bản. Bạn có thể luyện{" "}
                <Link to="/listening" className="text-cyan-400 font-bold">
                  chép chính tả
                </Link>{" "}
                trong lúc chờ.
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-slate-800 text-center space-y-3">
                <p className="text-white font-bold">Không tìm thấy đề phù hợp</p>
                <p className="text-sm text-slate-400">Thử bỏ bớt bộ lọc hoặc đổi từ khóa tìm kiếm.</p>
                <button
                  type="button"
                  onClick={clearAll}
                  className="min-h-[40px] px-4 rounded-xl border border-cyan-500/40 text-cyan-300 text-sm font-bold hover:bg-cyan-500/10"
                >
                  Xóa toàn bộ bộ lọc
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </StudentLayout>
  );
};

export default FullTestsPage;
