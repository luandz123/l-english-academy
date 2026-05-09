import StudentLayout from "@/components/StudentLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const Profile = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "User";
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
    queryKey: ["profile-enrollments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*, courses(title)")
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
      toast({ title: "Đã cập nhật!", description: "Thông tin cá nhân đã được lưu." });
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
      toast({ title: "Thành công!", description: "Mật khẩu đã được đổi." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile header */}
        <div className="card-duo p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--duo-green)] flex items-center justify-center text-2xl font-extrabold text-white shadow-[0_4px_0_var(--duo-green-dark)]">{initials}</div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground font-medium">{user?.email}</p>
            <p className="text-xs text-muted-foreground font-bold mt-0.5">📅 Đăng ký: {user?.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : ""}</p>
          </div>
        </div>

        <Tabs defaultValue="info">
          <TabsList className="bg-transparent p-0 h-auto gap-2 flex-wrap">
            <TabsTrigger value="info" className="data-[state=active]:bg-[var(--duo-green)] data-[state=active]:text-white data-[state=active]:shadow-[0_3px_0_var(--duo-green-dark)] px-4 py-2 rounded-xl font-bold text-sm border-2 border-[var(--duo-gray)] data-[state=active]:border-[var(--duo-green)]">
              Thông tin
            </TabsTrigger>
            <TabsTrigger value="progress" className="data-[state=active]:bg-[var(--duo-blue)] data-[state=active]:text-white data-[state=active]:shadow-[0_3px_0_var(--duo-blue-dark)] px-4 py-2 rounded-xl font-bold text-sm border-2 border-[var(--duo-gray)] data-[state=active]:border-[var(--duo-blue)]">
              Khóa học
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-[var(--duo-yellow)] data-[state=active]:text-white data-[state=active]:shadow-[0_3px_0_var(--duo-yellow-dark)] px-4 py-2 rounded-xl font-bold text-sm border-2 border-[var(--duo-gray)] data-[state=active]:border-[var(--duo-yellow)]">
              Lịch sử bài thi
            </TabsTrigger>
            <TabsTrigger value="password" className="data-[state=active]:bg-[var(--duo-purple)] data-[state=active]:text-white data-[state=active]:shadow-[0_3px_0_var(--duo-purple-dark)] px-4 py-2 rounded-xl font-bold text-sm border-2 border-[var(--duo-gray)] data-[state=active]:border-[var(--duo-purple)]">
              Đổi mật khẩu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <div className="card-duo p-6 space-y-4 max-w-md">
              <div className="space-y-2">
                <Label className="font-bold">Họ và tên</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 rounded-xl border-2 border-[var(--duo-gray)] font-medium" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Email</Label>
                <Input value={user?.email || ""} disabled className="h-12 rounded-xl border-2 border-[var(--duo-gray)] font-medium bg-muted" />
              </div>
              <button onClick={handleUpdateProfile} disabled={saving} className="btn-3d btn-3d-green py-2.5 px-6 text-sm">
                {saving ? "Đang lưu..." : "Cập nhật"}
              </button>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="mt-4 space-y-4">
            {enrollments && enrollments.length > 0 ? (
              enrollments.map((e: any) => (
                <div key={e.id} className="card-duo p-4 flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-foreground">{e.courses?.title}</p>
                    <p className="text-xs text-muted-foreground font-bold mt-0.5">
                      {e.expires_at ? `📅 Hết hạn: ${new Date(e.expires_at).toLocaleDateString("vi-VN")}` : "♾️ Vĩnh viễn"}
                    </p>
                  </div>
                  <span className="badge-duo badge-green">Đã đăng ký</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground font-medium">Chưa đăng ký khóa học nào.</p>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="card-duo overflow-hidden">
              {quizResults && quizResults.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-[var(--duo-gray)] bg-muted/50">
                      <th className="text-left p-3 font-extrabold text-foreground">Bài thi</th>
                      <th className="text-center p-3 font-extrabold text-foreground">Điểm</th>
                      <th className="text-center p-3 font-extrabold text-foreground">Đúng</th>
                      <th className="text-center p-3 font-extrabold text-foreground">Ngày</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizResults.map((r: any) => {
                      const pct = r.total_questions > 0 ? (r.correct_answers / r.total_questions) * 100 : 0;
                      return (
                        <tr key={r.id} className="border-b-2 border-[var(--duo-gray)] last:border-0 hover:bg-muted/30">
                          <td className="p-3 text-foreground font-bold">{r.quizzes?.title || `Quiz #${r.quiz_id}`}</td>
                          <td className="p-3 text-center"><span className={`badge-duo ${pct >= 80 ? 'badge-green' : pct >= 50 ? 'badge-yellow' : 'badge-orange'}`}>{Number(r.score).toFixed(1)}/10</span></td>
                          <td className="p-3 text-center text-muted-foreground font-bold">{r.correct_answers}/{r.total_questions}</td>
                          <td className="p-3 text-center text-muted-foreground font-bold">{new Date(r.completed_at).toLocaleDateString("vi-VN")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground font-medium">Chưa có kết quả bài thi.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="password" className="mt-4">
            <div className="card-duo p-6 space-y-4 max-w-md">
              <div className="space-y-2">
                <Label className="font-bold">Mật khẩu mới</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-12 rounded-xl border-2 border-[var(--duo-gray)] font-medium" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Xác nhận mật khẩu mới</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 rounded-xl border-2 border-[var(--duo-gray)] font-medium" />
              </div>
              <button onClick={handleChangePassword} className="btn-3d btn-3d-green py-2.5 px-6 text-sm">
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
