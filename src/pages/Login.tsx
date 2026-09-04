import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import { signInWithGoogle } from "@/lib/googleOAuth";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { Loader2 } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(isAdmin ? "/admin/dashboard" : "/profile", { replace: true });
    }
  }, [user, isAdmin, navigate]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Đăng nhập không thành công", description: getFriendlyErrorMessage(error), variant: "destructive" });
    } else {
      toast({ title: "Đăng nhập thành công!", description: "Chào mừng bạn quay lại L-English." });
      // Auth state change will handle redirect via useAuth
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      const { error } = await signInWithGoogle();
      if (error) {
        toast({ title: "Đăng nhập Google thất bại", description: getFriendlyErrorMessage(error), variant: "destructive" });
        setGoogleLoading(false);
      }
    } catch {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-zinc-950 px-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-[var(--duo-green)]/10 blur-2xl pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-40 h-40 rounded-full bg-[var(--duo-blue)]/10 blur-2xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-20 h-20 rounded-full bg-[var(--duo-yellow)]/15 blur-xl pointer-events-none" />
      
      <div className="w-full max-w-md relative">
        <div className="text-center mb-8 flex flex-col items-center">
          <Link to="/" className="mb-4">
            <Logo imgClassName="w-14 h-14" />
          </Link>
          <h1 className="text-2xl font-extrabold text-foreground">Chào mừng trở lại!</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Đăng nhập để tiếp tục học nhé</p>
        </div>

        <div className="card-duo p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold">Email</Label>
              <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="h-12 rounded-xl border-2 border-[var(--duo-gray)] font-medium focus:border-[var(--duo-blue)] transition-colors" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-bold">Mật khẩu</Label>
                <Link to="/forgot-password" className="text-xs font-bold text-[var(--duo-green)] hover:underline">Quên mật khẩu?</Link>
              </div>
              <Input id="password" type="password" placeholder="Nhập mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="h-12 rounded-xl border-2 border-[var(--duo-gray)] font-medium focus:border-[var(--duo-blue)] transition-colors" />
            </div>
            <button type="submit" className="btn-3d btn-3d-primary w-full py-3.5 flex items-center justify-center gap-2 cursor-pointer" disabled={loading || googleLoading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? "Đang đăng nhập..." : "ĐĂNG NHẬP"}</span>
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t-2 border-[var(--duo-gray)]" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground font-bold">hoặc</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="btn-3d btn-3d-white w-full py-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            )}
            <span>{googleLoading ? "Đang kết nối Google..." : "Đăng nhập với Google"}</span>
          </button>

          <p className="text-center text-sm text-muted-foreground font-medium">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="text-[var(--duo-green)] font-bold hover:underline">Đăng ký</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
