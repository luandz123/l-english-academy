import StudentLayout from "@/components/StudentLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
        <div className="bg-card rounded-xl border p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">{initials}</div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Đăng ký: {user?.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : ""}</p>
          </div>
        </div>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="progress">Khóa học</TabsTrigger>
            <TabsTrigger value="history">Lịch sử bài thi</TabsTrigger>
            <TabsTrigger value="password">Đổi mật khẩu</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <div className="bg-card rounded-xl border p-6 space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Họ và tên</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled />
              </div>
              <Button onClick={handleUpdateProfile} disabled={saving}>
                {saving ? "Đang lưu..." : "Cập nhật"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="mt-4 space-y-4">
            {enrollments && enrollments.length > 0 ? (
              enrollments.map((e: any) => (
                <div key={e.id} className="bg-card rounded-xl border p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{e.courses?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.expires_at ? `Hết hạn: ${new Date(e.expires_at).toLocaleDateString("vi-VN")}` : "Vĩnh viễn"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Chưa đăng ký khóa học nào.</p>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="bg-card rounded-xl border overflow-hidden">
              {quizResults && quizResults.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-semibold text-foreground">Bài thi</th>
                      <th className="text-center p-3 font-semibold text-foreground">Điểm</th>
                      <th className="text-center p-3 font-semibold text-foreground">Đúng</th>
                      <th className="text-center p-3 font-semibold text-foreground">Ngày</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizResults.map((r: any) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3 text-foreground">{r.quizzes?.title || `Quiz #${r.quiz_id}`}</td>
                        <td className="p-3 text-center font-medium text-primary">{Number(r.score).toFixed(1)}/10</td>
                        <td className="p-3 text-center text-muted-foreground">{r.correct_answers}/{r.total_questions}</td>
                        <td className="p-3 text-center text-muted-foreground">{new Date(r.completed_at).toLocaleDateString("vi-VN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">Chưa có kết quả bài thi.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="password" className="mt-4">
            <div className="bg-card rounded-xl border p-6 space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Mật khẩu mới</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Xác nhận mật khẩu mới</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button onClick={handleChangePassword}>Đổi mật khẩu</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
};

export default Profile;
