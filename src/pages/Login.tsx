import { Label } from "@/components/ui/label";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { signInWithGoogle } from "@/lib/googleOAuth";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { Loader2, ArrowLeft } from "lucide-react";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  const fromState = (location.state as any)?.from;
  let rawFrom: string | null = null;
  if (typeof fromState === "string") {
    rawFrom = fromState;
  } else if (fromState && typeof fromState === "object") {
    rawFrom = `${fromState.pathname || ""}${fromState.search || ""}${fromState.hash || ""}` || null;
  }

  // Sanitize internal redirect to prevent open redirect vulnerabilities
  const getSafeRedirect = (url: unknown): string | null => {
    if (!url || typeof url !== "string") return null;
    if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\") || url.includes("://")) {
      return null;
    }
    const pathname = url.split("?")[0].split("#")[0];
    const blockedPrefixes = ["/login", "/register", "/forgot-password", "/reset-password", "/auth"];
    if (blockedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))) {
      return null;
    }
    return url;
  };

  const safeFrom = getSafeRedirect(rawFrom);

  const getDestination = (targetUrl: string | null, userIsAdmin: boolean) => {
    if (targetUrl) {
      if (targetUrl.startsWith("/admin")) {
        return userIsAdmin ? targetUrl : "/profile";
      }
      return targetUrl;
    }
    return userIsAdmin ? "/admin/dashboard" : "/profile";
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const destination = getDestination(safeFrom, isAdmin);
      navigate(destination, { replace: true });
    }
  }, [user, isAdmin, navigate, safeFrom]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 450);
      toast({ title: "Đăng nhập không thành công", description: getFriendlyErrorMessage(error), variant: "destructive" });
    } else {
      toast({ title: "Đăng nhập thành công!", description: "Chào mừng bạn quay lại L-English." });
      const destination = getDestination(safeFrom, isAdmin);
      navigate(destination, { replace: true });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      if (safeFrom) {
        sessionStorage.setItem("lenglish_post_login_redirect", safeFrom);
      } else {
        sessionStorage.removeItem("lenglish_post_login_redirect");
      }
      setGoogleLoading(true);
      const { error } = await signInWithGoogle();
      if (error) {
        setShakeError(true);
        setTimeout(() => setShakeError(false), 450);
        toast({ title: "Đăng nhập Google thất bại", description: getFriendlyErrorMessage(error), variant: "destructive" });
        setGoogleLoading(false);
      }
    } catch {
      setGoogleLoading(false);
    }
  };

  const handleUpcomingSocial = (provider: string) => {
    toast({
      title: `Đăng nhập với ${provider}`,
      description: `Đăng nhập qua ${provider} đang được chuẩn bị. Vui lòng sử dụng Google hoặc Email.`,
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F6F7FA] dark:bg-[#0B0F19] p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Film grain noise texture */}
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.2] pointer-events-none z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Ambient background light orbs matching the screenshot */}
      <div className="absolute -bottom-20 -left-20 w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-blue-600/40 via-indigo-500/35 to-purple-600/25 blur-[120px] pointer-events-none" />
      <div className="absolute top-10 right-0 md:right-10 w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-pink-400/35 via-rose-300/25 to-purple-400/20 blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/40 dark:bg-transparent blur-[140px] pointer-events-none" />

      {/* Back to Home Link */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/60 dark:bg-slate-900/60 hover:bg-white/90 border border-white/80 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 backdrop-blur-md shadow-soft-xs transition-all active:scale-95"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Trang chủ</span>
      </Link>

      {/* Central Glassmorphism Card */}
      <div
        className={`w-full max-w-[430px] rounded-[34px] bg-white/70 dark:bg-slate-900/75 backdrop-blur-2xl border border-white/85 dark:border-white/10 p-7 sm:p-9 shadow-[0_20px_60px_-15px_rgba(79,70,229,0.12),0_10px_25px_-5px_rgba(0,0,0,0.04)] relative z-10 transition-all ${
          shakeError ? "animate-shake" : ""
        }`}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-[26px] sm:text-[30px] font-extrabold text-[#0B1340] dark:text-white tracking-tight leading-snug">
            Welcome Back
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Sign in to your account to continue
          </p>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Email Address
            </Label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full h-11 px-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-white/80 dark:border-slate-700/80 focus:bg-white/90 dark:focus:bg-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Password
            </Label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full h-11 px-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-white/80 dark:border-slate-700/80 focus:bg-white/90 dark:focus:bg-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] outline-none transition-all"
            />
          </div>

          {/* Primary Midnight Sign In Button */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full h-11 mt-2 rounded-2xl bg-[#0B1340] hover:bg-[#121B54] dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-[#0B1340]/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>{loading ? "Signing in..." : "Sign In"}</span>
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 text-center">
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            OR CONTINUE WITH
          </span>
        </div>

        {/* Social Buttons */}
        <div className="space-y-2.5">
          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full h-10 px-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 hover:bg-white/95 dark:hover:bg-slate-800 border border-white/90 dark:border-slate-700/80 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2.5 shadow-sm transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
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
            <span>{googleLoading ? "Connecting Google..." : "Continue with Google"}</span>
          </button>

          {/* Apple */}
          <button
            type="button"
            onClick={() => handleUpcomingSocial("Apple")}
            className="w-full h-10 px-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 hover:bg-white/95 dark:hover:bg-slate-800 border border-white/90 dark:border-slate-700/80 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2.5 shadow-sm transition-all active:scale-[0.99] cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0 fill-current text-slate-900 dark:text-white" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.67-.82 1.13-1.96.99-3.11-1 .04-2.17.67-2.85 1.48-.6.7-1.01 1.83-1.01 3.01 1.12.09 2.22-.56 2.87-1.38z" />
            </svg>
            <span>Continue with Apple</span>
          </button>

          {/* Meta */}
          <button
            type="button"
            onClick={() => handleUpcomingSocial("Meta")}
            className="w-full h-10 px-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 hover:bg-white/95 dark:hover:bg-slate-800 border border-white/90 dark:border-slate-700/80 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2.5 shadow-sm transition-all active:scale-[0.99] cursor-pointer"
          >
            <div className="w-4 h-4 rounded-full bg-[#1877F2] flex items-center justify-center text-white shrink-0">
              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <span>Continue with Meta</span>
          </button>
        </div>

        {/* Forgot password */}
        <div className="text-center mt-5 pt-1">
          <Link
            to="/forgot-password"
            className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors"
          >
            Forgot your password?
          </Link>
        </div>

        {/* Register prompt */}
        <div className="text-center mt-3 pt-3 border-t border-border/40">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chưa có tài khoản?{" "}
            <Link
              to="/register"
              className="text-[#0B1340] dark:text-indigo-400 font-bold hover:underline"
            >
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

