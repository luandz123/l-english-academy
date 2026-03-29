import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Plus, Search, Edit, Eye, Trash2 } from "lucide-react";

const courses = [
  { id: 1, title: "Luyện thi TOEIC Nghe-Đọc", type: "🎬 Video", students: 892, lessons: 70, quizzes: "100+", active: true },
  { id: 2, title: "EZ Vocab TOEIC", type: "🃏 Flashcard", students: 654, lessons: 0, quizzes: "3000+", active: true },
  { id: 3, title: "Bổ Trợ Kỹ Năng Nghe", type: "🎧 Listening", students: 401, lessons: 0, quizzes: "800+", active: true },
  { id: 4, title: "TOEIC Nói-Viết", type: "🗣️ Speaking", students: 210, lessons: 0, quizzes: "—", active: false },
  { id: 5, title: "Luyện Bộ Đề 2026", type: "📋 Full Test", students: 731, lessons: 0, quizzes: "60+ đề", active: true },
];

const AdminCourses = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quản lý Khóa Học</h1>
            <p className="text-sm text-muted-foreground">5 khóa học đang hoạt động</p>
          </div>
          <Button asChild><Link to="/admin/courses/new"><Plus className="w-4 h-4 mr-2" /> Tạo khóa học mới</Link></Button>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm khóa học..." className="pl-9" />
          </div>
        </div>

        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold text-foreground">#</th>
                  <th className="text-left p-3 font-semibold text-foreground">Tên khóa học</th>
                  <th className="text-left p-3 font-semibold text-foreground">Loại</th>
                  <th className="text-center p-3 font-semibold text-foreground">Học viên</th>
                  <th className="text-center p-3 font-semibold text-foreground">Bài giảng</th>
                  <th className="text-center p-3 font-semibold text-foreground">Bài thi</th>
                  <th className="text-center p-3 font-semibold text-foreground">Trạng thái</th>
                  <th className="text-center p-3 font-semibold text-foreground">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c, i) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground">{i + 1}</td>
                    <td className="p-3 font-medium text-foreground">{c.title}</td>
                    <td className="p-3">{c.type}</td>
                    <td className="p-3 text-center text-foreground">{c.students}</td>
                    <td className="p-3 text-center text-muted-foreground">{c.lessons || "—"}</td>
                    <td className="p-3 text-center text-muted-foreground">{c.quizzes}</td>
                    <td className="p-3 text-center">
                      <Badge variant={c.active ? "default" : "secondary"} className={c.active ? "bg-success text-success-foreground" : ""}>
                        {c.active ? "Hoạt động" : "Nháp"}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="ghost" asChild>
                          <Link to={`/admin/courses/${c.id}`}><Edit className="w-4 h-4" /></Link>
                        </Button>
                        <Button size="icon" variant="ghost" asChild>
                          <Link to={`/courses/${c.id}`}><Eye className="w-4 h-4" /></Link>
                        </Button>
                        <Button size="icon" variant="ghost"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCourses;
