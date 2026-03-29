import StudentLayout from "@/components/StudentLayout";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PlayCircle, ClipboardCheck, Star, Clock } from "lucide-react";

const stats = [
  { icon: PlayCircle, label: "Bài giảng đã xem", value: "32/70", color: "text-primary" },
  { icon: ClipboardCheck, label: "Bài thi đã làm", value: "45/100+", color: "text-accent" },
  { icon: Star, label: "Điểm trung bình", value: "7.8/10", color: "text-warning" },
  { icon: Clock, label: "Thời gian học", value: "24h 30m", color: "text-success" },
];

const myCourses = [
  { id: 1, title: "Luyện thi TOEIC Nghe-Đọc", badge: "🎬 Video", progress: 45, lastAccess: "2 ngày trước" },
  { id: 2, title: "EZ Vocab TOEIC", badge: "🃏 Flashcard", progress: 30, lastAccess: "Hôm nay" },
  { id: 5, title: "Luyện Bộ Đề TOEIC 2026", badge: "📋 Full Test", progress: 15, lastAccess: "5 ngày trước" },
];

const activities = [
  "✅ Hoàn thành bài thi: Part 2 Đề số 03 — 8.5/10",
  "▶️ Đã xem: Introduction to TOEIC Part 1",
  "📖 Học từ vựng: Day 4 - Part 2 (50 từ)",
  "✅ Hoàn thành bài thi: Part 1 Đề số 01 — 10/10",
  "▶️ Đã xem: Photos of People and Objects",
];

const Dashboard = () => {
  return (
    <StudentLayout>
      <div className="space-y-6 max-w-6xl">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-xl p-6 text-primary-foreground">
          <h1 className="text-xl md:text-2xl font-bold">Xin chào, Demo User! 👋</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">Tiếp tục học nhé!</p>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Hoàn thành 45% khóa học TOEIC Nghe-Đọc</span>
              <span className="font-bold">45%</span>
            </div>
            <Progress value={45} className="h-2 bg-primary-foreground/20" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card rounded-xl border p-4 space-y-2">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* My courses */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Khóa học của tôi</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myCourses.map((c) => (
              <div key={c.id} className="bg-card rounded-xl border p-5 space-y-3 card-hover">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-sm">{c.title}</h3>
                  <span className="text-xs">{c.badge}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>{c.progress}% hoàn thành</span>
                    <span>Học lần cuối: {c.lastAccess}</span>
                  </div>
                  <Progress value={c.progress} className="h-1.5" />
                </div>
                <Button size="sm" className="w-full" asChild>
                  <Link to={`/courses/${c.id}`}>Tiếp tục học →</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Hoạt động gần đây</h2>
          <div className="bg-card rounded-xl border divide-y">
            {activities.map((a, i) => (
              <p key={i} className="px-4 py-3 text-sm text-muted-foreground">{a}</p>
            ))}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default Dashboard;
