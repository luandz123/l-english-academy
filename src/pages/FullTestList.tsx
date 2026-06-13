import StudentLayout from "@/components/StudentLayout";
import { useParams, Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Lock, CheckCircle, Clock } from "lucide-react";
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

  // BUG FIX #4: Get highest score per test instead of random overwrite
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

  // BUG FIX #4: Keep only the highest score per test
  const resultMap = new Map<number, number>();
  (results || []).forEach(r => {
    if (!resultMap.has(r.test_id) || (r.total_score ?? 0) > (resultMap.get(r.test_id) ?? 0)) {
      resultMap.set(r.test_id, r.total_score);
    }
  });

  // Group by category
  const categoryMap: Record<string, string> = {
    "2026": "Bộ Đề 2026",
    "real_2024_2026": "Đề Thực Tế 2024-2026",
    "2025": "Bộ Đề 2025",
    "2024": "Bộ Đề 2024",
    "general": "Tổng hợp",
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
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">📋 Bộ đề Full Test TOEIC</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">Luyện thi thật với bộ đề chuẩn format TOEIC</p>
        </div>

        <Accordion type="multiple" defaultValue={Object.keys(grouped).map((_, i) => `cat-${i}`)} className="space-y-3">
          {Object.entries(grouped).map(([cat, catTests], ci) => (
            <AccordionItem key={cat} value={`cat-${ci}`} className="card-duo border-2 border-[var(--duo-gray)] overflow-hidden">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-sm text-foreground">{categoryMap[cat] || cat}</span>
                  <span className="badge-duo badge-blue">{catTests.length} đề</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-4">
                <div className="space-y-2">
                  {catTests.map((test: any) => {
                    const now = new Date();
                    const released = !test.release_date || new Date(test.release_date) <= now;
                    const done = resultMap.has(test.id);
                    const score = resultMap.get(test.id);

                    return (
                      <div key={test.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-[var(--duo-gray)] bg-card hover:border-[var(--duo-green)] transition-all group">
                        {!released ? (
                          <Lock className="w-5 h-5 text-[var(--duo-yellow)] shrink-0" />
                        ) : done ? (
                          <CheckCircle className="w-5 h-5 text-[var(--duo-green)] shrink-0" />
                        ) : (
                          <span className="w-5 h-5 rounded-full border-2 border-muted-foreground shrink-0" />
                        )}
                        <span className="text-sm font-bold text-foreground flex-1">{test.title}</span>
                        <span className="text-xs font-bold text-muted-foreground">{test.total_questions || '—'} câu</span>
                        {done && score && <span className="badge-duo badge-green">{score}/990</span>}
                        {!released && test.release_date && (
                          <span className="badge-duo badge-yellow flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(test.release_date).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                        {released && !done && (
                          <Link to={`/courses/${courseId}/fulltest/${test.id}`} className="btn-3d btn-3d-primary py-1.5 px-3 text-xs">
                            Làm bài
                          </Link>
                        )}
                        {done && (
                          <>
                            <Link to={`/courses/${courseId}/fulltest/${test.id}/result`} className="btn-3d btn-3d-white py-1.5 px-3 text-xs">
                              Xem lại
                            </Link>
                            <Link to={`/courses/${courseId}/fulltest/${test.id}`} className="btn-3d btn-3d-primary py-1.5 px-3 text-xs">
                              Làm lại
                            </Link>
                          </>
                        )}
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
