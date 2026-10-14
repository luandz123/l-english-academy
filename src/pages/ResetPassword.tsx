import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { Loader2, ArrowLeft, KeyRound, Eye, EyeOff } from "lucide-react";
import { PasswordStrengthIndicator, analyzePassword } from "@/components/auth/PasswordStrengthIndicator";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Mật khẩu không khớp", description: "Mật khẩu xác nhận phải giống mật khẩu mới.", variant: "destructive" });
      return;
    }
    const analysis = analyzePassword(password);
    if (!analysis.isAcceptable) {
      toast({
        title: "Mật khẩu chưa đạt chuẩn an toàn",
        description: "Mật khẩu mới cần tối thiểu 8 ký tự, bao gồm cả chữ cái và chữ số.",
        variant: "destructive"
      });
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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050914] text-slate-100 p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none" />

      {/* Ambient background light orbs matching homepage */}
      <div className="absolute -top-28 -right-28 w-[450px] h-[450px] rounded-full bg-cyan-500/15 blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-28 -left-28 w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />

      {/* Back to Login Link */}
      <Link
        to="/login"
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#081226]/80 hover:bg-[#0e1d3b] border border-cyan-500/30 text-xs font-semibold text-cyan-300 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all active:scale-95"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Quay lại đăng nhập</span>
      </Link>

      {/* Central Glassmorphism Card */}
      <div className="w-full max-w-[430px] rounded-[28px] bg-[#070e1c]/85 backdrop-blur-2xl border border-cyan-500/25 p-7 sm:p-9 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(6,182,212,0.08)] relative z-10">
        {/* Subtle top edge neon glow highlight */}
        <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[11px] font-semibold tracking-wider uppercase mb-3">
            <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
            Bảo Mật Tài Khoản
          </div>
          <h1 className="text-2xl sm:text-[28px] font-display font-extrabold text-white tracking-tight leading-snug">
            Đặt Lại Mật Khẩu
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
            Thiết lập mật khẩu mới an toàn cho tài khoản của bạn
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-300">
              Mật khẩu mới (Tối thiểu 8 ký tự, gồm chữ & số)
            </Label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full h-11 pl-4 pr-11 rounded-xl bg-[#030712]/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 transition-colors p-1"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrengthIndicator password={password} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-300">
              Xác nhận mật khẩu
            </Label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full h-11 pl-4 pr-11 rounded-xl bg-[#030712]/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 transition-colors p-1"
                aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-11 mt-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70"
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? "Đang lưu mật khẩu..." : "LƯU MẬT KHẨU MỚI"}</span>
          </button>
        </form>

        <div className="pt-4 text-center border-t border-slate-800/80 mt-6">
          <p className="text-xs text-slate-400">
            Quay về{" "}
            <Link to="/login" className="text-cyan-400 font-bold hover:text-cyan-300 hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
