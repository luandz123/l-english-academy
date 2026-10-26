import { authClient } from "@/lib/api/auth";

export const signInWithGoogle = async () => {
  const { error } = await authClient.signInWithOAuth({
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