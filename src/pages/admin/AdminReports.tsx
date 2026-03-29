import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const dailyActivity = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}/03`,
  active: 50 + Math.floor(Math.random() * 100),
  quizzes: 20 + Math.floor(Math.random() * 50),
}));

const courseDistribution = [
  { name: "TOEIC L&R", value: 892, color: "hsl(var(--primary))" },
  { name: "EZ Vocab", value: 654, color: "hsl(var(--accent))" },
  { name: "Listening", value: 401, color: "hsl(var(--warning))" },
  { name: "Speaking", value: 210, color: "hsl(var(--destructive))" },
  { name: "Full Test", value: 731, color: "hsl(var(--success))" },
];

const courseStats = [
  { course: "TOEIC L&R", students: 892, progress: "45%", avg: 7.8, completion: "23%", revenue: "38,400,000đ" },
  { course: "EZ Vocab", students: 654, progress: "30%", avg: 8.1, completion: "18%", revenue: "0đ" },
  { course: "Listening", students: 401, progress: "20%", avg: 7.2, completion: "12%", revenue: "8,000,000đ" },
  { course: "Speaking", students: 210, progress: "15%", avg: 6.5, completion: "8%", revenue: "3,600,000đ" },
  { course: "Full Test", students: 731, progress: "25%", avg: 7.0, completion: "15%", revenue: "14,400,000đ" },
];

const hardestQuestions = [
  { question: "Part 3 Q12: What does the man imply?", correct: "32%", attempts: 456 },
  { question: "Part 7 Q180: According to the passage...", correct: "38%", attempts: 389 },
  { question: "Part 5 Q112: The report _____ submitted", correct: "41%", attempts: 512 },
  { question: "Part 4 Q78: What is the purpose?", correct: "44%", attempts: 445 },
  { question: "Part 6 Q148: Which sentence best fits?", correct: "46%", attempts: 378 },
];

const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
  month: `T${i + 1}`,
  revenue: 30 + Math.floor(Math.random() * 30),
}));

const AdminReports = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Báo cáo & Thống kê</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">📥 Xuất Excel</Button>
            <Button variant="outline" size="sm">📥 Xuất PDF</Button>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="courses">Khóa học</TabsTrigger>
            <TabsTrigger value="quizzes">Bài thi</TabsTrigger>
            <TabsTrigger value="revenue">Doanh thu</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border p-4">
                <h3 className="font-semibold text-foreground mb-4">Hoạt động theo ngày</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="active" stroke="hsl(var(--primary))" name="Học viên active" strokeWidth={2} />
                    <Line type="monotone" dataKey="quizzes" stroke="hsl(var(--accent))" name="Lượt thi" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card rounded-xl border p-4">
                <h3 className="font-semibold text-foreground mb-4">Phân bố học viên</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={courseDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {courseDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="courses" className="mt-4">
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground">Khóa</th>
                    <th className="text-center p-3 font-semibold text-foreground">Học viên</th>
                    <th className="text-center p-3 font-semibold text-foreground">Tiến độ TB</th>
                    <th className="text-center p-3 font-semibold text-foreground">Điểm TB</th>
                    <th className="text-center p-3 font-semibold text-foreground">Hoàn thành</th>
                    <th className="text-right p-3 font-semibold text-foreground">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {courseStats.map((c, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium text-foreground">{c.course}</td>
                      <td className="p-3 text-center">{c.students}</td>
                      <td className="p-3 text-center">{c.progress}</td>
                      <td className="p-3 text-center font-medium text-primary">{c.avg}</td>
                      <td className="p-3 text-center">{c.completion}</td>
                      <td className="p-3 text-right font-medium text-foreground">{c.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="quizzes" className="mt-4 space-y-6">
            <div className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold text-foreground mb-4">Câu hỏi sai nhiều nhất (Top 5)</h3>
              <div className="space-y-2">
                {hardestQuestions.map((q, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm font-bold text-destructive">{i + 1}</span>
                    <span className="text-sm text-foreground flex-1">{q.question}</span>
                    <span className="text-sm font-medium text-destructive">{q.correct} đúng</span>
                    <span className="text-xs text-muted-foreground">{q.attempts} lượt</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="mt-4">
            <div className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold text-foreground mb-4">Doanh thu theo tháng (triệu VNĐ)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Doanh thu (tr)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
