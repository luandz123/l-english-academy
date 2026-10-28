import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, ClipboardCheck, TrendingUp, LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import {
  getAdminStatsCounts,
  getAdminRecentEnrollments,
  getAdminRecentResults,
  getAdminQuizScores,
} from "@/lib/api/admin";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const AdminDashboard = () => {
  const { data: totalStudents = 0 } = useQuery({
    queryKey: ["admin-total-students"],
    queryFn: async () => {
      const { data, error } = await getAdminStatsCounts();
      if (error) throw error;
      return data?.total_students ?? 0;
    },
  });

  const { data: totalCourses = 0 } = useQuery({
    queryKey: ["admin-total-courses"],
    queryFn: async () => {
      const { data, error } = await getAdminStatsCounts();
      if (error) throw error;
      return data?.total_courses ?? 0;
    },
  });

  const { data: totalQuizAttempts = 0 } = useQuery({
    queryKey: ["admin-total-quiz-attempts"],
    queryFn: async () => {
      const { data, error } = await getAdminStatsCounts();
      if (error) throw error;
      return data?.total_quiz_attempts ?? 0;
    },
  });

  const { data: recentEnrollments = [], isLoading: loadingRecent } = useQuery({
    queryKey: ["admin-recent-enrollments"],
    queryFn: async () => {
      const { data, error } = await getAdminRecentEnrollments();
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recentResults = [] } = useQuery({
    queryKey: ["admin-recent-results"],
    queryFn: async () => {
      const { data, error } = await getAdminRecentResults();
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: partScores = [] } = useQuery({
    queryKey: ["admin-part-scores"],
    queryFn: async () => {
      const { data, error } = await getAdminQuizScores();
      if (error) throw error;
      const quizzes = data?.quizzes;
      if (!quizzes?.length) return [];
      const results = data?.results;
      if (!results?.length) return [];
      const scoreMap: Record<number, { total: number; count: number; title: string }> = {};
      quizzes.forEach((q) => { scoreMap[q.id] = { total: 0, count: 0, title: q.title }; });
      results.forEach((r) => {
        if (scoreMap[r.quiz_id]) {
          scoreMap[r.quiz_id].total += Number(r.score ?? 0);
          scoreMap[r.quiz_id].count += 1;
        }
      });
      return Object.values(scoreMap)
        .filter((s) => s.count > 0)
        .map((s) => ({ quiz: s.title.substring(0, 20), score: +(s.total / s.count).toFixed(1) }))
        .slice(0, 7);
    },
  });

  const kpis = [
    {
      Icon: Users,
      label: "Tổng học viên",
      value: totalStudents.toLocaleString(),
      gradient: "from-blue-500 to-cyan-400",
      glow: "shadow-blue-400/40",
      border: "border-blue-100 dark:border-blue-900",
    },
    {
      Icon: BookOpen,
      label: "Khóa học hoạt động",
      value: String(totalCourses),
      gradient: "from-emerald-500 to-teal-400",
      glow: "shadow-emerald-400/40",
      border: "border-emerald-100 dark:border-emerald-900",
    },
    {
      Icon: ClipboardCheck,
      label: "Lượt làm bài thi",
      value: totalQuizAttempts.toLocaleString(),
      gradient: "from-orange-400 to-amber-400",
      glow: "shadow-orange-400/40",
      border: "border-orange-100 dark:border-orange-900",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Tổng quan Quản trị"
          description="Thống kê tổng quan học viên, khóa học và lượt thi thử trực tiếp theo thời gian thực."
          icon={LayoutDashboard}
        />

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="bg-card rounded-2xl border border-border/70 p-5 space-y-3 shadow-soft-sm hover:-translate-y-0.5 transition-transform">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${k.gradient} ${k.glow} shadow-md flex items-center justify-center`}>
                <k.Icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-3xl font-black text-foreground">{k.value}</p>
              <p className="text-xs font-bold text-muted-foreground">{k.label}</p>
            </div>
          ))}
        </div>

        {partScores.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/70 p-5 shadow-soft-sm">
            <h3 className="font-bold text-foreground mb-4">Điểm trung bình theo bài thi</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={partScores}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="quiz" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, (dataMax: number) => Math.max(10, Math.ceil(dataMax))]} />
                <Tooltip />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Điểm TB" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border border-border/70 shadow-soft-sm overflow-hidden">
            <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
              <h3 className="font-bold text-foreground">Đăng ký mới nhất</h3>
              <Button variant="ghost" size="sm" className="text-xs text-primary font-bold hover:bg-primary/10 rounded-xl" asChild>
                <Link to="/admin/enrollments">Xem tất cả →</Link>
              </Button>
            </div>
            {loadingRecent ? (
              <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full rounded-xl" />)}</div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {recentEnrollments.map((e: any) => (
                    <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="p-3 font-semibold text-foreground">{(e as any).profiles?.full_name ?? "—"}</td>
                      <td className="p-3 text-xs text-muted-foreground">{(e as any).courses?.title ?? "—"}</td>
                      <td className="p-3 text-xs text-muted-foreground text-right">
                        {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString("vi-VN") : ""}
                      </td>
                    </tr>
                  ))}
                  {recentEnrollments.length === 0 && (
                    <tr><td colSpan={3} className="p-6 text-center text-muted-foreground text-sm font-medium">Chưa có đăng ký mới</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border/70 shadow-soft-sm overflow-hidden">
            <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
              <h3 className="font-bold text-foreground">Bài thi vừa hoàn thành</h3>
              <Button variant="ghost" size="sm" className="text-xs text-primary font-bold hover:bg-primary/10 rounded-xl" asChild>
                <Link to="/admin/reports">Xem tất cả →</Link>
              </Button>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {recentResults.map((r: any) => (
                  <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="p-3 font-semibold text-foreground">{r.profiles?.full_name ?? "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{r.quizzes?.title ?? "—"}</td>
                    <td className="p-3 text-center font-bold text-primary">
                      {r.correct_answers}/{r.total_questions}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground text-right">
                      {r.completed_at ? new Date(r.completed_at).toLocaleDateString("vi-VN") : ""}
                    </td>
                  </tr>
                ))}
                {recentResults.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-sm font-medium">Chưa có kết quả</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button className="rounded-xl shadow-soft-sm transition-all duration-120 active:scale-95" asChild>
            <Link to="/admin/courses/new">+ Tạo khóa học mới</Link>
          </Button>
          <Button variant="outline" className="rounded-xl border-border/70 shadow-soft-xs transition-all duration-120 active:scale-95" asChild>
            <Link to="/admin/students">Quản lý học viên</Link>
          </Button>
          <Button variant="outline" className="rounded-xl border-border/70 shadow-soft-xs transition-all duration-120 active:scale-95" asChild>
            <Link to="/admin/reports">Xem báo cáo</Link>
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
