import { useState } from "react";
import { Link } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { Loader2, ArrowLeft, MailCheck } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast({ title: "Không thể gửi yêu cầu", description: getFriendlyErrorMessage(error), variant: "destructive" });
    } else {
      setSent(true);
      toast({ title: "Đã gửi email khôi phục", description: "Vui lòng kiểm tra hộp thư của bạn để lấy liên kết đặt lại mật khẩu." });
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
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Bảo Mật & Khôi Phục
          </div>
          <h1 className="text-2xl sm:text-[28px] font-display font-extrabold text-white tracking-tight leading-snug">
            Quên Mật Khẩu?
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
            Nhập email tài khoản để nhận liên kết đặt lại mật khẩu
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
                Email
              </Label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl bg-[#030712]/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? "Đang gửi email..." : "GỬI LIÊN KẾT KHÔI PHỤC"}</span>
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center mx-auto mb-2 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <MailCheck className="w-8 h-8" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">Kiểm tra hộp thư của bạn</h3>
            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
              Chúng tôi đã gửi liên kết khôi phục mật khẩu đến <strong className="text-cyan-300 font-semibold">{email}</strong>. Vui lòng mở email và nhấn vào liên kết để tiếp tục.
            </p>
          </div>
        )}

        <div className="pt-4 text-center border-t border-slate-800/80 mt-6">
          <p className="text-xs text-slate-400">
            Nhớ mật khẩu rồi?{" "}
            <Link to="/login" className="text-cyan-400 font-bold hover:text-cyan-300 hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
