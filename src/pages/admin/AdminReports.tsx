import AdminLayout from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import {
  getAdminCourseEnrollments,
  getAdminUserAnswers,
  getAdminQuestionsByIds,
} from "@/lib/api/admin";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--success))"];

const AdminReports = () => {
  const { data: courseStats = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["admin-report-courses"],
    queryFn: async () => {
      const { data, error } = await getAdminCourseEnrollments();
      if (error) throw error;
      const courses = data?.courses;
      if (!courses) return [];
      const enrollments = data?.enrollments;
      const countMap: Record<number, number> = {};
      (enrollments ?? []).forEach((e) => { countMap[e.course_id] = (countMap[e.course_id] || 0) + 1; });
      return courses.map((c) => ({ name: c.title.substring(0, 20), value: countMap[c.id] || 0 }));
    },
  });

  const { data: quizStats = [] } = useQuery({
    queryKey: ["admin-report-hardest"],
    queryFn: async () => {
      const { data: answers, error: answersError } = await getAdminUserAnswers();
      if (answersError) throw answersError;
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
      const { data: questions, error: questionsError } = await getAdminQuestionsByIds(qIds);
      if (questionsError) throw questionsError;
      const qTextMap: Record<number, string> = {};
      (questions ?? []).forEach((q) => { qTextMap[q.id] = q.question_text; });
      return sorted.map((s) => {
        let rawText = qTextMap[s.id] ?? "";
        rawText = rawText.replace(/\[PASSAGE\][\s\S]*?\[ENDPASSAGE\]/gi, "").trim();
        return {
          ...s,
          text: rawText ? rawText.substring(0, 70) : `Câu hỏi #${s.id}`,
        };
      });
    },
  });

  const totalEnrollments = courseStats.reduce((sum: number, c: any) => sum + (c.value || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Báo cáo & Thống kê</h1>

        <Tabs defaultValue="overview">
          <TabsList className="bg-muted/60 p-1 rounded-2xl border border-border/60 h-auto">
            <TabsTrigger value="overview" className="rounded-xl font-bold py-2 px-4 data-[state=active]:bg-card data-[state=active]:shadow-soft-xs">
              Phân bố học viên
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="rounded-xl font-bold py-2 px-4 data-[state=active]:bg-card data-[state=active]:shadow-soft-xs">
              Câu hỏi khó nhất
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            {loadingCourses ? <Skeleton className="h-64 w-full rounded-2xl" /> : (
              <div className="bg-card rounded-2xl border border-border/70 p-6 shadow-soft-sm">
                <h3 className="font-bold text-foreground mb-4 text-base">Phân bố học viên theo khóa</h3>
                {totalEnrollments === 0 ? (
                  <div className="text-center py-16 text-muted-foreground font-semibold text-sm">
                    Chưa có học viên nào ghi danh khóa học trên hệ thống.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie 
                        data={courseStats.filter((c: any) => c.value > 0)} 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={100} 
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {courseStats.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quizzes" className="mt-4">
            <div className="bg-card rounded-2xl border border-border/70 p-6 shadow-soft-sm">
              <h3 className="font-bold text-foreground mb-4 text-base">Top 5 câu hỏi sai nhiều nhất</h3>
              {quizStats.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm font-semibold text-muted-foreground">Chưa có đủ dữ liệu thống kê câu hỏi</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {quizStats.map((q: any, i: number) => (
                    <div key={q.id} className="flex items-center gap-3 p-3.5 bg-muted/40 rounded-xl border border-border/60 hover:bg-muted/60 transition-colors">
                      <span className="w-6 h-6 rounded-lg bg-destructive/10 text-destructive text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="text-sm text-foreground flex-1 font-medium">{q.text}</span>
                      <span className="text-sm font-bold text-destructive bg-destructive/10 px-2.5 py-1 rounded-lg shrink-0">{q.correctRate}% đúng</span>
                      <span className="text-xs text-muted-foreground shrink-0">{q.attempts} lượt</span>
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
