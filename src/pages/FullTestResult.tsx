import StudentLayout from "@/components/StudentLayout";
import { useParams, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const partBreakdown = [
  { part: "Part 1", total: 6 },
  { part: "Part 2", total: 25 },
  { part: "Part 3", total: 39 },
  { part: "Part 4", total: 30 },
  { part: "Part 5", total: 30 },
  { part: "Part 6", total: 16 },
  { part: "Part 7", total: 54 },
];

const FullTestResult = () => {
  const { courseId, testId } = useParams();
  const location = useLocation();
  const state = location.state as any;

  const correct = state?.correct ?? 143;
  const total = state?.total ?? 200;
  const listeningScore = state?.listeningScore ?? Math.round((correct * 0.48 / 100) * 495);
  const readingScore = state?.readingScore ?? Math.round((correct * 0.52 / 100) * 495);
  const totalScore = state?.totalScore ?? (listeningScore + readingScore);
  const timeSpent = state?.time ?? 0;
  const timeMin = Math.floor(timeSpent / 60);
  const timeSec = timeSpent % 60;

  // Distribute correct answers proportionally
  const partCorrects = partBreakdown.map(p => {
    const ratio = p.total / 200;
    return Math.round(correct * ratio);
  });

  return (
    <StudentLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-card rounded-xl border p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">🏆 KẾT QUẢ BỘ ĐỀ</h1>
          <div className="text-5xl font-extrabold text-primary">{totalScore}</div>
          <p className="text-sm text-muted-foreground">Điểm TOEIC ước tính (trên 990)</p>

          <div className="grid grid-cols-2 gap-6 max-w-md mx-auto pt-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">🎧 Listening</p>
              <Progress value={(listeningScore / 495) * 100} className="h-3" />
              <p className="text-lg font-bold text-primary">{listeningScore}/495</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">📖 Reading</p>
              <Progress value={(readingScore / 495) * 100} className="h-3" />
              <p className="text-lg font-bold text-primary">{readingScore}/495</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">Tổng đúng: {correct}/{total} · Thời gian: {timeMin}:{String(timeSec).padStart(2, "0")}</p>
        </div>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link to={`/courses/${courseId}/fulltest`}>← Quay về danh sách</Link>
          </Button>
          <Button asChild>
            <Link to={`/courses/${courseId}/fulltest/${testId}`}>🔄 Làm lại</Link>
          </Button>
        </div>

        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-semibold text-foreground">Part</th>
                <th className="text-center p-3 font-semibold text-foreground">Câu đúng</th>
                <th className="text-center p-3 font-semibold text-foreground">Tổng</th>
                <th className="text-center p-3 font-semibold text-foreground">%</th>
              </tr>
            </thead>
            <tbody>
              {partBreakdown.map((p, i) => {
                const pct = Math.round((partCorrects[i] / p.total) * 100);
                return (
                  <tr key={p.part} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">{p.part}</td>
                    <td className="p-3 text-center text-foreground">{partCorrects[i]}</td>
                    <td className="p-3 text-center text-muted-foreground">{p.total}</td>
                    <td className="p-3 text-center">
                      <span className={pct >= 80 ? "text-emerald-500" : pct >= 60 ? "text-amber-500" : "text-destructive"}>
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </StudentLayout>
  );
};

export default FullTestResult;
