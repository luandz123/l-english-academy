import AdminLayout from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--success))"];

const AdminReports = () => {
  const { data: courseStats = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["admin-report-courses"],
    queryFn: async () => {
      const { data: courses } = await supabase.from("courses").select("id, title").eq("is_active", true);
      if (!courses) return [];
      const { data: enrollments } = await supabase.from("enrollments").select("course_id");
      const countMap: Record<number, number> = {};
      (enrollments ?? []).forEach((e) => { countMap[e.course_id] = (countMap[e.course_id] || 0) + 1; });
      return courses.map((c) => ({ name: c.title.substring(0, 20), value: countMap[c.id] || 0 }));
    },
  });

  const { data: quizStats = [] } = useQuery({
    queryKey: ["admin-report-hardest"],
    queryFn: async () => {
      const { data: answers } = await supabase.from("user_answers").select("question_id, is_correct");
      if (!answers?.length) return [];
      const qMap: Record<number, { total: number; wrong: number }> = {};
      answers.forEach((a) => {
        if (!qMap[a.question_id]) qMap[a.question_id] = { total: 0, wrong: 0 };
        qMap[a.question_id].total++;
        if (!a.is_correct) qMap[a.question_id].wrong++;
      });
      const sorted = Object.entries(qMap)
        .map(([id, s]) => ({ id: +id, correctRate: +((1 - s.wrong / s.total) * 100).toFixed(0), attempts: s.total }))
        .sort((a, b) => a.correctRate - b.correctRate)
        .slice(0, 5);
      const qIds = sorted.map((s) => s.id);
      const { data: questions } = await supabase.from("questions").select("id, question_text").in("id", qIds);
      const qTextMap: Record<number, string> = {};
      (questions ?? []).forEach((q) => { qTextMap[q.id] = q.question_text; });
      return sorted.map((s) => ({ ...s, text: qTextMap[s.id]?.substring(0, 50) ?? `Q#${s.id}` }));
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Báo cáo & Thống kê</h1>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Phân bố học viên</TabsTrigger>
            <TabsTrigger value="quizzes">Câu hỏi khó nhất</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            {loadingCourses ? <Skeleton className="h-64 w-full" /> : (
              <div className="bg-card rounded-xl border p-4">
                <h3 className="font-semibold text-foreground mb-4">Phân bố học viên theo khóa</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={courseStats} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {courseStats.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          <TabsContent value="quizzes" className="mt-4">
            <div className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold text-foreground mb-4">Top 5 câu hỏi sai nhiều nhất</h3>
              {quizStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Chưa có đủ dữ liệu</p>
              ) : (
                <div className="space-y-2">
                  {quizStats.map((q: any, i: number) => (
                    <div key={q.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-bold text-destructive">{i + 1}</span>
                      <span className="text-sm text-foreground flex-1">{q.text}</span>
                      <span className="text-sm font-medium text-destructive">{q.correctRate}% đúng</span>
                      <span className="text-xs text-muted-foreground">{q.attempts} lượt</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
