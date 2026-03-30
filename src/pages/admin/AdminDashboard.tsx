import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, ClipboardCheck, TrendingUp } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const AdminDashboard = () => {
  const { data: totalStudents = 0 } = useQuery({
    queryKey: ["admin-total-students"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: totalCourses = 0 } = useQuery({
    queryKey: ["admin-total-courses"],
    queryFn: async () => {
      const { count } = await supabase.from("courses").select("*", { count: "exact", head: true }).eq("is_active", true);
      return count ?? 0;
    },
  });

  const { data: totalQuizAttempts = 0 } = useQuery({
    queryKey: ["admin-total-quiz-attempts"],
    queryFn: async () => {
      const { count } = await supabase.from("user_quiz_results").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: recentEnrollments = [], isLoading: loadingRecent } = useQuery({
    queryKey: ["admin-recent-enrollments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*, courses(title), profiles!inner(full_name)")
        .order("enrolled_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: recentResults = [] } = useQuery({
    queryKey: ["admin-recent-results"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_quiz_results")
        .select("*, quizzes(title), profiles:user_id(full_name)")
        .order("completed_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: partScores = [] } = useQuery({
    queryKey: ["admin-part-scores"],
    queryFn: async () => {
      const { data: quizzes } = await supabase.from("quizzes").select("id, title");
      if (!quizzes?.length) return [];
      const { data: results } = await supabase.from("user_quiz_results").select("quiz_id, score");
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
    { icon: Users, label: "Tổng học viên", value: totalStudents.toLocaleString(), color: "text-primary", bg: "bg-primary/10" },
    { icon: BookOpen, label: "Khóa học hoạt động", value: String(totalCourses), color: "text-accent", bg: "bg-accent/10" },
    { icon: ClipboardCheck, label: "Lượt làm bài thi", value: totalQuizAttempts.toLocaleString(), color: "text-warning", bg: "bg-warning/10" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Tổng quan Admin</h1>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="bg-card rounded-xl border p-4 space-y-2">
              <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center`}>
                <k.icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
          ))}
        </div>

        {partScores.length > 0 && (
          <div className="bg-card rounded-xl border p-4">
            <h3 className="font-semibold text-foreground mb-4">Điểm trung bình theo bài thi</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={partScores}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="quiz" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 10]} />
                <Tooltip />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Điểm TB" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Đăng ký mới nhất</h3>
              <Button variant="ghost" size="sm" className="text-xs text-primary" asChild>
                <Link to="/admin/enrollments">Xem tất cả →</Link>
              </Button>
            </div>
            {loadingRecent ? (
              <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {recentEnrollments.map((e: any) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium text-foreground">{(e as any).profiles?.full_name ?? "—"}</td>
                      <td className="p-3 text-xs text-muted-foreground">{(e as any).courses?.title ?? "—"}</td>
                      <td className="p-3 text-xs text-muted-foreground text-right">
                        {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString("vi-VN") : ""}
                      </td>
                    </tr>
                  ))}
                  {recentEnrollments.length === 0 && (
                    <tr><td colSpan={3} className="p-4 text-center text-muted-foreground text-sm">Chưa có đăng ký</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-card rounded-xl border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Bài thi vừa hoàn thành</h3>
              <Button variant="ghost" size="sm" className="text-xs text-primary" asChild>
                <Link to="/admin/reports">Xem tất cả →</Link>
              </Button>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {recentResults.map((r: any) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">{r.profiles?.full_name ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{r.quizzes?.title ?? "—"}</td>
                    <td className="p-3 text-center font-medium text-primary">
                      {r.correct_answers}/{r.total_questions}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground text-right">
                      {r.completed_at ? new Date(r.completed_at).toLocaleDateString("vi-VN") : ""}
                    </td>
                  </tr>
                ))}
                {recentResults.length === 0 && (
                  <tr><td colSpan={4} className="p-4 text-center text-muted-foreground text-sm">Chưa có kết quả</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild><Link to="/admin/courses/new">+ Tạo khóa học mới</Link></Button>
          <Button variant="outline" asChild><Link to="/admin/students">Quản lý học viên</Link></Button>
          <Button variant="outline" asChild><Link to="/admin/reports">Xem báo cáo</Link></Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
