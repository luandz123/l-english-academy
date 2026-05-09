import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    const handleRedirect = async (userId: string) => {
      toast({
        title: "Đăng nhập thành công!",
        description: "Chào mừng bạn quay lại.",
      });
      
      try {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();

        if (roleData) {
          navigate("/admin/dashboard", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch (err) {
        console.error("Error checking role:", err);
        navigate("/dashboard", { replace: true });
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <p className="text-muted-foreground animate-pulse">Đang xác thực...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
