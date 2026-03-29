import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const AdminCourseNew = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSave = () => {
    toast({ title: "Đã lưu khóa học", description: "Khóa học mới đã được tạo thành công." });
    navigate("/admin/courses");
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Tạo khóa học mới</h1>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <div className="space-y-2">
                <Label>Tên khóa học *</Label>
                <Input placeholder="Ví dụ: Luyện thi TOEIC Nghe-Đọc" />
              </div>
              <div className="space-y-2">
                <Label>Mô tả ngắn</Label>
                <Input placeholder="Subtitle ngắn gọn" />
              </div>
              <div className="space-y-2">
                <Label>Mô tả chi tiết</Label>
                <Textarea placeholder="Nội dung mô tả khóa học..." rows={5} />
              </div>
              <div className="space-y-2">
                <Label>Loại nội dung *</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video_quiz">Video + Quiz</SelectItem>
                    <SelectItem value="flashcard">Flashcard</SelectItem>
                    <SelectItem value="listening">Listening</SelectItem>
                    <SelectItem value="speaking">Speaking & Writing</SelectItem>
                    <SelectItem value="fulltest">Full Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Giảng viên</Label>
                <Input defaultValue="Cô Mai Phương" />
              </div>
              <div className="space-y-2">
                <Label>Mục tiêu học</Label>
                <Input placeholder="700-850+ TOEIC" />
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <div className="space-y-2">
                <Label>Thumbnail</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">
                  Kéo thả hoặc click để upload
                </div>
              </div>
              <div className="space-y-2">
                <Label>Giá (VNĐ)</Label>
                <Input type="number" placeholder="1600000" />
              </div>
              <div className="space-y-2">
                <Label>Thời hạn truy cập</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Chọn thời hạn" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 tháng</SelectItem>
                    <SelectItem value="6">6 tháng</SelectItem>
                    <SelectItem value="12">12 tháng</SelectItem>
                    <SelectItem value="0">Vĩnh viễn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Trạng thái hoạt động</Label>
                <Switch />
              </div>
              <div className="space-y-2">
                <Label>Thứ tự hiển thị</Label>
                <Input type="number" defaultValue="0" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/admin/courses")}>Hủy</Button>
          <Button variant="outline" onClick={handleSave}>Lưu nháp</Button>
          <Button onClick={handleSave}>Xuất bản</Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCourseNew;
