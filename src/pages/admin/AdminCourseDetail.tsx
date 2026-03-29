import AdminLayout from "@/components/AdminLayout";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";

const modules = [
  {
    id: 1, title: "PART 1: Mô Tả Tranh (6 câu)",
    items: [
      { id: 1, type: "video", title: "Introduction to TOEIC Part 1" },
      { id: 2, type: "video", title: "Photos of People and Objects" },
      { id: 3, type: "quiz", title: "Thi Online: Photos (Đề 01)" },
      { id: 4, type: "quiz", title: "Thi Online: Photos (Đề 02)" },
    ],
  },
  { id: 2, title: "PART 2: Hỏi Đáp (25 câu)", items: [] },
  { id: 3, title: "PART 3: Hội Thoại Ngắn (39 câu)", items: [] },
];

const enrolledStudents = [
  { name: "Nguyễn Văn A", email: "a@gmail.com", enrolled: "01/01/2026", progress: 45, avg: 8.2 },
  { name: "Trần Thị B", email: "b@gmail.com", enrolled: "15/02/2026", progress: 30, avg: 7.5 },
  { name: "Lê Minh C", email: "c@gmail.com", enrolled: "20/03/2026", progress: 10, avg: 6.8 },
];

const AdminCourseDetail = () => {
  const { courseId } = useParams();

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <h1 className="text-2xl font-bold text-foreground">Chi tiết Khóa học #{courseId}</h1>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Thông tin cơ bản</TabsTrigger>
            <TabsTrigger value="content">Cấu trúc nội dung</TabsTrigger>
            <TabsTrigger value="materials">Tài liệu</TabsTrigger>
            <TabsTrigger value="students">Học viên</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <div className="bg-card rounded-xl border p-6 space-y-4 max-w-2xl">
              <div className="space-y-2">
                <Label>Tên khóa học</Label>
                <Input defaultValue="Luyện thi TOEIC Nghe-Đọc" />
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea defaultValue="70+ bài giảng · 100+ bài thi online · 740 tài liệu" rows={3} />
              </div>
              <Button>Lưu thay đổi</Button>
            </div>
          </TabsContent>

          <TabsContent value="content" className="mt-4 space-y-4">
            {modules.map((mod) => (
              <div key={mod.id} className="bg-card rounded-xl border">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <span className="font-semibold text-sm text-foreground">{mod.title}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" /> Thêm bài</Button>
                    <Button size="icon" variant="ghost"><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
                {mod.items.length > 0 && (
                  <div className="divide-y">
                    {mod.items.map((item) => (
                      <div key={item.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30">
                        <GripVertical className="w-3 h-3 text-muted-foreground cursor-grab" />
                        <span className="text-xs">{item.type === "video" ? "🎬" : "📝"}</span>
                        <span className="text-sm text-foreground flex-1">{item.title}</span>
                        <Button size="icon" variant="ghost"><Edit className="w-3 h-3" /></Button>
                        <Button size="icon" variant="ghost"><Trash2 className="w-3 h-3 text-destructive" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Button variant="outline"><Plus className="w-4 h-4 mr-2" /> Thêm PART/Module mới</Button>
          </TabsContent>

          <TabsContent value="materials" className="mt-4">
            <div className="bg-card rounded-xl border p-6">
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground mb-4">
                Kéo thả file vào đây hoặc click để chọn (PDF, JPG, PNG, MP3)
              </div>
              <p className="text-sm text-muted-foreground">740 tài liệu đã upload</p>
            </div>
          </TabsContent>

          <TabsContent value="students" className="mt-4">
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground">Họ tên</th>
                    <th className="text-left p-3 font-semibold text-foreground">Email</th>
                    <th className="text-center p-3 font-semibold text-foreground">Đăng ký</th>
                    <th className="text-center p-3 font-semibold text-foreground">Tiến độ</th>
                    <th className="text-center p-3 font-semibold text-foreground">Điểm TB</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledStudents.map((s, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium text-foreground">{s.name}</td>
                      <td className="p-3 text-muted-foreground">{s.email}</td>
                      <td className="p-3 text-center text-muted-foreground">{s.enrolled}</td>
                      <td className="p-3 text-center text-foreground">{s.progress}%</td>
                      <td className="p-3 text-center font-medium text-primary">{s.avg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminCourseDetail;
