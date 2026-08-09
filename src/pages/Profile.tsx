import StudentLayout from "@/components/StudentLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { User, BookOpen, Trophy, KeyRound, Calendar, Mail, CheckCircle2 } from "lucide-react";

const Profile = () => {
  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Học viên";
  const initials = displayName.charAt(0).toUpperCase();

  const { data: quizResults } = useQuery({
    queryKey: ["profile-quiz-results", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_quiz_results")
        .select("*, quizzes(title)")
        .eq("user_id", user!.id)
        .order("completed_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: enrollments } = useQuery({
    queryKey: ["profile-enrollments", user?.id, isAdmin],
    queryFn: async () => {
      if (!user) return [];
      if (isAdmin) {
        const { data: courses } = await supabase.from("courses").select("*").eq("is_active", true);
        return (courses || []).map(c => ({
          id: `admin-${c.id}`,
          course_id: c.id,
          expires_at: null,
          courses: c
        }));
      }
      const { data } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const handleUpdateProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Đã cập nhật!", description: "Thông tin cá nhân đã được lưu thành công." });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Lỗi", description: "Mật khẩu xác nhận không khớp.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Lỗi", description: "Mật khẩu mới phải có ít nhất 6 ký tự.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Thành công!", description: "Mật khẩu đã được đổi thành công." });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Profile Card Banner */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} className="w-16 h-16 rounded-2xl object-cover border border-border shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shrink-0 shadow-sm">
              {initials}
            </div>
          )}
          <div className="space-y-1 min-w-0 flex-1">
            <h1 className="text-xl font-bold text-foreground truncate">{displayName}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
              <Mail className="w-3.5 h-3.5" /> {user?.email}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Ngày tham gia: {user?.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "—"}
            </p>
          </div>
        </div>

        {/* Profile Navigation Tabs */}
        <Tabs defaultValue="info" className="w-full space-y-4">
          <TabsList className="bg-muted/50 p-1 rounded-xl border border-border inline-flex h-auto flex-wrap">
            <TabsTrigger
              value="info"
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" /> Thông tin cá nhân
            </TabsTrigger>
            <TabsTrigger
              value="courses"
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" /> Khóa học ({enrollments?.length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5" /> Lịch sử bài thi ({quizResults?.length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="password"
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" /> Đổi mật khẩu
            </TabsTrigger>
          </TabsList>

          {/* Tab: Info */}
          <TabsContent value="info" className="mt-4 focus-visible:outline-none">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-lg shadow-sm">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Họ và tên</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10 rounded-lg border-border text-sm"
                  placeholder="Nhập họ và tên..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Địa chỉ Email</Label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="h-10 rounded-lg border-border text-sm bg-muted/60 text-muted-foreground"
                />
                <p className="text-[11px] text-muted-foreground">Email đăng nhập không thể thay đổi.</p>
              </div>
              <button
                onClick={handleUpdateProfile}
                disabled={saving}
                className="btn-3d btn-3d-primary py-2 px-5 text-xs font-semibold"
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </TabsContent>

          {/* Tab: Courses */}
          <TabsContent value="courses" className="mt-4 focus-visible:outline-none space-y-3">
            {enrollments && enrollments.length > 0 ? (
              enrollments.map((e: any) => (
                <div key={e.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between shadow-sm">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-sm text-foreground">{e.courses?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.expires_at ? `Hạn dùng: ${new Date(e.expires_at).toLocaleDateString("vi-VN")}` : "Thời hạn: Vĩnh viễn"}
                    </p>
                  </div>
                  <span className="badge-duo badge-green">
                    <CheckCircle2 className="w-3 h-3" /> Đã kích hoạt
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-border p-8 text-center bg-card">
                <p className="text-xs text-muted-foreground">Bạn chưa đăng ký khóa học nào.</p>
              </div>
            )}
          </TabsContent>

          {/* Tab: History */}
          <TabsContent value="history" className="mt-4 focus-visible:outline-none">
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              {quizResults && quizResults.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                      <th className="text-left p-3 font-semibold">Tên bài thi / bài tập</th>
                      <th className="text-center p-3 font-semibold">Điểm số</th>
                      <th className="text-center p-3 font-semibold">Số câu đúng</th>
                      <th className="text-right p-3 font-semibold">Ngày hoàn thành</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {quizResults.map((r: any) => {
                      const pct = r.total_questions > 0 ? (r.correct_answers / r.total_questions) * 100 : 0;
                      return (
                        <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-medium text-foreground">{r.quizzes?.title || `Quiz #${r.quiz_id}`}</td>
                          <td className="p-3 text-center">
                            <span className={`badge-duo ${pct >= 80 ? 'badge-green' : pct >= 50 ? 'badge-yellow' : 'badge-orange'}`}>
                              {Number(r.score).toFixed(1)}/10
                            </span>
                          </td>
                          <td className="p-3 text-center text-muted-foreground">{r.correct_answers}/{r.total_questions}</td>
                          <td className="p-3 text-right text-muted-foreground">{new Date(r.completed_at).toLocaleDateString("vi-VN")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="p-8 text-center text-xs text-muted-foreground">Chưa có lịch sử làm bài thi nào.</p>
              )}
            </div>
          </TabsContent>

          {/* Tab: Password */}
          <TabsContent value="password" className="mt-4 focus-visible:outline-none">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-lg shadow-sm">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Mật khẩu mới</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10 rounded-lg border-border text-sm"
                  placeholder="Nhập ít nhất 6 ký tự..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Xác nhận mật khẩu mới</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 rounded-lg border-border text-sm"
                  placeholder="Nhập lại mật khẩu mới..."
                />
              </div>
              <button
                onClick={handleChangePassword}
                className="btn-3d btn-3d-primary py-2 px-5 text-xs font-semibold"
              >
                Đổi mật khẩu
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
};

export default Profile;
