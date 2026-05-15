import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Lỗi", description: "Mật khẩu xác nhận không khớp.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Lỗi", description: "Mật khẩu phải có ít nhất 6 ký tự.", variant: "destructive" });
      return;
    }

    setLoading(true);
    // User is already authenticated via the recovery link token
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } else {
      await supabase.auth.signOut();
      toast({ title: "Thành công!", description: "Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập lại." });
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-4 relative overflow-hidden">
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

        <div className="card-duo p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold">Mật khẩu mới</Label>
              <Input id="password" type="password" placeholder="Nhập mật khẩu mới" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 rounded-xl border-2 border-[var(--duo-gray)] font-medium focus:border-[var(--duo-blue)] transition-colors" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-bold">Xác nhận mật khẩu</Label>
              <Input id="confirmPassword" type="password" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="h-12 rounded-xl border-2 border-[var(--duo-gray)] font-medium focus:border-[var(--duo-blue)] transition-colors" />
            </div>
            <button type="submit" className="btn-3d btn-3d-primary w-full py-3.5 mt-2" disabled={loading}>
              {loading ? "Đang lưu..." : "LƯU MẬT KHẨU MỚI"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
