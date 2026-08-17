import {
  useEffect,
  useState,
  useCallback,
} from "react";

import type {
  User,
  Session,
} from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/types";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const INITIAL_STATE: AuthState = {
  user: null,
  session: null,
  profile: null,
  loading: true,
  refreshProfile:
    async () => {},
};

export function useAuth(): AuthState {
  const [
    state,
    setState,
  ] =
    useState<AuthState>(
      INITIAL_STATE
    );

  // ------------------------------------------------------------
  // Load public RENFLIX profile
  // ------------------------------------------------------------

  const loadProfile =
    useCallback(
      async (
        userId: string
      ): Promise<
        Profile | null
      > => {
        if (!userId) {
          return null;
        }

        try {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                "profiles"
              )
              .select("*")
              .eq(
                "id",
                userId
              )
              .maybeSingle();

          // ----------------------------------------------------
          // Profile doesn't exist yet.
          //
          // This is valid immediately after signup.
          // ----------------------------------------------------

          if (
            !error &&
            !data
          ) {
            return null;
          }

          if (error) {
            /*
             * PGRST116 is normally "no rows returned" for
             * .single(). We use maybeSingle(), so it normally
             * won't occur, but keeping the check makes this
             * helper defensive.
             */
            if (
              error.code ===
              "PGRST116"
            ) {
              return null;
            }

            /*
             * PGRST205 means PostgREST cannot find the table.
             *
             * Don't sign the user out just because the database
             * schema hasn't been applied.
             */
            if (
              error.code ===
              "PGRST205"
            ) {
              console.error(
                "RENFLIX profiles table is unavailable:",
                error
              );

              return null;
            }

            console.error(
              "RENFLIX profile load error:",
              error
            );

            return null;
          }

          return (
            data as Profile
          );
        } catch (error) {
          console.error(
            "Unexpected RENFLIX profile error:",
            error
          );

          return null;
        }
      },
      []
    );

  // ------------------------------------------------------------
  // Refresh current auth + profile
  // ------------------------------------------------------------

  const refreshProfile =
    useCallback(
      async () => {
        try {
          const {
            data: {
              session,
            },
          } =
            await supabase.auth.getSession();

          // ----------------------------------------------------
          // Logged out
          // ----------------------------------------------------

          if (
            !session?.user
          ) {
            setState(
              (current) => ({
                ...current,
                user: null,
                session: null,
                profile: null,
                loading: false,
              })
            );

            return;
          }

          // ----------------------------------------------------
          // Get latest Auth user.
          //
          // Important after:
          // - changing email
          // - changing phone
          // - changing password
          // ----------------------------------------------------

          const {
            data: {
              user,
            },
          } =
            await supabase.auth.getUser();

          const activeUser =
            user ||
            session.user;

          const profile =
            await loadProfile(
              activeUser.id
            );

          setState(
            (current) => ({
              ...current,
              user: activeUser,
              session,
              profile,
              loading: false,
            })
          );
        } catch (error) {
          console.error(
            "RENFLIX refreshProfile error:",
            error
          );

          setState(
            (current) => ({
              ...current,
              loading: false,
            })
          );
        }
      },
      [loadProfile]
    );

  // ------------------------------------------------------------
  // Initialize authentication
  // ------------------------------------------------------------

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const {
          data: {
            session,
          },
        } =
          await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        // ------------------------------------------------------
        // No current session
        // ------------------------------------------------------

        if (
          !session?.user
        ) {
          setState(
            (current) => ({
              ...current,
              user: null,
              session: null,
              profile: null,
              loading: false,
            })
          );

          return;
        }

        // ------------------------------------------------------
        // We have a session.
        // Load the matching RENFLIX profile.
        // ------------------------------------------------------

        setState(
          (current) => ({
            ...current,
            user:
              session.user,
            session,
            loading: true,
          })
        );

        const profile =
          await loadProfile(
            session.user.id
          );

        if (!mounted) {
          return;
        }

        setState(
          (current) => ({
            ...current,
            user:
              session.user,
            session,
            profile,
            loading: false,
          })
        );
      } catch (error) {
        console.error(
          "RENFLIX auth initialization error:",
          error
        );

        if (!mounted) {
          return;
        }

        setState(
          (current) => ({
            ...current,
            user: null,
            session: null,
            profile: null,
            loading: false,
          })
        );
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [
    loadProfile,
  ]);

  // ------------------------------------------------------------
  // Auth state listener
  // ------------------------------------------------------------
  //
  // IMPORTANT:
  // Keep this callback synchronous.
  //
  // We don't perform another Supabase request directly inside
  // onAuthStateChange().
  //
  // This avoids re-entrancy problems during SIGNED_IN,
  // TOKEN_REFRESHED and USER_UPDATED.
  // ------------------------------------------------------------

  useEffect(() => {
    let mounted = true;

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          if (!mounted) {
            return;
          }

          // ----------------------------------------------------
          // Signed out
          // ----------------------------------------------------

          if (
            event ===
            "SIGNED_OUT"
          ) {
            setState(
              (current) => ({
                ...current,
                user: null,
                session: null,
                profile: null,
                loading: false,
              })
            );

            return;
          }

          // ----------------------------------------------------
          // No session
          // ----------------------------------------------------

          if (!session?.user) {
            setState(
              (current) => ({
                ...current,
                user: null,
                session: null,
                profile: null,
                loading: false,
              })
            );

            return;
          }

          // ----------------------------------------------------
          // Update the Auth state immediately.
          //
          // Profile loading happens outside the callback.
          // ----------------------------------------------------

          setState(
            (current) => ({
              ...current,
              user:
                session.user,
              session,
              loading: true,
            })
          );

          /*
           * Defer profile loading until after the Auth callback
           * returns.
           *
           * This is especially important for USER_UPDATED after
           * email/phone changes.
           */
          window.setTimeout(
            async () => {
              if (!mounted) {
                return;
              }

              const profile =
                await loadProfile(
                  session.user.id
                );

              if (!mounted) {
                return;
              }

              setState(
                (current) => ({
                  ...current,
                  user:
                    session.user,
                  session,
                  profile,
                  loading: false,
                })
              );
            },
            0
          );
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [
    loadProfile,
  ]);

  // ------------------------------------------------------------
  // Return auth state
  // ------------------------------------------------------------

  return {
    user:
      state.user,

    session:
      state.session,

    profile:
      state.profile,

    loading:
      state.loading,

    refreshProfile,
  };
}