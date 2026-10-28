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
import { Unlock, ShieldAlert, Trash2, Edit, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { listUserQuizResults } from "@/lib/api/assessment";
import { listStudentNotes, addStudentNote } from "@/lib/api/admin";
import {
  listUserEnrollments,
  addUserEnrollment,
  removeEnrollment,
} from "@/lib/api/learning";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
      const { data } = await listUserEnrollments(userId!);
      return data ?? [];
    },
    enabled: !!userId,
  });

  const { data: quizResults = [] } = useQuery({
    queryKey: ["admin-student-results", userId],
    queryFn: async () => {
      const { data } = await listUserQuizResults(userId!);
      return data ?? [];
    },
    enabled: !!userId,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["admin-student-notes", userId],
    queryFn: async () => {
      const { data } = await listStudentNotes(userId!);
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
      const { error } = await addStudentNote(userId!, noteText);
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
      const { error } = await addUserEnrollment(
        userId!,
        Number(selectedCourseId),
        expiryDays === "unlimited" ? null : Number(expiryDays),
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setUnlockDialogOpen(false);
      setSelectedCourseId("");
      queryClient.invalidateQueries({ queryKey: ["admin-student-enrollments", userId] });
      toast({ title: "Thành công", description: "Đã mở khóa khóa học cho học viên." });
    },
    onError: (err: any) => {
      toast({ title: "Mở khóa thất bại", description: getFriendlyErrorMessage(err), variant: "destructive" });
    },
  });

  const removeEnrollmentMutation = useMutation({
    mutationFn: async (enrollmentId: number) => {
      const { error } = await removeEnrollment(enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-student-enrollments", userId] });
      toast({ title: "Đã xóa quyền truy cập khóa học" });
    },
    onError: (err: any) => {
      toast({ title: "Xóa quyền truy cập thất bại", description: getFriendlyErrorMessage(err), variant: "destructive" });
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
        <div className="bg-card rounded-2xl border border-border/70 p-6 shadow-soft-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-black text-primary border border-primary/20 shrink-0">
            {(profile.full_name ?? "?")[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-black text-foreground">{profile.full_name ?? "—"}</h1>
            <p className="text-sm font-semibold text-muted-foreground font-mono mt-0.5">{profile.email ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">📅 Đăng ký: {profile.created_at ? new Date(profile.created_at).toLocaleDateString("vi-VN") : ""}</p>
          </div>
          <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-3d-green font-black rounded-xl active:scale-95 duration-120">
                <Unlock className="w-4 h-4 mr-2" /> Mở khóa học
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md border border-border/80 shadow-soft-2xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-black">Cấp quyền truy cập khóa học</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="font-bold">Chọn khóa học</Label>
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger className="font-medium rounded-xl">
                      <SelectValue placeholder="-- Chọn khóa học --" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {availableCourses.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>
                      ))}
                      {availableCourses.length === 0 && <SelectItem value="none" disabled>Tất cả khóa học đã được mở</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Thời hạn (ngày)</Label>
                  <Select value={expiryDays} onValueChange={setExpiryDays}>
                    <SelectTrigger className="font-medium rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
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
                  className="w-full btn-3d-green font-black rounded-xl active:scale-95 duration-120" 
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
          <TabsList className="bg-muted/60 p-1 rounded-2xl border border-border/60 h-auto">
            <TabsTrigger value="overview" className="rounded-xl font-bold py-2 px-4 data-[state=active]:bg-card data-[state=active]:shadow-soft-xs">Tổng quan</TabsTrigger>
            <TabsTrigger value="courses" className="rounded-xl font-bold py-2 px-4 data-[state=active]:bg-card data-[state=active]:shadow-soft-xs">Khóa học ({enrollments.length})</TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl font-bold py-2 px-4 data-[state=active]:bg-card data-[state=active]:shadow-soft-xs">Lịch sử thi ({quizResults.length})</TabsTrigger>
            <TabsTrigger value="notes" className="rounded-xl font-bold py-2 px-4 data-[state=active]:bg-card data-[state=active]:shadow-soft-xs">Ghi chú ({notes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-card rounded-2xl border border-border/70 p-5 text-center shadow-soft-xs">
                <p className="text-3xl font-black text-primary">{enrollments.length}</p>
                <p className="text-xs font-semibold text-muted-foreground mt-1">Khóa đã đăng ký</p>
              </div>
              <div className="bg-card rounded-2xl border border-border/70 p-5 text-center shadow-soft-xs">
                <p className="text-3xl font-black text-primary">{quizResults.length}</p>
                <p className="text-xs font-semibold text-muted-foreground mt-1">Bài thi đã làm</p>
              </div>
              <div className="bg-card rounded-2xl border border-border/70 p-5 text-center shadow-soft-xs">
                <p className="text-3xl font-black text-amber-500">{avgScore}</p>
                <p className="text-xs font-semibold text-muted-foreground mt-1">Điểm TB</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="courses" className="mt-4">
            <div className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-soft-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/50 text-xs font-black uppercase text-muted-foreground">
                    <th className="text-left px-4 py-3">Khóa học</th>
                    <th className="text-center px-4 py-3">Đăng ký</th>
                    <th className="text-center px-4 py-3">Hết hạn</th>
                    <th className="text-center px-4 py-3">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e: any) => (
                    <tr key={e.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-foreground">{e.courses?.title ?? "—"}</td>
                      <td className="px-4 py-3.5 text-center text-muted-foreground">{e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString("vi-VN") : ""}</td>
                      <td className="px-4 py-3.5 text-center text-muted-foreground">{e.expires_at ? new Date(e.expires_at).toLocaleDateString("vi-VN") : "Vĩnh viễn"}</td>
                      <td className="px-4 py-3.5 text-center">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 active:scale-95 duration-120 rounded-lg"
                              disabled={removeEnrollmentMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border border-border/80 shadow-soft-xl rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-black text-lg">Xác nhận thu hồi quyền khóa học?</AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                Bạn có chắc muốn thu hồi quyền truy cập khóa học <strong>"{e.courses?.title}"</strong> của học viên này?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl font-bold">Hủy bỏ</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeEnrollmentMutation.mutate(e.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold active:scale-95 duration-120"
                              >
                                {removeEnrollmentMutation.isPending ? "Đang xử lý..." : "Thu hồi quyền"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                  {enrollments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground font-semibold">Chưa đăng ký khóa nào</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-soft-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/50 text-xs font-black uppercase text-muted-foreground">
                    <th className="text-left px-4 py-3">Bài thi</th>
                    <th className="text-center px-4 py-3">Điểm</th>
                    <th className="text-center px-4 py-3">Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {quizResults.map((r: any) => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-foreground">{r.quizzes?.title ?? `Quiz #${r.quiz_id}`}</td>
                      <td className="px-4 py-3.5 text-center font-bold text-primary">{r.correct_answers}/{r.total_questions}</td>
                      <td className="px-4 py-3.5 text-center text-muted-foreground">{r.completed_at ? new Date(r.completed_at).toLocaleDateString("vi-VN") : ""}</td>
                    </tr>
                  ))}
                  {quizResults.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground font-semibold">Chưa có kết quả thi nào</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-4 space-y-4">
            <div className="bg-card rounded-2xl border border-border/70 p-5 shadow-soft-xs space-y-3">
              <Textarea 
                placeholder="Ghi chú về học viên (tiến độ, mục tiêu TOEIC, điểm yếu...)" 
                rows={3} 
                value={noteText} 
                onChange={(e) => setNoteText(e.target.value)} 
                className="font-medium rounded-xl resize-none"
              />
              <Button 
                size="sm" 
                onClick={() => addNoteMutation.mutate()} 
                disabled={!noteText.trim() || addNoteMutation.isPending}
                className="btn-3d-green font-black rounded-xl active:scale-95 duration-120"
              >
                Lưu ghi chú
              </Button>
            </div>
            <div className="space-y-2">
              {notes.map((n: any) => (
                <div key={n.id} className="bg-card rounded-2xl border border-border/70 p-4 shadow-soft-xs">
                  <p className="text-sm text-foreground font-medium">{n.content}</p>
                  <p className="text-xs text-muted-foreground mt-2 font-semibold">📅 {n.created_at ? new Date(n.created_at).toLocaleDateString("vi-VN") : ""}</p>
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
