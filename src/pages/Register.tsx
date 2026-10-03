import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { signInWithGoogle } from "@/lib/googleOAuth";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { Loader2, ArrowLeft } from "lucide-react";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
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
      toast({ title: "Đăng ký không thành công", description: getFriendlyErrorMessage(error), variant: "destructive" });
    } else {
      if (data.session) {
        try {
          await supabase.from("profiles").upsert(
            {
              user_id: data.user!.id,
              full_name: fullName,
            },
            { onConflict: "user_id" }
          );
        } catch (err) {
          console.error("Profile creation error (might already exist):", err);
        }
        
        toast({ title: "Đăng ký thành công!", description: "Chào mừng bạn đến với L-English!" });
        navigate("/profile", { replace: true });
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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050914] text-slate-100 p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none" />

      {/* Ambient background light orbs matching homepage */}
      <div className="absolute -top-28 -right-28 w-[450px] h-[450px] rounded-full bg-cyan-500/15 blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-28 -left-28 w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />

      {/* Back to Home Link */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#081226]/80 hover:bg-[#0e1d3b] border border-cyan-500/30 text-xs font-semibold text-cyan-300 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all active:scale-95"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Trang chủ</span>
      </Link>

      {/* Central Glassmorphism Card */}
      <div className="w-full max-w-[440px] rounded-[28px] bg-[#070e1c]/85 backdrop-blur-2xl border border-cyan-500/25 p-7 sm:p-9 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(6,182,212,0.08)] relative z-10">
        {/* Subtle top edge neon glow highlight */}
        <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[11px] font-semibold tracking-wider uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            L-English Academy
          </div>
          <h1 className="text-2xl sm:text-[28px] font-display font-extrabold text-white tracking-tight leading-snug">
            Tạo Tài Khoản Mới
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
            Bắt đầu lộ trình bứt phá điểm TOEIC cùng AI
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="fullName"
              className="text-xs font-semibold text-slate-300"
            >
              Họ và tên
            </Label>
            <input
              id="fullName"
              type="text"
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              className="w-full h-11 px-4 rounded-xl bg-[#030712]/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-semibold text-slate-300"
            >
              Email
            </Label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full h-11 px-4 rounded-xl bg-[#030712]/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-xs font-semibold text-slate-300"
            >
              Mật khẩu (Tối thiểu 6 ký tự)
            </Label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full h-11 px-4 rounded-xl bg-[#030712]/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
            />
          </div>

          {/* Primary Gradient Register Button */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>{loading ? "Đang tạo tài khoản..." : "ĐĂNG KÝ HỌC NGAY"}</span>
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 text-center relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-800" />
          </div>
          <span className="relative bg-[#070e1c] px-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            HOẶC ĐĂNG KÝ VỚI
          </span>
        </div>

        {/* Social Register Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full h-10 px-4 rounded-xl bg-[#0b1426]/70 hover:bg-[#101e38] border border-slate-800 hover:border-cyan-500/30 text-xs sm:text-sm font-semibold text-slate-200 flex items-center justify-center gap-2.5 shadow-sm transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          <span>{googleLoading ? "Đang kết nối Google..." : "Đăng ký với Google"}</span>
        </button>

        {/* Switch to Login */}
        <div className="text-center mt-6 pt-4 border-t border-slate-800/80">
          <p className="text-xs text-slate-400">
            Đã có tài khoản?{" "}
            <Link
              to="/login"
              className="text-cyan-400 font-bold hover:text-cyan-300 hover:underline"
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
