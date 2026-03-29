import StudentLayout from "@/components/StudentLayout";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const { data: results } = useQuery({
    queryKey: ["full-test-results", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_full_test_results")
        .select("test_id, total_score")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const resultMap = new Map((results || []).map(r => [r.test_id, r.total_score]));

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

  if (isLoading) return <StudentLayout><Skeleton className="h-64 rounded-xl" /></StudentLayout>;

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-foreground">📋 Bộ đề Full Test TOEIC</h1>

        <Accordion type="multiple" defaultValue={Object.keys(grouped).map((_, i) => `cat-${i}`)} className="space-y-2">
          {Object.entries(grouped).map(([cat, catTests], ci) => (
            <AccordionItem key={cat} value={`cat-${ci}`} className="bg-card rounded-lg border">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm text-foreground">{categoryMap[cat] || cat}</span>
                  <Badge variant="secondary" className="text-xs">{catTests.length} đề</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3">
                <div className="space-y-1">
                  {catTests.map((test: any) => {
                    const now = new Date();
                    const released = !test.release_date || new Date(test.release_date) <= now;
                    const done = resultMap.has(test.id);
                    const score = resultMap.get(test.id);

                    return (
                      <div key={test.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                        {!released ? (
                          <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : done ? (
                          <CheckCircle className="w-4 h-4 text-success shrink-0" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border-2 border-muted-foreground shrink-0" />
                        )}
                        <span className="text-sm text-foreground flex-1">{test.title}</span>
                        <span className="text-xs text-muted-foreground">{test.total_questions} câu</span>
                        {done && score && <Badge className="bg-accent text-accent-foreground text-xs">{score} điểm</Badge>}
                        {!released && test.release_date && (
                          <span className="text-xs text-warning flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(test.release_date).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                        {released && !done && (
                          <Button size="sm" variant="outline" className="text-xs h-7" asChild>
                            <Link to={`/courses/${courseId}/fulltest/${test.id}`}>Làm bài</Link>
                          </Button>
                        )}
                        {done && (
                          <Button size="sm" variant="ghost" className="text-xs h-7" asChild>
                            <Link to={`/courses/${courseId}/fulltest/${test.id}/result`}>Xem lại</Link>
                          </Button>
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
