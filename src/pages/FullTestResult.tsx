import StudentLayout from "@/components/StudentLayout";
import { useParams, useLocation, Link } from "react-router-dom";

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

  const getScoreEmoji = () => {
    if (totalScore >= 800) return "🏆";
    if (totalScore >= 600) return "🌟";
    if (totalScore >= 400) return "💪";
    return "📚";
  };

  return (
    <StudentLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="card-duo p-8 text-center space-y-5">
          <div className="text-6xl mb-2">{getScoreEmoji()}</div>
          <h1 className="text-2xl font-extrabold text-foreground">KẾT QUẢ BỘ ĐỀ</h1>
          <div className="text-5xl font-extrabold text-[var(--duo-green)]">{totalScore}</div>
          <p className="text-sm text-muted-foreground font-bold">Điểm TOEIC ước tính (trên 990)</p>

          <div className="grid grid-cols-2 gap-6 max-w-md mx-auto pt-4">
            <div className="card-duo p-4 space-y-2">
              <p className="text-sm font-extrabold text-foreground">🎧 Listening</p>
              <div className="progress-duo">
                <div className="progress-duo-fill" style={{ width: `${(listeningScore / 495) * 100}%`, background: 'linear-gradient(90deg, var(--duo-blue), var(--duo-blue-dark))' }} />
              </div>
              <p className="text-lg font-extrabold text-[var(--duo-blue)]">{listeningScore}/495</p>
            </div>
            <div className="card-duo p-4 space-y-2">
              <p className="text-sm font-extrabold text-foreground">📖 Reading</p>
              <div className="progress-duo">
                <div className="progress-duo-fill" style={{ width: `${(readingScore / 495) * 100}%` }} />
              </div>
              <p className="text-lg font-extrabold text-[var(--duo-green)]">{readingScore}/495</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground font-bold">Tổng đúng: {correct}/{total} · Thời gian: {timeMin}:{String(timeSec).padStart(2, "0")}</p>
        </div>

        <div className="flex gap-3 justify-center">
          <Link to={`/courses/${courseId}/fulltest`} className="btn-3d btn-3d-white py-2.5 px-5 text-sm inline-block">
            ← Quay về danh sách
          </Link>
          <Link to={`/courses/${courseId}/fulltest/${testId}`} className="btn-3d btn-3d-blue py-2.5 px-5 text-sm inline-block">
            🔄 Làm lại
          </Link>
        </div>

        <div className="card-duo overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[var(--duo-gray)] bg-muted/50">
                <th className="text-left p-3 font-extrabold text-foreground">Part</th>
                <th className="text-center p-3 font-extrabold text-foreground">Câu đúng</th>
                <th className="text-center p-3 font-extrabold text-foreground">Tổng</th>
                <th className="text-center p-3 font-extrabold text-foreground">%</th>
              </tr>
            </thead>
            <tbody>
              {partBreakdown.map((p, i) => {
                const pct = Math.round((partCorrects[i] / p.total) * 100);
                return (
                  <tr key={p.part} className="border-b-2 border-[var(--duo-gray)] last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-extrabold text-foreground">{p.part}</td>
                    <td className="p-3 text-center font-bold text-foreground">{partCorrects[i]}</td>
                    <td className="p-3 text-center text-muted-foreground font-bold">{p.total}</td>
                    <td className="p-3 text-center">
                      <span className={`badge-duo ${pct >= 80 ? 'badge-green' : pct >= 60 ? 'badge-yellow' : 'badge-orange'}`}>
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
