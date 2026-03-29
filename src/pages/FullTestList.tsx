import StudentLayout from "@/components/StudentLayout";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Lock, CheckCircle, Clock } from "lucide-react";

const testCategories = [
  {
    title: "Bộ Đề 2026",
    tests: Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      title: `Bộ đề 2026 - Đề ${String(i + 1).padStart(2, "0")}`,
      questions: 200,
      materials: 1,
      done: i < 2,
      score: i === 0 ? "750" : i === 1 ? "680" : undefined,
      released: i < 5,
      releaseDate: i >= 5 ? `${String(i + 1).padStart(2, "0")}/04/2026 17:00` : undefined,
    })),
  },
  { title: "Đề Thực Tế 2024-2026", tests: Array.from({ length: 7 }, (_, i) => ({ id: 100 + i, title: `Đề thực tế ${i + 1}`, questions: 200, materials: 1, done: false, released: true })) },
  { title: "Bộ Đề 2025", tests: Array.from({ length: 12 }, (_, i) => ({ id: 200 + i, title: `Bộ đề 2025 - Đề ${String(i + 1).padStart(2, "0")}`, questions: 200, materials: 1, done: false, released: true })) },
  { title: "Bộ Đề 2024", tests: Array.from({ length: 10 }, (_, i) => ({ id: 300 + i, title: `Bộ đề 2024 - Đề ${String(i + 1).padStart(2, "0")}`, questions: 200, materials: 1, done: false, released: true })) },
  { title: "Bộ Đề 2023", tests: Array.from({ length: 11 }, (_, i) => ({ id: 400 + i, title: `Bộ đề 2023 - Đề ${String(i + 1).padStart(2, "0")}`, questions: 200, materials: 1, done: false, released: true })) },
  { title: "Bộ Đề 2022", tests: Array.from({ length: 10 }, (_, i) => ({ id: 500 + i, title: `Bộ đề 2022 - Đề ${String(i + 1).padStart(2, "0")}`, questions: 200, materials: 1, done: false, released: true })) },
  { title: "Nâng Cao 850+", tests: Array.from({ length: 5 }, (_, i) => ({ id: 600 + i, title: `Đề nâng cao ${i + 1}`, questions: 200, materials: 1, done: false, released: true })) },
];

const FullTestList = () => {
  const { courseId } = useParams();
  const doneCount = (tests: any[]) => tests.filter(t => t.done).length;

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-foreground">📋 Bộ đề Full Test TOEIC</h1>
        <p className="text-sm text-muted-foreground">60+ bộ đề · 200 câu/đề · 12,000+ câu hỏi</p>

        <Accordion type="multiple" defaultValue={["cat-0"]} className="space-y-2">
          {testCategories.map((cat, ci) => (
            <AccordionItem key={ci} value={`cat-${ci}`} className="bg-card rounded-lg border">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm text-foreground">{cat.title}</span>
                  <Badge variant="secondary" className="text-xs">{cat.tests.length} đề</Badge>
                  {doneCount(cat.tests) > 0 && (
                    <span className="text-xs text-muted-foreground">{doneCount(cat.tests)}/{cat.tests.length} đã làm</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3">
                <div className="space-y-1">
                  {cat.tests.map((test: any) => (
                    <div key={test.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                      {!test.released ? (
                        <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : test.done ? (
                        <CheckCircle className="w-4 h-4 text-success shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm text-foreground flex-1">{test.title}</span>
                      <span className="text-xs text-muted-foreground">{test.questions} câu</span>
                      {test.score && <Badge className="bg-accent text-accent-foreground text-xs">{test.score} điểm</Badge>}
                      {!test.released && test.releaseDate && (
                        <span className="text-xs text-warning flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {test.releaseDate}
                        </span>
                      )}
                      {test.released && !test.done && (
                        <Button size="sm" variant="outline" className="text-xs h-7" asChild>
                          <Link to={`/courses/${courseId}/fulltest/${test.id}`}>Làm bài</Link>
                        </Button>
                      )}
                      {test.done && (
                        <Button size="sm" variant="ghost" className="text-xs h-7" asChild>
                          <Link to={`/courses/${courseId}/fulltest/${test.id}/result`}>Xem lại</Link>
                        </Button>
                      )}
                    </div>
                  ))}
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
