import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthProfile {
  full_name: string | null;
  avatar_url: string | null;
  is_pro?: boolean | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isPro: boolean;
  profile: AuthProfile | null;
  refreshUserData: () => Promise<void>;
  signOut: () => Promise<void>;
}

const LAST_ACTIVE_KEY = "lenglish_last_active";
const CACHED_PROFILE_KEY = "lenglish_cached_profile";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày không vào -> yêu cầu đăng nhập lại

// Helper đọc profile cache nhanh để chống giật/mất avatar khi reload
const getCachedProfile = (): AuthProfile | null => {
  try {
    const raw = localStorage.getItem(CACHED_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
};

// Helper kiểm tra quá hạn 7 ngày không hoạt động
const checkInactivityExpiration = async (onExpired: () => void): Promise<boolean> => {
  try {
    const lastActiveStr = localStorage.getItem(LAST_ACTIVE_KEY);
    if (!lastActiveStr) {
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
      return false;
    }
    const lastActive = Number(lastActiveStr);
    if (isNaN(lastActive)) {
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
      return false;
    }
    const elapsed = Date.now() - lastActive;
    if (elapsed > SEVEN_DAYS_MS) {
      console.warn(`[Auth] Phiên đăng nhập hết hạn sau ${Math.round(elapsed / (1000 * 60 * 60 * 24))} ngày không truy cập.`);
      localStorage.removeItem(LAST_ACTIVE_KEY);
      localStorage.removeItem(CACHED_PROFILE_KEY);
      onExpired();
      await supabase.auth.signOut().catch(() => {});
      return true;
    }
  } catch (err) {
    console.error("[Auth] Lỗi kiểm tra thời gian không hoạt động:", err);
  }
  return false;
};

// Helper cập nhật mốc hoạt động mới nhất
const recordUserActivity = () => {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch {
    // ignore
  }
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  isPro: false,
  profile: null,
  refreshUserData: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [profile, setProfile] = useState<AuthProfile | null>(getCachedProfile);

  const lastActiveTimestampRef = useRef<number>(Date.now());

  const fetchUserData = async (userId: string, currentUser?: User) => {
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, avatar_url, is_pro")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle(),
      ]);

      const userMeta = currentUser?.user_metadata || {};
      const fallbackAvatar = userMeta.avatar_url || userMeta.picture || null;
      const fallbackFullName = userMeta.full_name || userMeta.name || currentUser?.email?.split("@")[0] || null;

      // 1. Xử lý Profile: Tuyệt đối không xóa trắng avatar_url nếu gặp lỗi mạng/401
      if (profileRes.data) {
        const resolvedProfile: AuthProfile = {
          full_name: profileRes.data.full_name || fallbackFullName,
          avatar_url: profileRes.data.avatar_url || fallbackAvatar,
          is_pro: !!profileRes.data.is_pro,
        };

        setProfile((prev) => {
          const merged: AuthProfile = {
            full_name: resolvedProfile.full_name || prev?.full_name || null,
            avatar_url: resolvedProfile.avatar_url || prev?.avatar_url || fallbackAvatar || null,
            is_pro: resolvedProfile.is_pro ?? prev?.is_pro ?? false,
          };
          try {
            localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      } else if (!profileRes.error) {
        // Chỉ dùng mặc định nếu không có lỗi truy vấn (hàng profile chưa khởi tạo)
        const newProfile: AuthProfile = {
          full_name: fallbackFullName,
          avatar_url: fallbackAvatar,
          is_pro: false,
        };
        setProfile((prev) => {
          const merged = prev || newProfile;
          try {
            localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      } else {
        // Có lỗi mạng / 401: giữ nguyên dữ liệu avatar & profile hiện tại, không gán null!
        console.warn("[Auth] Không thể tải profile từ DB, giữ nguyên cache/avatar hiện tại:", profileRes.error.message);
      }

      // 2. Xử lý Role Admin & Pro: Không hạ quyền nếu query gặp lỗi tạm thời
      if (!roleRes.error) {
        const admin = !!roleRes.data;
        setIsAdmin(admin);
        setIsPro((prevPro) => admin || !!profileRes.data?.is_pro || prevPro);
      } else {
        console.warn("[Auth] Không thể tải vai trò người dùng, giữ quyền hiện tại:", roleRes.error.message);
      }
    } catch (err) {
      console.error("[Auth] Lỗi khi lấy dữ liệu người dùng:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (user?.id) {
      await fetchUserData(user.id, user);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const handleClearSession = () => {
      if (!isMounted) return;
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      setIsPro(false);
      setLoading(false);
    };

    // 1. Kiểm tra chính sách 1 tuần không hoạt động ngay khi mở app
    checkInactivityExpiration(handleClearSession).then((expired) => {
      if (expired || !isMounted) return;
      recordUserActivity();
    });

    // 2. Lắng nghe thay đổi trạng thái đăng nhập
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT") {
        handleClearSession();
        localStorage.removeItem(CACHED_PROFILE_KEY);
        return;
      }

      if (currentSession?.user) {
        recordUserActivity();
        setSession(currentSession);
        setUser(currentSession.user);
        // Tránh deadlock trong Supabase client
        setTimeout(() => {
          if (isMounted) fetchUserData(currentSession.user.id, currentSession.user);
        }, 0);
      } else if (event === "INITIAL_SESSION" && !currentSession) {
        setLoading(false);
      }
    });

    // 3. Kiểm tra session hiện có
    supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
      if (!isMounted) return;

      if (error) {
        console.warn("[Auth] getSession warning:", error.message);
      }

      if (currentSession?.user) {
        recordUserActivity();
        setSession(currentSession);
        setUser(currentSession.user);
        fetchUserData(currentSession.user.id, currentSession.user);
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      if (!isMounted) return;
      console.warn("[Auth] getSession failed:", err);
      setLoading(false);
    });

    // 4. Theo dõi tương tác người dùng (throttled 60s) để duy trì mốc 1 tuần không bị đăng xuất
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActiveTimestampRef.current > 60000) {
        lastActiveTimestampRef.current = now;
        recordUserActivity();
      }
    };

    // 5. Khi người dùng quay lại tab (focus / visibilitychange) -> chủ động làm mới token nếu sắp hết hạn
    const handleFocusOrVisible = async () => {
      if (document.visibilityState === "hidden") return;

      // Kiểm tra xem đã quá 7 ngày không vào chưa
      const expired = await checkInactivityExpiration(handleClearSession);
      if (expired) return;

      recordUserActivity();
      lastActiveTimestampRef.current = Date.now();

      // Kiểm tra và tự động refresh token nếu còn dưới 5 phút hoặc đã hết hạn
      try {
        const { data: { session: curSession } } = await supabase.auth.getSession();
        if (curSession) {
          const expiresAt = curSession.expires_at ? curSession.expires_at * 1000 : 0;
          if (expiresAt && expiresAt - Date.now() < 5 * 60 * 1000) {
            console.log("[Auth] Chủ động làm mới session sắp hết hạn khi mở lại tab...");
            await supabase.auth.refreshSession();
          }
        }
      } catch (err) {
        console.warn("[Auth] Lỗi chủ động làm mới session:", err);
      }
    };

    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));
    window.addEventListener("focus", handleFocusOrVisible);
    document.addEventListener("visibilitychange", handleFocusOrVisible);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleActivity));
      window.removeEventListener("focus", handleFocusOrVisible);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
    };
  }, []);

  const signOut = async () => {
    try {
      localStorage.removeItem(LAST_ACTIVE_KEY);
      localStorage.removeItem(CACHED_PROFILE_KEY);
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[Auth] Error signing out:", err);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      setIsPro(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isPro, profile, refreshUserData, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

