import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/api/media";
import { createCourse, listAdminCategories } from "@/lib/api/catalog";
import { Upload, Plus, Layers, ArrowLeft } from "lucide-react";

const AdminCourseNew = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    description: "",
    course_type: "video_quiz",
    category_id: "",
    instructor: "L-English Mentor",
    price: 0,
    is_free: false,
    duration_months: 6,
    is_active: true,
    display_order: 0,
    thumbnail_url: "",
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["admin-course-categories"],
    queryFn: async () => {
      const { data } = await listAdminCategories();
      return (data || []).filter((c) => c.is_active);
    },
  });

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleCategorySelect = (catIdStr: string) => {
    setForm((f) => ({
      ...f,
      category_id: catIdStr,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const { publicUrl } = await uploadMedia(file, "course-thumbnails");
      update("thumbnail_url", publicUrl);
      toast({ title: "Tải ảnh lên thành công" });
    } catch (error: any) {
      toast({ title: "Lỗi tải ảnh lên", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (active: boolean) => {
      if (!form.category_id) {
        throw new Error("Vui lòng chọn danh mục khóa học");
      }
      const { error } = await createCourse({
        title: form.title,
        subtitle: form.subtitle || null,
        description: form.description || null,
        course_type: form.course_type,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        instructor: form.instructor,
        price: form.is_free ? 0 : form.price,
        is_free: form.is_free,
        duration_months: form.duration_months,
        is_active: active,
        display_order: form.display_order,
        thumbnail_url: form.thumbnail_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-active-courses"] });
      toast({ title: "Đã tạo khóa học thành công" });
      navigate("/admin/courses");
    },
    onError: (e: any) => toast({ title: "Lỗi tạo khóa học", description: e.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl h-9 w-9"
              onClick={() => navigate("/admin/courses")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-foreground">Tạo Khóa Học Mới</h1>
              <p className="text-muted-foreground text-xs font-semibold">
                Điền đầy đủ thông tin để hiển thị khóa học đẹp mắt ngoài trang chủ.
              </p>
            </div>
          </div>
          <Button variant="outline" asChild size="sm" className="rounded-xl font-bold">
            <Link to="/admin/categories">
              <Layers className="w-4 h-4 mr-1.5" /> Quản lý danh mục
            </Link>
          </Button>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* CỘT TRÁI (3 CỘT): THÔNG TIN CỐT LÕI & MÔ TẢ HIỂN THỊ */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-card rounded-2xl border border-border/70 p-6 space-y-5 shadow-soft-sm">
              {/* Tên khóa học */}
              <div className="space-y-2">
                <Label className="font-bold text-sm">Tên khóa học *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="Ví dụ: Bộ đề thi thử sát đề thi thật 2026, TOEIC Nghe-Đọc 700+..."
                  className="font-bold text-base rounded-xl"
                />
              </div>

              {/* Danh mục khóa học (BẮT BUỘC LẤY TỪ COURSE_CATEGORIES) */}
              <div className="space-y-2 p-3.5 bg-primary/5 rounded-2xl border border-primary/20">
                <div className="flex items-center justify-between">
                  <Label className="font-black text-sm text-primary">
                    Danh mục khóa học *
                  </Label>
                  <Link
                    to="/admin/categories"
                    className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Thêm danh mục mới
                  </Link>
                </div>
                <Select value={form.category_id} onValueChange={handleCategorySelect}>
                  <SelectTrigger className="font-bold rounded-xl bg-card border-primary/30">
                    <SelectValue placeholder="-- Chọn danh mục khóa học --" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} className="font-medium">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Khóa học sẽ tự động được phân vào cụm danh mục tương ứng ngoài trang chủ.
                </p>
              </div>

              {/* Hình thức học / Giao diện bài học */}
              <div className="space-y-2">
                <Label className="font-bold text-sm">Hình thức học tập &amp; Giao diện làm bài *</Label>
                <Select value={form.course_type} onValueChange={(v) => update("course_type", v)}>
                  <SelectTrigger className="font-medium rounded-xl">
                    <SelectValue placeholder="Chọn hình thức" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="fulltest">📋 Phòng thi thử Full Test (Format ETS 200 câu, 120 phút)</SelectItem>
                    <SelectItem value="listening">🎧 Luyện nghe từng bước &amp; Dictation (Chép chính tả)</SelectItem>
                    <SelectItem value="video_quiz">🎬 Video bài giảng + Trắc nghiệm Quiz</SelectItem>
                    <SelectItem value="flashcard">🃏 Học từ vựng Flashcard</SelectItem>
                    <SelectItem value="speaking">🗣️ Luyện nói &amp; Viết (Speaking &amp; Writing)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Xác định học viên sẽ làm bài Full Test 200 câu hay xem video, luyện Dictation khi nhấn "Vào học".
                </p>
              </div>

              {/* Mô tả ngắn hiển thị trên thẻ card trang chủ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-sm">
                    Mô tả ngắn (Hiển thị trực tiếp trên thẻ ngoài trang chủ)
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Khuyên dùng 1-2 câu</span>
                </div>
                <Input
                  value={form.subtitle}
                  onChange={(e) => update("subtitle", e.target.value)}
                  placeholder="VD: 200 câu • 120 phút • Bấm giờ thật • Chấm điểm tự động kèm lời giải chi tiết."
                  className="font-medium rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">
                  Dòng mô tả này sẽ xuất hiện ngay dưới tên khóa học trên thẻ card ngoài trang chủ.
                </p>
              </div>

              {/* Mô tả chi tiết */}
              <div className="space-y-2">
                <Label className="font-bold text-sm">Mô tả chi tiết khóa học</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={4}
                  placeholder="Mô tả mục tiêu đầu ra, lộ trình học, giáo trình và quyền lợi của học viên..."
                  className="font-medium rounded-xl resize-none"
                />
              </div>

              {/* Ảnh bìa thumbnail */}
              <div className="space-y-2">
                <Label className="font-bold text-sm">Ảnh bìa khóa học (Thumbnail URL)</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.thumbnail_url}
                    onChange={(e) => update("thumbnail_url", e.target.value)}
                    placeholder="https://..."
                    className="flex-1 font-mono text-sm rounded-xl"
                  />
                  <Button
                    variant="outline"
                    className="shrink-0 font-bold rounded-xl active:scale-95 duration-120"
                    asChild
                    disabled={isUploading}
                  >
                    <label className="cursor-pointer">
                      {isUploading ? "Đang tải..." : <><Upload className="w-4 h-4 mr-2" /> Tải ảnh</>}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </Button>
                </div>
                {form.thumbnail_url && (
                  <div className="mt-2 aspect-video w-full max-w-sm rounded-xl overflow-hidden border border-border/70 bg-muted shadow-soft-xs">
                    <img src={form.thumbnail_url} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (2 CỘT): GIẢNG VIÊN, GIÁ, THỜI HẠN & HIỂN THỊ */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card rounded-2xl border border-border/70 p-6 space-y-5 shadow-soft-sm">
              <div className="space-y-2">
                <Label className="font-bold text-sm">Giảng viên / Người hướng dẫn</Label>
                <Input
                  value={form.instructor}
                  onChange={(e) => update("instructor", e.target.value)}
                  placeholder="VD: L-English Mentor, Cô Mai Phương..."
                  className="font-medium rounded-xl"
                />
              </div>

              {/* Chế độ học thử / Miễn phí */}
              <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border/60">
                <div className="space-y-0.5">
                  <Label className="font-bold text-sm cursor-pointer">Khóa học miễn phí (FREE)</Label>
                  <p className="text-[11px] text-muted-foreground">Hiện nhãn FREE và cho phép học thử</p>
                </div>
                <Switch
                  checked={form.is_free}
                  onCheckedChange={(v) => update("is_free", v)}
                />
              </div>

              {!form.is_free && (
                <div className="space-y-2">
                  <Label className="font-bold text-sm">Học phí (VNĐ)</Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => update("price", +e.target.value)}
                    className="font-bold rounded-xl"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {form.price > 0 ? `${form.price.toLocaleString("vi-VN")} đ` : "Miễn phí"}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="font-bold text-sm">Thời hạn học (tháng)</Label>
                <Select
                  value={String(form.duration_months)}
                  onValueChange={(v) => update("duration_months", +v)}
                >
                  <SelectTrigger className="font-medium rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="3">3 tháng</SelectItem>
                    <SelectItem value="6">6 tháng</SelectItem>
                    <SelectItem value="12">12 tháng (1 năm)</SelectItem>
                    <SelectItem value="0">Vĩnh viễn (Trọn đời)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-sm">Thứ tự ưu tiên hiển thị</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => update("display_order", +e.target.value)}
                  className="font-medium rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">Số nhỏ hơn sẽ xếp trước trong danh mục</p>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border/60">
                <div className="space-y-0.5">
                  <Label className="font-bold text-sm cursor-pointer">Trạng thái hoạt động</Label>
                  <p className="text-[11px] text-muted-foreground">Bật để hiển thị ngay cho học viên</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => update("is_active", v)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="font-bold rounded-xl active:scale-95 duration-120"
            onClick={() => navigate("/admin/courses")}
          >
            Hủy
          </Button>
          <Button
            variant="outline"
            className="font-bold rounded-xl active:scale-95 duration-120"
            onClick={() => createMutation.mutate(false)}
            disabled={!form.title || !form.category_id || createMutation.isPending}
          >
            Lưu bản nháp
          </Button>
          <Button
            className="btn-3d-green font-black rounded-xl active:scale-95 duration-120"
            onClick={() => createMutation.mutate(true)}
            disabled={!form.title || !form.category_id || createMutation.isPending}
          >
            {createMutation.isPending ? "Đang xuất bản..." : "Xuất bản khóa học"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCourseNew;

