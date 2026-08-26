import StudentLayout from "@/components/StudentLayout";
import { useParams, Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Lock, CheckCircle2, Clock, FileText, ArrowRight, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const FullTestList = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const cid = Number(courseId);

  const { data: tests, isLoading } = useQuery({
    queryKey: ["full-tests", cid],
    queryFn: async () => {
      const { data } = await supabase
        .from("full_tests")
        .select("*")
        .eq("course_id", cid)
        .order("category")
        .order("display_order");
      return data || [];
    },
  });

  const { data: results } = useQuery({
    queryKey: ["full-test-results", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_full_test_results")
        .select("test_id, total_score")
        .eq("user_id", user!.id)
        .order("total_score", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const resultMap = new Map<number, number>();
  (results || []).forEach(r => {
    if (!resultMap.has(r.test_id) || (r.total_score ?? 0) > (resultMap.get(r.test_id) ?? 0)) {
      resultMap.set(r.test_id, r.total_score);
    }
  });

  const categoryMap: Record<string, string> = {
    "2026": "Bộ Đề TOEIC 2026",
    "real_2024_2026": "Đề Thi Thực Tế 2024 - 2026",
    "2025": "Bộ Đề TOEIC 2025",
    "2024": "Bộ Đề TOEIC 2024",
    "general": "Bộ Đề Tổng Hợp",
  };

  const grouped = (tests || []).reduce((acc: Record<string, any[]>, t: any) => {
    const cat = t.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  if (isLoading) return <StudentLayout><Skeleton className="h-64 rounded-2xl" /></StudentLayout>;

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Kho Đề Thi Full Test TOEIC
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Luyện thi chuẩn format TOEIC. Bạn có thể chọn thi thử toàn bộ 7 Parts (200 câu) hoặc chọn riêng từng Part để luyện tập.
          </p>
        </div>

        <Accordion type="multiple" defaultValue={Object.keys(grouped).map((_, i) => `cat-${i}`)} className="space-y-4">
          {Object.entries(grouped).map(([cat, catTests], ci) => (
            <AccordionItem key={cat} value={`cat-${ci}`} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-foreground">{categoryMap[cat] || cat}</span>
                  <span className="badge-duo badge-blue">{catTests.length} đề thi</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-1">
                <div className="space-y-2">
                  {catTests.map((test: any) => {
                    const now = new Date();
                    const released = !test.release_date || new Date(test.release_date) <= now;
                    const done = resultMap.has(test.id);
                    const score = resultMap.get(test.id);

                    return (
                      <div key={test.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 rounded-lg border border-border/70 bg-muted/20 hover:bg-card hover:border-primary/40 hover:shadow-sm transition-all group">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {!released ? (
                            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                          ) : done ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <span className="w-4 h-4 rounded-full border-2 border-muted-foreground/40 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {test.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {test.total_questions || 200} câu • Hỗ trợ chọn Part & Thi thử
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/50">
                          {done && score !== undefined && (
                            <span className="badge-duo badge-green text-xs font-bold">
                              Điểm: {score}/990
                            </span>
                          )}
                          
                          {!released && test.release_date && (
                            <span className="badge-duo badge-yellow flex items-center gap-1 text-xs">
                              <Clock className="w-3 h-3" /> Mở ngày {new Date(test.release_date).toLocaleDateString("vi-VN")}
                            </span>
                          )}

                          {released && !done && (
                            <Link to={`/courses/${courseId}/fulltest/${test.id}`} className="btn-3d btn-3d-primary py-2 sm:py-1.5 px-4 text-xs font-bold inline-flex items-center justify-center gap-1.5 ml-auto sm:ml-0">
                              Vào làm đề <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}

                          {done && (
                            <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                              <Link to={`/courses/${courseId}/fulltest/${test.id}/result`} className="btn-3d btn-3d-white py-2 sm:py-1.5 px-3 text-xs font-bold">
                                Kết quả
                              </Link>
                              <Link to={`/courses/${courseId}/fulltest/${test.id}`} className="btn-3d btn-3d-primary py-2 sm:py-1.5 px-3 text-xs font-bold inline-flex items-center gap-1">
                                <RotateCcw className="w-3 h-3" /> Luyện tiếp
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </StudentLayout>
  );
};

export default FullTestList;
