import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import { signInWithGoogle } from "@/lib/googleOAuth";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(isAdmin ? "/admin/dashboard" : "/dashboard", { replace: true });
    }
  }, [user, isAdmin, navigate]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });
    
    if (error) {
      setLoading(false);
      toast({ title: "Đăng ký thất bại", description: error.message, variant: "destructive" });
    } else {
      if (data.session) {
        try {
          await supabase.from("profiles").insert({
            user_id: data.user!.id,
            full_name: fullName,
          });
        } catch (err) {
          console.error("Profile creation error (might already exist):", err);
        }
        
        toast({ title: "Đăng ký thành công!", description: "Chào mừng bạn đến với L-English!" });
        navigate("/dashboard", { replace: true });
      } else {
        setLoading(false);
        toast({ 
          title: "Đăng ký thành công!", 
          description: "Vui lòng kiểm tra email của bạn để xác nhận tài khoản trước khi đăng nhập." 
        });
        navigate("/login");
      }
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({ title: "Lỗi đăng nhập Google", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-4 py-8 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-[var(--duo-green)]/10 blur-2xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-40 h-40 rounded-full bg-[var(--duo-purple)]/10 blur-2xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8 flex flex-col items-center">
          <Link to="/" className="mb-4">
            <Logo imgClassName="w-14 h-14" />
          </Link>
          <h1 className="text-2xl font-extrabold text-foreground">Tạo tài khoản mới! 🚀</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Học Tiếng Anh vui như chơi game</p>
        </div>

        <div className="card-duo p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="font-bold">Họ và tên</Label>
              <Input id="fullName" type="text" placeholder="Nguyễn Văn A" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" className="h-12 rounded-xl border-2 border-[var(--duo-gray)] font-medium focus:border-[var(--duo-blue)] transition-colors" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold">Email</Label>
              <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="h-12 rounded-xl border-2 border-[var(--duo-gray)] font-medium focus:border-[var(--duo-blue)] transition-colors" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold">Mật khẩu</Label>
              <Input id="password" type="password" placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" className="h-12 rounded-xl border-2 border-[var(--duo-gray)] font-medium focus:border-[var(--duo-blue)] transition-colors" />
            </div>
            <button type="submit" className="btn-3d btn-3d-primary w-full py-3.5" disabled={loading}>
              {loading ? "Đang xử lý..." : "ĐĂNG KÝ"}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t-2 border-[var(--duo-gray)]" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-muted-foreground font-bold">hoặc</span>
            </div>
          </div>

          <button onClick={handleGoogleLogin} className="btn-3d btn-3d-white w-full py-3 flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Đăng ký với Google
          </button>

          <p className="text-center text-sm text-muted-foreground font-medium pt-4 border-t-2 border-[var(--duo-gray)]">
            Đã có tài khoản?{" "}
            <Link to="/login" className="text-[var(--duo-green)] font-bold hover:underline">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
