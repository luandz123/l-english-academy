import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { Loader2 } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Mật khẩu không khớp", description: "Mật khẩu xác nhận phải giống mật khẩu mới.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Mật khẩu quá ngắn", description: "Vui lòng đặt mật khẩu tối thiểu 6 ký tự để bảo mật tài khoản.", variant: "destructive" });
      return;
    }

    setLoading(true);
    // User is already authenticated via the recovery link token
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Đặt lại mật khẩu thất bại", description: getFriendlyErrorMessage(error), variant: "destructive" });
    } else {
      await supabase.auth.signOut();
      toast({ title: "Thành công!", description: "Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập lại." });
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-[var(--duo-green)]/10 blur-2xl pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-40 h-40 rounded-full bg-[var(--duo-blue)]/10 blur-2xl pointer-events-none" />
      
      <div className="w-full max-w-md relative">
        <div className="text-center mb-8 flex flex-col items-center">
          <Link to="/" className="mb-4">
            <Logo imgClassName="w-14 h-14" />
          </Link>
          <h1 className="text-2xl font-extrabold text-foreground">Đặt lại mật khẩu 🔑</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Nhập mật khẩu mới của bạn</p>
        </div>

        <div className="card-duo p-6 space-y-6 shadow-soft-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Mật khẩu mới</Label>
              <Input id="password" type="password" placeholder="Tối thiểu 6 ký tự" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11 rounded-xl border border-border/80 font-medium focus:border-primary transition-colors text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Xác nhận mật khẩu</Label>
              <Input id="confirmPassword" type="password" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} className="h-11 rounded-xl border border-border/80 font-medium focus:border-primary transition-colors text-base" />
            </div>
            <button type="submit" className="btn-3d btn-3d-primary w-full py-3.5 mt-2 flex items-center justify-center gap-2 active:scale-95 duration-150 font-bold" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? "Đang lưu mật khẩu..." : "LƯU MẬT KHẨU MỚI"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
