/**
 * EvidentIS Auth State Management
 * Zustand store for authentication state
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Attorney } from "@evidentis/shared";
import { auth, setTokens, clearTokens, loadTokens, getAccessToken } from "./api";

interface AuthState {
  user: Attorney | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mfaRequired: boolean;
  mfaSessionToken: string | null;
  pendingEmail: string | null;
  pendingPassword: string | null;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  verifyMfa: (code: string) => Promise<boolean>;
  checkAuth: () => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      mfaRequired: false,
      mfaSessionToken: null,
      pendingEmail: null,
      pendingPassword: null,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await auth.login(email, password);

          // Check if MFA is required
          if (response.mfaRequired) {
            set({
              mfaRequired: true,
              mfaSessionToken: response.mfaSessionToken || null,
              pendingEmail: email,
              pendingPassword: password,
              isLoading: false,
            });
            return false;
          }

          // Login successful
          if (response.accessToken) {
            setTokens(response.accessToken, response.refreshToken ?? "");

            // Store trial end date for trial banner
            const trialEndsAt = (response as unknown as Record<string, unknown>).trialEndsAt;
            if (typeof trialEndsAt === "string" && typeof window !== "undefined") {
              localStorage.setItem("evidentis_trial_ends_at", trialEndsAt);
            }

            // Use advocate profile from login response directly to avoid
            // a second round-trip to /auth/me that can fail and undo login.
            const loginProfile = response.advocate ?? response.attorney ?? null;
            const user = loginProfile && loginProfile.id ? loginProfile : await auth.me();

            set({
              user,
              isAuthenticated: true,
              mfaRequired: false,
              mfaSessionToken: null,
              pendingEmail: null,
              pendingPassword: null,
              isLoading: false,
            });
            return true;
          }

          throw new Error("Invalid login response");
        } catch (err) {
          const message = err instanceof Error ? err.message : "Login failed";
          set({ error: message, isLoading: false });
          return false;
        }
      },

      verifyMfa: async (code: string) => {
        const { pendingEmail, pendingPassword } = get();
        if (!pendingEmail || !pendingPassword) {
          set({ error: "MFA session expired", mfaRequired: false });
          return false;
        }

        set({ isLoading: true, error: null });
        try {
          const response = await auth.login(pendingEmail, pendingPassword, code);
          if (!response.accessToken) {
            throw new Error("Invalid MFA code");
          }
          setTokens(response.accessToken, response.refreshToken ?? "");
          const user = await auth.me();
          set({
            user,
            isAuthenticated: true,
            mfaRequired: false,
            mfaSessionToken: null,
            pendingEmail: null,
            pendingPassword: null,
            isLoading: false,
          });
          return true;
        } catch (err) {
          const message = err instanceof Error ? err.message : "MFA verification failed";
          set({ error: message, isLoading: false });
          return false;
        }
      },

      logout: async () => {
        try {
          await auth.logout();
        } finally {
          clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            mfaRequired: false,
            mfaSessionToken: null,
            pendingEmail: null,
            pendingPassword: null,
            error: null,
          });
        }
      },

      checkAuth: async () => {
        loadTokens();
        const tokenAtStart = getAccessToken();
        set({ isLoading: true });
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        try {
          const authCheckTimeoutMs = 5000;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error("Auth check timeout"));
            }, authCheckTimeoutMs);
          });
          const user = await Promise.race([auth.me(), timeoutPromise]);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          // Only clear tokens if they haven't changed since checkAuth started.
          // This prevents a race condition where login() sets new tokens
          // while checkAuth() is still running with a stale/missing token.
          const currentToken = getAccessToken();
          if (currentToken === tokenAtStart) {
            clearTokens();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } finally {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }
      },

      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "evidentis-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist user data, not loading states
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Hook to require authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  // Check auth on mount
  if (typeof window !== "undefined" && !isAuthenticated && !isLoading) {
    checkAuth();
  }

  return { isAuthenticated, isLoading };
}
