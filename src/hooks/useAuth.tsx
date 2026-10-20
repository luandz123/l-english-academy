import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isPro: boolean;
  profile: { full_name: string | null; avatar_url: string | null; is_pro?: boolean | null } | null;
  refreshUserData: () => Promise<void>;
  signOut: () => Promise<void>;
}

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
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null; is_pro?: boolean | null } | null>(null);

  const fetchUserData = async (userId: string, currentUser?: User) => {
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, is_pro").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
      ]);
      
      const admin = !!roleRes.data;
      const pro = admin || !!profileRes.data?.is_pro;

      if (profileRes.data) {
        setProfile(profileRes.data);
      } else if (currentUser?.user_metadata) {
        // Fallback to metadata for newly created users where profile row might not be ready
        setProfile({
          full_name: currentUser.user_metadata.full_name || null,
          avatar_url: null,
          is_pro: false,
        });
      }
      
      setIsAdmin(admin);
      setIsPro(pro);
    } catch (err) {
      console.error("Error fetching user data:", err);
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
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Use setTimeout to avoid Supabase client deadlock
        setTimeout(() => fetchUserData(session.user.id, session.user), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsPro(false);
        setLoading(false);
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn("Stale session detected, clearing session:", error.message);
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setIsPro(false);
        setLoading(false);
      } else if (!session) {
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isPro, profile, refreshUserData, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
