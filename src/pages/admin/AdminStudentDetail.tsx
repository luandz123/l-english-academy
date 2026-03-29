import AdminLayout from "@/components/AdminLayout";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

const AdminStudentDetail = () => {
  const { userId } = useParams();

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Profile header */}
        <div className="bg-card rounded-xl border p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">A</div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Nguyễn Văn An</h1>
            <p className="text-sm text-muted-foreground">📧 an@gmail.com</p>
            <p className="text-xs text-muted-foreground">📅 Đăng ký: 01/01/2026 · 🔖 Đang học</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">✏️ Sửa</Button>
            <Button size="sm" variant="outline" className="text-destructive">🚫 Khóa</Button>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="courses">Khóa học</TabsTrigger>
            <TabsTrigger value="history">Lịch sử bài thi</TabsTrigger>
            <TabsTrigger value="notes">Ghi chú Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-primary">3</p>
                <p className="text-xs text-muted-foreground">Khóa đã đăng ký</p>
              </div>
              <div className="bg-card rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-accent">45</p>
                <p className="text-xs text-muted-foreground">Bài thi đã làm</p>
              </div>
              <div className="bg-card rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-warning">8.2</p>
                <p className="text-xs text-muted-foreground">Điểm TB</p>
              </div>
              <div className="bg-card rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-success">24h</p>
                <p className="text-xs text-muted-foreground">Thời gian học</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="courses" className="mt-4">
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground">Khóa học</th>
                    <th className="text-center p-3 font-semibold text-foreground">Đăng ký</th>
                    <th className="text-center p-3 font-semibold text-foreground">Hết hạn</th>
                    <th className="text-center p-3 font-semibold text-foreground">Tiến độ</th>
                    <th className="text-center p-3 font-semibold text-foreground">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { course: "TOEIC Nghe-Đọc", enrolled: "01/01", expires: "01/07/2026", progress: 45 },
                    { course: "EZ Vocab", enrolled: "01/01", expires: "Vĩnh viễn", progress: 30 },
                    { course: "Full Test 2026", enrolled: "01/02", expires: "01/08/2026", progress: 15 },
                  ].map((c, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium text-foreground">{c.course}</td>
                      <td className="p-3 text-center text-muted-foreground">{c.enrolled}</td>
                      <td className="p-3 text-center text-muted-foreground">{c.expires}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 justify-center">
                          <Progress value={c.progress} className="h-1.5 w-20" />
                          <span className="text-xs">{c.progress}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Button size="sm" variant="outline" className="text-xs">Gia hạn</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button className="mt-3" variant="outline">+ Gán khóa học mới</Button>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground">Bài thi</th>
                    <th className="text-center p-3 font-semibold text-foreground">Phần</th>
                    <th className="text-center p-3 font-semibold text-foreground">Điểm</th>
                    <th className="text-center p-3 font-semibold text-foreground">Thời gian</th>
                    <th className="text-center p-3 font-semibold text-foreground">Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { quiz: "Part 2 Đề 03", part: "Part 2", score: "9/10", time: "8p 22s", date: "25/03/2026" },
                    { quiz: "Part 1 Đề 01", part: "Part 1", score: "10/10", time: "5p", date: "22/03/2026" },
                    { quiz: "Full Test Đề 01", part: "Full", score: "750", time: "1h45m", date: "18/03/2026" },
                  ].map((q, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 text-foreground">{q.quiz}</td>
                      <td className="p-3 text-center text-muted-foreground">{q.part}</td>
                      <td className="p-3 text-center font-medium text-primary">{q.score}</td>
                      <td className="p-3 text-center text-muted-foreground">{q.time}</td>
                      <td className="p-3 text-center text-muted-foreground">{q.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-4 space-y-4">
            <div className="bg-card rounded-xl border p-4 space-y-3">
              <Textarea placeholder="Ghi chú về học viên..." rows={3} />
              <Button size="sm">Lưu ghi chú</Button>
            </div>
            <div className="space-y-2">
              <div className="bg-card rounded-xl border p-3">
                <p className="text-sm text-foreground">Học viên VIP, liên hệ tư vấn định kỳ</p>
                <p className="text-xs text-muted-foreground mt-1">Admin · 20/03/2026 14:30</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminStudentDetail;
