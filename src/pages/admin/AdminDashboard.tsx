import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, ClipboardCheck, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const kpis = [
  { icon: Users, label: "Tổng học viên", value: "1,248", trend: "+24 tuần này", color: "text-primary", bg: "bg-primary/10" },
  { icon: BookOpen, label: "Khóa học", value: "5", trend: "đang hoạt động", color: "text-accent", bg: "bg-accent/10" },
  { icon: ClipboardCheck, label: "Lượt làm bài thi", value: "8,432", trend: "+312 hôm nay", color: "text-warning", bg: "bg-warning/10" },
  { icon: DollarSign, label: "Doanh thu tháng", value: "48,000,000 đ", trend: "+12%", color: "text-success", bg: "bg-success/10" },
];

const weeklyData = Array.from({ length: 12 }, (_, i) => ({
  week: `T${i + 1}`,
  newStudents: 15 + Math.floor(Math.random() * 30),
  completed: 5 + Math.floor(Math.random() * 15),
}));

const partScores = [
  { part: "Part 1", score: 8.5 },
  { part: "Part 2", score: 7.8 },
  { part: "Part 3", score: 7.2 },
  { part: "Part 4", score: 6.8 },
  { part: "Part 5", score: 8.0 },
  { part: "Part 6", score: 7.0 },
  { part: "Part 7", score: 6.2 },
];

const recentStudents = [
  { name: "Nguyễn Văn A", email: "a@gmail.com", course: "TOEIC Nghe-Đọc", date: "28/03" },
  { name: "Trần Thị B", email: "b@gmail.com", course: "EZ Vocab", date: "27/03" },
  { name: "Lê Minh C", email: "c@gmail.com", course: "Full Test 2026", date: "27/03" },
  { name: "Phạm D", email: "d@gmail.com", course: "TOEIC Nghe-Đọc", date: "26/03" },
  { name: "Hoàng E", email: "e@gmail.com", course: "Listening", date: "26/03" },
];

const recentQuizzes = [
  { student: "Trần B", quiz: "Part 2 Đề 03", score: "9/10", time: "5 phút trước" },
  { student: "Nguyễn A", quiz: "Part 1 Đề 01", score: "10/10", time: "12 phút trước" },
  { student: "Lê C", quiz: "Part 5 Đề 02", score: "7/10", time: "30 phút trước" },
  { student: "Phạm D", quiz: "Full Test Đề 01", score: "750", time: "1 giờ trước" },
  { student: "Hoàng E", quiz: "Vocab Day 3", score: "42/49", time: "2 giờ trước" },
];

const AdminDashboard = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Tổng quan Admin</h1>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="bg-card rounded-xl border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center`}>
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-xs text-accent flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {k.trend}
              </p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border p-4">
            <h3 className="font-semibold text-foreground mb-4">Học viên mới theo tuần</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="newStudents" stroke="hsl(var(--primary))" name="Đăng ký mới" strokeWidth={2} />
                <Line type="monotone" dataKey="completed" stroke="hsl(var(--accent))" name="Hoàn thành" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <h3 className="font-semibold text-foreground mb-4">Điểm trung bình theo PART</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={partScores}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="part" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 10]} />
                <Tooltip />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Điểm TB" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tables */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Học viên mới nhất</h3>
              <Button variant="ghost" size="sm" className="text-xs text-primary">Xem tất cả →</Button>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {recentStudents.map((s, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <p className="font-medium text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{s.course}</td>
                    <td className="p-3 text-xs text-muted-foreground text-right">{s.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-card rounded-xl border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Bài thi vừa hoàn thành</h3>
              <Button variant="ghost" size="sm" className="text-xs text-primary">Xem tất cả →</Button>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {recentQuizzes.map((q, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">{q.student}</td>
                    <td className="p-3 text-muted-foreground">{q.quiz}</td>
                    <td className="p-3 text-center font-medium text-primary">{q.score}</td>
                    <td className="p-3 text-xs text-muted-foreground text-right">{q.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3">
          <Button asChild><a href="/admin/courses/new">+ Tạo khóa học mới</a></Button>
          <Button variant="outline">+ Thêm bài giảng</Button>
          <Button variant="outline">+ Thêm câu hỏi</Button>
          <Button variant="outline">📤 Xuất báo cáo</Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
