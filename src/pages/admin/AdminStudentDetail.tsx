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

const AdminStudentDetail = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState("");

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
            <p className="text-xs text-muted-foreground">📅 Đăng ký: {profile.created_at ? new Date(profile.created_at).toLocaleDateString("vi-VN") : ""}</p>
          </div>
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
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e: any) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium text-foreground">{e.courses?.title ?? "—"}</td>
                      <td className="p-3 text-center text-muted-foreground">{e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString("vi-VN") : ""}</td>
                      <td className="p-3 text-center text-muted-foreground">{e.expires_at ? new Date(e.expires_at).toLocaleDateString("vi-VN") : "Vĩnh viễn"}</td>
                    </tr>
                  ))}
                  {enrollments.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">Chưa đăng ký khóa nào</td></tr>}
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
