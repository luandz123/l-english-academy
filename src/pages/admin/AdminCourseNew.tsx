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
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";

const AdminCourseNew = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    title: "", subtitle: "", description: "", course_type: "", category_id: "",
    instructor: "Cô Mai Phương", price: 0, duration_months: 6,
    is_active: false, display_order: 0, thumbnail_url: "",
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-course-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("course_categories").select("*").order("display_order");
      return data || [];
    },
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
        category_id: form.category_id ? parseInt(form.category_id) : null,
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
            <div className="bg-card rounded-2xl border border-border/70 p-6 space-y-4 shadow-soft-sm">
              <div className="space-y-2">
                <Label className="font-bold">Tên khóa học *</Label>
                <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Ví dụ: Luyện thi TOEIC Nghe-Đọc" className="font-medium rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Mô tả ngắn</Label>
                <Input value={form.subtitle} onChange={(e) => update("subtitle", e.target.value)} placeholder="Subtitle ngắn gọn" className="font-medium rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Mô tả chi tiết</Label>
                <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={5} className="font-medium rounded-xl resize-none" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Link ảnh khóa học (Thumbnail URL)</Label>
                <div className="flex gap-2">
                  <Input value={form.thumbnail_url} onChange={(e) => update("thumbnail_url", e.target.value)} placeholder="https://..." className="flex-1 font-mono text-sm rounded-xl" />
                  <Button variant="outline" className="shrink-0 font-bold rounded-xl active:scale-95 duration-120" asChild disabled={isUploading}>
                    <label className="cursor-pointer">
                      {isUploading ? "Đang tải..." : <><Upload className="w-4 h-4 mr-2" /> Tải ảnh lên</>}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                    </label>
                  </Button>
                </div>
                {form.thumbnail_url && (
                    <div className="mt-2 aspect-video w-full max-w-sm rounded-xl overflow-hidden border border-border/70 bg-muted shadow-soft-xs">
                      <img src={form.thumbnail_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Loại nội dung *</Label>
                <Select value={form.course_type} onValueChange={(v) => update("course_type", v)}>
                  <SelectTrigger className="font-medium rounded-xl"><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="video_quiz">Video + Quiz</SelectItem>
                    <SelectItem value="flashcard">Flashcard</SelectItem>
                    <SelectItem value="listening">Listening</SelectItem>
                    <SelectItem value="speaking">Speaking & Writing</SelectItem>
                    <SelectItem value="fulltest">Full Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Danh mục hiển thị</Label>
                <Select value={form.category_id} onValueChange={(v) => update("category_id", v)}>
                  <SelectTrigger className="font-medium rounded-xl"><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {categories.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Giảng viên</Label>
                <Input value={form.instructor} onChange={(e) => update("instructor", e.target.value)} className="font-medium rounded-xl" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card rounded-2xl border border-border/70 p-6 space-y-4 shadow-soft-sm">
              <div className="space-y-2">
                <Label className="font-bold">Giá (VNĐ)</Label>
                <Input type="number" value={form.price} onChange={(e) => update("price", +e.target.value)} className="font-medium rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Thời hạn (tháng)</Label>
                <Select value={String(form.duration_months)} onValueChange={(v) => update("duration_months", +v)}>
                  <SelectTrigger className="font-medium rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="3">3 tháng</SelectItem>
                    <SelectItem value="6">6 tháng</SelectItem>
                    <SelectItem value="12">12 tháng</SelectItem>
                    <SelectItem value="0">Vĩnh viễn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border/60">
                <Label className="font-bold cursor-pointer">Trạng thái hoạt động</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => update("is_active", v)} />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Thứ tự hiển thị</Label>
                <Input type="number" value={form.display_order} onChange={(e) => update("display_order", +e.target.value)} className="font-medium rounded-xl" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold rounded-xl active:scale-95 duration-120" onClick={() => navigate("/admin/courses")}>Hủy</Button>
          <Button variant="outline" className="font-bold rounded-xl active:scale-95 duration-120" onClick={() => createMutation.mutate(false)} disabled={!form.title || !form.course_type || createMutation.isPending}>Lưu nháp</Button>
          <Button className="btn-3d-green font-black rounded-xl active:scale-95 duration-120" onClick={() => createMutation.mutate(true)} disabled={!form.title || !form.course_type || createMutation.isPending}>
            {createMutation.isPending ? "Đang xuất bản..." : "Xuất bản"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCourseNew;
