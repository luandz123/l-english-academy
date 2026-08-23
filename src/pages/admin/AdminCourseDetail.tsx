
import AdminLayout from "@/components/AdminLayout";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ModuleManager from "@/components/admin/ModuleManager";
import { CourseFullTestManager } from "@/components/admin/CourseFullTestManager";
import { Upload } from "lucide-react";

const AdminCourseDetail = () => {
  const { courseId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const id = Number(courseId);

  const { data: fullTests = [] } = useQuery({
    queryKey: ["admin-course-fulltests", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("full_tests")
        .select("id, title")
        .eq("course_id", id);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: course, isLoading } = useQuery({
    queryKey: ["admin-course", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [instructor, setInstructor] = useState("");
  const [courseType, setCourseType] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [price, setPrice] = useState(0);
  const [durationMonths, setDurationMonths] = useState(6);
  const [isActive, setIsActive] = useState(true);
  const [isFree, setIsFree] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-course-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("course_categories").select("*").order("display_order");
      return data || [];
    },
  });

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description ?? "");
      setSubtitle(course.subtitle ?? "");
      setInstructor(course.instructor ?? "");
      setCourseType(course.course_type);
      setThumbnailUrl(course.thumbnail_url ?? "");
      setPrice(course.price ?? 0);
      setDurationMonths(course.duration_months ?? 6);
      setIsActive(course.is_active ?? true);
      setIsFree((course as any).is_free ?? false);
      setCategoryId(course.category_id ? String(course.category_id) : "");
    }
  }, [course]);

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
      setThumbnailUrl(urlData.publicUrl);
      toast({ title: "Tải ảnh lên thành công" });
    } catch (error: any) {
      toast({ title: "Lỗi tải ảnh lên", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("courses").update({
        title, description, subtitle, instructor, course_type: courseType,
        thumbnail_url: thumbnailUrl || null,
        category_id: categoryId ? parseInt(categoryId) : null,
        price, duration_months: durationMonths, is_active: isActive,
        is_free: isFree,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course", id] });
      toast({ title: "Đã cập nhật khóa học" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["admin-course-modules", id],
    queryFn: async () => {
      const { data } = await supabase.from("modules").select("*, lessons(*), quizzes(*)").eq("course_id", id).order("display_order");
      return data ?? [];
    },
  });

  const { data: enrolledStudents = [] } = useQuery({
    queryKey: ["admin-course-enrollments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", id)
        .order("enrolled_at", { ascending: false });
        
      if (!data || data.length === 0) return [];
      
      const userIds = [...new Set(data.map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      return data.map(d => ({
        ...d,
        profiles: profiles?.find(p => p.id === d.user_id) || null
      }));
    },
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["admin-course-materials", id],
    queryFn: async () => {
      const { data } = await supabase.from("materials").select("*").eq("course_id", id).order("display_order");
      return data ?? [];
    },
  });

  // Material CRUD
  const [matDialogOpen, setMatDialogOpen] = useState(false);
  const [matTitle, setMatTitle] = useState("");
  const [matUrl, setMatUrl] = useState("");
  const [matType, setMatType] = useState("pdf");

  const addMaterialMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("materials").insert({
        course_id: id, title: matTitle, file_url: matUrl, file_type: matType,
        display_order: materials.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-materials", id] });
      setMatDialogOpen(false);
      setMatTitle(""); setMatUrl(""); setMatType("pdf");
      toast({ title: "Đã thêm tài liệu" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (matId: number) => {
      await supabase.from("materials").delete().eq("id", matId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-materials", id] });
      toast({ title: "Đã xóa tài liệu" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) return <AdminLayout><div className="p-6"><Skeleton className="h-8 w-64 mb-4" /><Skeleton className="h-64 w-full" /></div></AdminLayout>;
  if (!course) return <AdminLayout><div className="p-6 text-muted-foreground">Khóa học không tồn tại.</div></AdminLayout>;

  const totalLessons = modules.reduce((sum: number, m: any) => sum + (m.lessons?.length || 0), 0);
  const totalQuizzes = modules.reduce((sum: number, m: any) => sum + (m.quizzes?.length || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {modules.length} parts · {totalLessons} bài học · {totalQuizzes} quiz · {enrolledStudents.length} học viên
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
              {isActive ? "Đang hoạt động" : "Tạm dừng"}
            </span>
          </div>
        </div>

        <Tabs defaultValue={course.course_type === "fulltest" ? "fulltests" : "content"}>
          <TabsList className="flex flex-wrap h-auto p-1 gap-1">
            <TabsTrigger value="fulltests" className="py-2 px-3">
              📋 Đề thi Full Test ({fullTests.length})
            </TabsTrigger>
            <TabsTrigger value="content" className="py-2 px-3">
              📚 Nội dung ({modules.length} parts)
            </TabsTrigger>
            <TabsTrigger value="info" className="py-2 px-3">
              ⚙️ Thông tin
            </TabsTrigger>
            <TabsTrigger value="materials" className="py-2 px-3">
              📎 Tài liệu ({materials.length})
            </TabsTrigger>
            <TabsTrigger value="students" className="py-2 px-3">
              👥 Học viên ({enrolledStudents.length})
            </TabsTrigger>
          </TabsList>

          {/* Full Test Tab */}
          <TabsContent value="fulltests" className="mt-4">
            <CourseFullTestManager courseId={id} courseTitle={course.title} />
          </TabsContent>

          {/* Content Tab - Main feature */}
          <TabsContent value="content" className="mt-4">
            <ModuleManager courseId={id} modules={modules} />
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info" className="mt-4">
            <div className="bg-card rounded-xl border p-6 space-y-4 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Tên khóa học</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Phụ đề</Label>
                  <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Mô tả</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Link ảnh khóa học (Thumbnail URL)</Label>
                  <div className="flex gap-2">
                    <Input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..." className="flex-1" />
                    <Button variant="outline" className="shrink-0" asChild disabled={isUploading}>
                      <label className="cursor-pointer">
                        {isUploading ? "Đang tải..." : <><Upload className="w-4 h-4 mr-2" /> Tải ảnh lên</>}
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                      </label>
                    </Button>
                  </div>
                  {thumbnailUrl && (
                    <div className="mt-2 aspect-video w-full max-w-sm rounded-lg overflow-hidden border bg-muted">
                      <img src={thumbnailUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Giảng viên</Label>
                  <Input value={instructor} onChange={(e) => setInstructor(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Loại khóa học</Label>
                  <Select value={courseType} onValueChange={setCourseType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="listening_reading">Nghe - Đọc</SelectItem>
                      <SelectItem value="speaking">Nói</SelectItem>
                      <SelectItem value="writing">Viết</SelectItem>
                      <SelectItem value="vocabulary">Từ vựng</SelectItem>
                      <SelectItem value="fulltest">Full Test</SelectItem>
                      <SelectItem value="combo">Combo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Danh mục hiển thị (Trang chủ)</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Giá (VNĐ)</Label>
                  <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Thời hạn (tháng)</Label>
                  <Input type="number" value={durationMonths} onChange={(e) => setDurationMonths(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Chế độ học</Label>
                  <Select value={isFree ? "free" : "paid"} onValueChange={(v) => setIsFree(v === "free")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Tính phí / Phải đăng ký</SelectItem>
                      <SelectItem value="free">Hoàn toàn Miễn phí (Public)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Trạng thái hiển thị</Label>
                  <Select value={isActive ? "active" : "inactive"} onValueChange={(v) => setIsActive(v === "active")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Hoạt động (Đang bán/dạy)</SelectItem>
                      <SelectItem value="inactive">Tạm dừng (Ẩn khỏi học viên)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setMatDialogOpen(true)}>+ Thêm tài liệu</Button>
            </div>
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground">Tên</th>
                    <th className="text-left p-3 font-semibold text-foreground">Loại</th>
                    <th className="text-left p-3 font-semibold text-foreground">Ngày tạo</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m: any) => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 text-foreground">
                        <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{m.title}</a>
                      </td>
                      <td className="p-3 text-muted-foreground">{m.file_type}</td>
                      <td className="p-3 text-muted-foreground">{m.created_at ? new Date(m.created_at).toLocaleDateString("vi-VN") : ""}</td>
                      <td className="p-3">
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Xóa?")) deleteMaterialMutation.mutate(m.id); }} className="text-destructive">Xóa</Button>
                      </td>
                    </tr>
                  ))}
                  {materials.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Chưa có tài liệu</td></tr>}
                </tbody>
              </table>
            </div>

            {matDialogOpen && (
              <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4" onClick={() => setMatDialogOpen(false)}>
                <div className="bg-card rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
                  <h3 className="font-bold text-foreground">Thêm tài liệu</h3>
                  <div className="space-y-2">
                    <Label>Tên tài liệu</Label>
                    <Input value={matTitle} onChange={(e) => setMatTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>URL file</Label>
                    <Input value={matUrl} onChange={(e) => setMatUrl(e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Loại file</Label>
                    <Select value={matType} onValueChange={setMatType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="audio">Audio</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="doc">Document</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setMatDialogOpen(false)}>Hủy</Button>
                    <Button onClick={() => addMaterialMutation.mutate()} disabled={addMaterialMutation.isPending || !matTitle.trim() || !matUrl.trim()}>Thêm</Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="mt-4">
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground">Họ tên</th>
                    <th className="text-center p-3 font-semibold text-foreground">Đăng ký</th>
                    <th className="text-center p-3 font-semibold text-foreground">Hết hạn</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledStudents.map((e: any) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium text-foreground">{e.profiles?.full_name ?? "—"}</td>
                      <td className="p-3 text-center text-muted-foreground">{e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString("vi-VN") : ""}</td>
                      <td className="p-3 text-center text-muted-foreground">{e.expires_at ? new Date(e.expires_at).toLocaleDateString("vi-VN") : "Vĩnh viễn"}</td>
                    </tr>
                  ))}
                  {enrolledStudents.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">Chưa có học viên</td></tr>}
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
