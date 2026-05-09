import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

const isLovableHosted = () => window.location.hostname.endsWith(".lovable.app");

export const signInWithGoogle = async () => {
  if (isLovableHosted()) {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
      extraParams: {
        prompt: "select_account",
      },
    });

    if (result.error) {
      return { error: result.error };
    }

    return { error: null };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  return { error };
};