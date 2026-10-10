import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

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

    const handleRedirect = async (userId: string) => {
      toast({
        title: "Đăng nhập thành công!",
        description: "Chào mừng bạn quay lại.",
      });

      let customRedirect: string | null = null;
      try {
        const raw = sessionStorage.getItem("lenglish_post_login_redirect") || localStorage.getItem("lenglish_auth_redirect");
        sessionStorage.removeItem("lenglish_post_login_redirect");
        localStorage.removeItem("lenglish_auth_redirect");
        if (raw) {
          customRedirect = getSafeRedirect(raw);
        }
      } catch {}
      
      try {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();

        const isAdmin = !!roleData;
        const getDestination = (targetUrl: string | null, userIsAdmin: boolean) => {
          if (targetUrl) {
            if (targetUrl.startsWith("/admin")) {
              return userIsAdmin ? targetUrl : "/profile";
            }
            return targetUrl;
          }
          return userIsAdmin ? "/admin/dashboard" : "/profile";
        };

        navigate(getDestination(customRedirect, isAdmin), { replace: true });
      } catch (err) {
        console.error("Error checking role:", err);
        navigate(customRedirect && !customRedirect.startsWith("/admin") ? customRedirect : "/profile", { replace: true });
      }
    };

    const handleAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const oauthError = params.get("error_description") || hashParams.get("error_description");

      if (oauthError) {
        toast({
          title: "Lỗi đăng nhập Google",
          description: decodeURIComponent(oauthError.replace(/\+/g, " ")),
          variant: "destructive",
        });
        navigate("/login", { replace: true });
        return;
      }

      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (exchangeError) {
          toast({
            title: "Lỗi đăng nhập Google",
            description: exchangeError.message,
            variant: "destructive",
          });
          navigate("/login", { replace: true });
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Auth callback error:", error.message);
        toast({
          title: "Lỗi đăng nhập",
          description: error.message,
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      if (data.session) {
        handleRedirect(data.session.user.id);
      } else {
        // If no session yet, listen for the state change (Supabase might still be processing)
        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === "SIGNED_IN" && session) {
            sub.unsubscribe();
            handleRedirect(session.user.id);
          } else if (event === "INITIAL_SESSION" && !session) {
             // If we've initialized and still no session, maybe it failed
             setTimeout(() => {
               if (!session) {
                 navigate("/login");
                 sub.unsubscribe();
               }
             }, 3000);
          }
        });
        subscription = sub;
      }
    };

    handleAuthCallback();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050914] text-slate-100">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
        <p className="text-slate-400 font-medium animate-pulse text-sm">Đang xác thực thông tin đăng nhập...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
