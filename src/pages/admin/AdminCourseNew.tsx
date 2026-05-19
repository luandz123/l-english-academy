import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";

const AdminCourseNew = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    title: "", subtitle: "", description: "", course_type: "",
    instructor: "Cô Mai Phương", price: 0, duration_months: 6,
    is_active: false, display_order: 0, thumbnail_url: "",
  });

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
      const path = `course-thumbnails/${Date.now()}_${sanitizedName}`;
      
      const { error: uploadErr } = await supabase.storage.from("materials").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("materials").getPublicUrl(path);
      update("thumbnail_url", urlData.publicUrl);
      toast({ title: "Tải ảnh lên thành công" });
    } catch (error: any) {
      toast({ title: "Lỗi tải ảnh lên", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (active: boolean) => {
      const { error } = await supabase.from("courses").insert({
        title: form.title,
        subtitle: form.subtitle || null,
        description: form.description || null,
        course_type: form.course_type,
        instructor: form.instructor,
        price: form.price,
        duration_months: form.duration_months,
        is_active: active,
        display_order: form.display_order,
        thumbnail_url: form.thumbnail_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Đã tạo khóa học thành công" });
      navigate("/admin/courses");
    },
    onError: (e) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="max-w-5xl space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Tạo khóa học mới</h1>
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <div className="space-y-2">
                <Label>Tên khóa học *</Label>
                <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Ví dụ: Luyện thi TOEIC Nghe-Đọc" />
              </div>
              <div className="space-y-2">
                <Label>Mô tả ngắn</Label>
                <Input value={form.subtitle} onChange={(e) => update("subtitle", e.target.value)} placeholder="Subtitle ngắn gọn" />
              </div>
              <div className="space-y-2">
                <Label>Mô tả chi tiết</Label>
                <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={5} />
              </div>
              <div className="space-y-2">
                <Label>Link ảnh khóa học (Thumbnail URL)</Label>
                <div className="flex gap-2">
                  <Input value={form.thumbnail_url} onChange={(e) => update("thumbnail_url", e.target.value)} placeholder="https://..." className="flex-1" />
                  <Button variant="outline" className="shrink-0" asChild disabled={isUploading}>
                    <label className="cursor-pointer">
                      {isUploading ? "Đang tải..." : <><Upload className="w-4 h-4 mr-2" /> Tải ảnh lên</>}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                    </label>
                  </Button>
                </div>
                {form.thumbnail_url && (
                    <div className="mt-2 aspect-video w-full max-w-sm rounded-lg overflow-hidden border bg-muted">
                      <img src={form.thumbnail_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Loại nội dung *</Label>
                <Select value={form.course_type} onValueChange={(v) => update("course_type", v)}>
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
                <Input value={form.instructor} onChange={(e) => update("instructor", e.target.value)} />
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <div className="space-y-2">
                <Label>Giá (VNĐ)</Label>
                <Input type="number" value={form.price} onChange={(e) => update("price", +e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Thời hạn (tháng)</Label>
                <Select value={String(form.duration_months)} onValueChange={(v) => update("duration_months", +v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Switch checked={form.is_active} onCheckedChange={(v) => update("is_active", v)} />
              </div>
              <div className="space-y-2">
                <Label>Thứ tự hiển thị</Label>
                <Input type="number" value={form.display_order} onChange={(e) => update("display_order", +e.target.value)} />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/admin/courses")}>Hủy</Button>
          <Button variant="outline" onClick={() => createMutation.mutate(false)} disabled={!form.title || !form.course_type || createMutation.isPending}>Lưu nháp</Button>
          <Button onClick={() => createMutation.mutate(true)} disabled={!form.title || !form.course_type || createMutation.isPending}>Xuất bản</Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCourseNew;
