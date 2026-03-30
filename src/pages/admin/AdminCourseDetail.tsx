import AdminLayout from "@/components/AdminLayout";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

const AdminCourseDetail = () => {
  const { courseId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const id = Number(courseId);

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
  useEffect(() => {
    if (course) { setTitle(course.title); setDescription(course.description ?? ""); }
  }, [course]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("courses").update({ title, description }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course", id] });
      toast({ title: "Đã cập nhật khóa học" });
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
        .select("*, profiles!inner(full_name)")
        .eq("course_id", id)
        .order("enrolled_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["admin-course-materials", id],
    queryFn: async () => {
      const { data } = await supabase.from("materials").select("*").eq("course_id", id).order("display_order");
      return data ?? [];
    },
  });

  if (isLoading) return <AdminLayout><div className="p-6"><Skeleton className="h-8 w-64 mb-4" /><Skeleton className="h-64 w-full" /></div></AdminLayout>;
  if (!course) return <AdminLayout><div className="p-6 text-muted-foreground">Khóa học không tồn tại.</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="content">Nội dung ({modules.length} modules)</TabsTrigger>
            <TabsTrigger value="materials">Tài liệu ({materials.length})</TabsTrigger>
            <TabsTrigger value="students">Học viên ({enrolledStudents.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <div className="bg-card rounded-xl border p-6 space-y-4 max-w-2xl">
              <div className="space-y-2">
                <Label>Tên khóa học</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>Lưu thay đổi</Button>
            </div>
          </TabsContent>

          <TabsContent value="content" className="mt-4 space-y-4">
            {modules.map((mod: any) => (
              <div key={mod.id} className="bg-card rounded-xl border">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-sm text-foreground">{mod.title}</span>
                  </div>
                </div>
                <div className="divide-y">
                  {(mod.lessons ?? []).map((l: any) => (
                    <div key={`l-${l.id}`} className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30">
                      <span className="text-xs">🎬</span>
                      <span className="text-sm text-foreground flex-1">{l.title}</span>
                    </div>
                  ))}
                  {(mod.quizzes ?? []).map((q: any) => (
                    <div key={`q-${q.id}`} className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30">
                      <span className="text-xs">📝</span>
                      <span className="text-sm text-foreground flex-1">{q.title} ({q.total_questions} câu)</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {modules.length === 0 && <p className="text-sm text-muted-foreground">Chưa có nội dung.</p>}
          </TabsContent>

          <TabsContent value="materials" className="mt-4">
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground">Tên</th>
                    <th className="text-left p-3 font-semibold text-foreground">Loại</th>
                    <th className="text-left p-3 font-semibold text-foreground">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m: any) => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 text-foreground">{m.title}</td>
                      <td className="p-3 text-muted-foreground">{m.file_type}</td>
                      <td className="p-3 text-muted-foreground">{m.created_at ? new Date(m.created_at).toLocaleDateString("vi-VN") : ""}</td>
                    </tr>
                  ))}
                  {materials.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">Chưa có tài liệu</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>

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
