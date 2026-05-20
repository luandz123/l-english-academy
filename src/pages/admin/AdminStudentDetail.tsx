import AdminLayout from "@/components/AdminLayout";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Unlock, ShieldAlert, Trash2, Edit, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

const AdminStudentDetail = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState("");
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [expiryDays, setExpiryDays] = useState("180");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["admin-student-profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", userId!).maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["admin-student-enrollments", userId],
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("*, courses(title)").eq("user_id", userId!);
      return data ?? [];
    },
    enabled: !!userId,
  });

  const { data: quizResults = [] } = useQuery({
    queryKey: ["admin-student-results", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_quiz_results")
        .select("*, quizzes(title)")
        .eq("user_id", userId!)
        .order("completed_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!userId,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["admin-student-notes", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_student_notes")
        .select("*")
        .eq("student_id", userId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!userId,
  });

  const { data: allCourses = [] } = useQuery({
    queryKey: ["admin-all-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return data ?? [];
    },
  });

  const availableCourses = allCourses.filter(c => !enrollments.find((e: any) => e.course_id === c.id));

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("admin_student_notes").insert({
        student_id: userId!, admin_id: user!.id, content: noteText,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["admin-student-notes", userId] });
      toast({ title: "Đã lưu ghi chú" });
    },
  });

  const unlockCourseMutation = useMutation({
    mutationFn: async () => {
      const expiresAt = expiryDays === "unlimited" ? null : new Date(Date.now() + Number(expiryDays) * 86400000).toISOString();
      const { error } = await supabase.from("enrollments").insert({
        user_id: userId!,
        course_id: Number(selectedCourseId),
        expires_at: expiresAt,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setUnlockDialogOpen(false);
      setSelectedCourseId("");
      queryClient.invalidateQueries({ queryKey: ["admin-student-enrollments", userId] });
      toast({ title: "Thành công", description: "Đã mở khóa khóa học cho học viên." });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    },
  });

  const removeEnrollmentMutation = useMutation({
    mutationFn: async (enrollmentId: number) => {
      const { error } = await supabase.from("enrollments").delete().eq("id", enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-student-enrollments", userId] });
      toast({ title: "Đã xóa quyền truy cập khóa học" });
    },
  });

  if (isLoading) return <AdminLayout><div className="p-6"><Skeleton className="h-8 w-64" /></div></AdminLayout>;
  if (!profile) return <AdminLayout><div className="p-6 text-muted-foreground">Không tìm thấy học viên.</div></AdminLayout>;

  const avgScore = quizResults.length
    ? (quizResults.reduce((s, r) => s + Number(r.score ?? 0), 0) / quizResults.length).toFixed(1)
    : "—";

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="bg-card rounded-xl border p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
            {(profile.full_name ?? "?")[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{profile.full_name ?? "—"}</h1>
            <p className="text-sm font-semibold text-muted-foreground font-mono mt-0.5">{profile.email ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">📅 Đăng ký: {profile.created_at ? new Date(profile.created_at).toLocaleDateString("vi-VN") : ""}</p>
          </div>
          <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90">
                <Unlock className="w-4 h-4 mr-2" /> Mở khóa học
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Cấp quyền truy cập khóa học</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Chọn khóa học</Label>
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="-- Chọn khóa học --" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCourses.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>
                      ))}
                      {availableCourses.length === 0 && <SelectItem value="none" disabled>Tất cả khóa học đã được mở</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Thời hạn (ngày)</Label>
                  <Select value={expiryDays} onValueChange={setExpiryDays}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 ngày (1 tuần)</SelectItem>
                      <SelectItem value="30">30 ngày</SelectItem>
                      <SelectItem value="90">90 ngày</SelectItem>
                      <SelectItem value="180">180 ngày (6 tháng)</SelectItem>
                      <SelectItem value="365">365 ngày (1 năm)</SelectItem>
                      <SelectItem value="unlimited">Vĩnh viễn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => unlockCourseMutation.mutate()} 
                  disabled={unlockCourseMutation.isPending || !selectedCourseId}
                >
                  {unlockCourseMutation.isPending ? "Đang xử lý..." : "Cấp quyền truy cập"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="courses">Khóa học ({enrollments.length})</TabsTrigger>
            <TabsTrigger value="history">Lịch sử thi ({quizResults.length})</TabsTrigger>
            <TabsTrigger value="notes">Ghi chú ({notes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-card rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-primary">{enrollments.length}</p>
                <p className="text-xs text-muted-foreground">Khóa đã đăng ký</p>
              </div>
              <div className="bg-card rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-accent">{quizResults.length}</p>
                <p className="text-xs text-muted-foreground">Bài thi đã làm</p>
              </div>
              <div className="bg-card rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-warning">{avgScore}</p>
                <p className="text-xs text-muted-foreground">Điểm TB</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="courses" className="mt-4">
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground">Khóa học</th>
                    <th className="text-center p-3 font-semibold text-foreground">Đăng ký</th>
                    <th className="text-center p-3 font-semibold text-foreground">Hết hạn</th>
                    <th className="text-center p-3 font-semibold text-foreground">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e: any) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium text-foreground">{e.courses?.title ?? "—"}</td>
                      <td className="p-3 text-center text-muted-foreground">{e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString("vi-VN") : ""}</td>
                      <td className="p-3 text-center text-muted-foreground">{e.expires_at ? new Date(e.expires_at).toLocaleDateString("vi-VN") : "Vĩnh viễn"}</td>
                      <td className="p-3 text-center">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm("Xóa quyền truy cập khóa học này?")) removeEnrollmentMutation.mutate(e.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {enrollments.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Chưa đăng ký khóa nào</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground">Bài thi</th>
                    <th className="text-center p-3 font-semibold text-foreground">Điểm</th>
                    <th className="text-center p-3 font-semibold text-foreground">Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {quizResults.map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 text-foreground">{r.quizzes?.title ?? `Quiz #${r.quiz_id}`}</td>
                      <td className="p-3 text-center font-medium text-primary">{r.correct_answers}/{r.total_questions}</td>
                      <td className="p-3 text-center text-muted-foreground">{r.completed_at ? new Date(r.completed_at).toLocaleDateString("vi-VN") : ""}</td>
                    </tr>
                  ))}
                  {quizResults.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">Chưa có kết quả</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-4 space-y-4">
            <div className="bg-card rounded-xl border p-4 space-y-3">
              <Textarea placeholder="Ghi chú về học viên..." rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)} />
              <Button size="sm" onClick={() => addNoteMutation.mutate()} disabled={!noteText.trim() || addNoteMutation.isPending}>Lưu ghi chú</Button>
            </div>
            <div className="space-y-2">
              {notes.map((n: any) => (
                <div key={n.id} className="bg-card rounded-xl border p-3">
                  <p className="text-sm text-foreground">{n.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{n.created_at ? new Date(n.created_at).toLocaleDateString("vi-VN") : ""}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminStudentDetail;
