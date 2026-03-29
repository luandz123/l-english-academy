import StudentLayout from "@/components/StudentLayout";
import { useParams, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const partBreakdown = [
  { part: "Part 1", correct: 6, total: 6 },
  { part: "Part 2", correct: 22, total: 25 },
  { part: "Part 3", correct: 30, total: 39 },
  { part: "Part 4", correct: 20, total: 30 },
  { part: "Part 5", correct: 25, total: 30 },
  { part: "Part 6", correct: 12, total: 16 },
  { part: "Part 7", correct: 28, total: 54 },
];

const FullTestResult = () => {
  const { courseId, testId } = useParams();
  const location = useLocation();
  const state = location.state as any;

  const correct = state?.correct ?? 143;
  const total = state?.total ?? 200;
  const listening = state?.listening ?? 78;
  const reading = state?.reading ?? 65;
  const estimatedScore = Math.round((correct / total) * 990);

  return (
    <StudentLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Score card */}
        <div className="bg-card rounded-xl border p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">🏆 KẾT QUẢ BỘ ĐỀ</h1>
          <div className="text-5xl font-extrabold text-primary">{estimatedScore}</div>
          <p className="text-sm text-muted-foreground">Điểm TOEIC ước tính</p>

          <div className="grid grid-cols-2 gap-6 max-w-md mx-auto pt-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Nghe (Listening)</p>
              <Progress value={listening} className="h-3" />
              <p className="text-lg font-bold text-primary">{listening}/100</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Đọc (Reading)</p>
              <Progress value={reading} className="h-3" />
              <p className="text-lg font-bold text-primary">{reading}/100</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">Tổng đúng: {correct}/{total}</p>
        </div>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link to={`/courses/${courseId}/fulltest`}>← Quay về danh sách</Link>
          </Button>
          <Button asChild>
            <Link to={`/courses/${courseId}/fulltest/${testId}`}>🔄 Làm lại</Link>
          </Button>
        </div>

        {/* Part breakdown */}
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
              {partBreakdown.map((p) => (
                <tr key={p.part} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium text-foreground">{p.part}</td>
                  <td className="p-3 text-center text-foreground">{p.correct}</td>
                  <td className="p-3 text-center text-muted-foreground">{p.total}</td>
                  <td className="p-3 text-center">
                    <span className={Math.round(p.correct / p.total * 100) >= 80 ? "text-success" : Math.round(p.correct / p.total * 100) >= 60 ? "text-warning" : "text-destructive"}>
                      {Math.round(p.correct / p.total * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Materials */}
        <div className="bg-card rounded-xl border p-4 space-y-2">
          <h3 className="font-semibold text-foreground text-sm">📁 Tài liệu đính kèm</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline">📄 Transcript</Button>
            <Button size="sm" variant="outline">📄 Đáp án chi tiết</Button>
            <Button size="sm" variant="outline">📄 Từ vựng trọng điểm</Button>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default FullTestResult;
