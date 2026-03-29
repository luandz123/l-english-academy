import StudentLayout from "@/components/StudentLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const quizHistory = [
  { name: "Thi Online Part 2 Đề 03", part: "Part 2", score: "8.5/10", time: "8 phút", date: "25/03/2026" },
  { name: "Thi Online Part 1 Đề 01", part: "Part 1", score: "10/10", time: "5 phút", date: "22/03/2026" },
  { name: "Thi Online Part 1 Đề 02", part: "Part 1", score: "9/10", time: "6 phút", date: "20/03/2026" },
  { name: "Bộ đề 2026 Đề 01", part: "Full Test", score: "750", time: "1h 45m", date: "18/03/2026" },
  { name: "Bộ đề 2026 Đề 02", part: "Full Test", score: "680", time: "1h 50m", date: "15/03/2026" },
];

const courseProgress = [
  { name: "Luyện thi TOEIC Nghe-Đọc", progress: 45 },
  { name: "EZ Vocab TOEIC", progress: 30 },
  { name: "Bổ Trợ Kỹ Năng Nghe", progress: 10 },
  { name: "Luyện Bộ Đề TOEIC 2026", progress: 15 },
];

const Profile = () => {
  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile header */}
        <div className="bg-card rounded-xl border p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">D</div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Demo User</h1>
            <p className="text-sm text-muted-foreground">demo@l-english.vn</p>
            <p className="text-xs text-muted-foreground">Đăng ký: 01/01/2026</p>
          </div>
        </div>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="progress">Tiến độ</TabsTrigger>
            <TabsTrigger value="history">Lịch sử bài thi</TabsTrigger>
            <TabsTrigger value="password">Đổi mật khẩu</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <div className="bg-card rounded-xl border p-6 space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Họ và tên</Label>
                <Input defaultValue="Demo User" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input defaultValue="demo@l-english.vn" disabled />
              </div>
              <Button>Cập nhật</Button>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-primary">24h 30m</p>
                <p className="text-xs text-muted-foreground">Tổng giờ học</p>
              </div>
              <div className="bg-card rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-accent">45</p>
                <p className="text-xs text-muted-foreground">Bài thi đã làm</p>
              </div>
              <div className="bg-card rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-warning">7.8</p>
                <p className="text-xs text-muted-foreground">Điểm TB</p>
              </div>
              <div className="bg-card rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-success">4</p>
                <p className="text-xs text-muted-foreground">Khóa đã đăng ký</p>
              </div>
            </div>
            {courseProgress.map((c) => (
              <div key={c.name} className="bg-card rounded-xl border p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-foreground">{c.name}</span>
                  <span className="text-muted-foreground">{c.progress}%</span>
                </div>
                <Progress value={c.progress} className="h-2" />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground">Bài thi</th>
                    <th className="text-left p-3 font-semibold text-foreground">Phần</th>
                    <th className="text-center p-3 font-semibold text-foreground">Điểm</th>
                    <th className="text-center p-3 font-semibold text-foreground">Thời gian</th>
                    <th className="text-center p-3 font-semibold text-foreground">Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {quizHistory.map((h, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 text-foreground">{h.name}</td>
                      <td className="p-3 text-muted-foreground">{h.part}</td>
                      <td className="p-3 text-center font-medium text-primary">{h.score}</td>
                      <td className="p-3 text-center text-muted-foreground">{h.time}</td>
                      <td className="p-3 text-center text-muted-foreground">{h.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="password" className="mt-4">
            <div className="bg-card rounded-xl border p-6 space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Mật khẩu hiện tại</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>Mật khẩu mới</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>Xác nhận mật khẩu mới</Label>
                <Input type="password" />
              </div>
              <Button>Đổi mật khẩu</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
};

export default Profile;
