import { useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/types";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    refreshProfile: async () => {},
  });

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      // If table doesn't exist yet (PGRST205), profile stays null
      if (error?.code === "PGRST205" || error?.code === "PGRST116") {
        setState((s) => ({ ...s, profile: null, loading: false }));
        return;
      }

      setState((s) => ({ ...s, profile: data ?? null, loading: false }));
    } catch {
      setState((s) => ({ ...s, profile: null, loading: false }));
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((s) => ({
        ...s,
        session,
        user: session?.user ?? null,
        refreshProfile: () => loadProfile(session?.user?.id || ""),
      }));
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setState((s) => ({
          ...s,
          session,
          user: session.user,
          refreshProfile: () => loadProfile(session.user.id),
        }));
        loadProfile(session.user.id);
      } else {
        setState({
          user: null,
          session: null,
          profile: null,
          loading: false,
          refreshProfile: async () => {},
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  return state;
}
