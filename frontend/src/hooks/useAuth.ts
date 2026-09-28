/**
 * Authentication hook — manages Supabase auth state in React.
 *
 * HOW REACT HOOKS WORK FOR AUTH:
 * This custom hook encapsulates all authentication logic in one place.
 * Any component can call useAuth() to get the current user, loading state,
 * and auth functions (sendOTP, verifyOTP, signOut).
 *
 * HOW SUPABASE EMAIL OTP WORKS:
 * 1. User enters their email → we call supabase.auth.signInWithOtp()
 * 2. Supabase sends a 6-digit OTP to the email
 * 3. User enters the OTP → we call supabase.auth.verifyOtp()
 * 4. Supabase verifies the code and creates a session (JWT)
 * 5. The session is automatically stored in the browser
 * 6. All subsequent API calls include this JWT
 *
 * WHY NO REGISTRATION:
 * With OTP auth, there's no separate "registration" step.
 * If the email hasn't been seen before, Supabase creates the user automatically.
 * If the email exists, it just sends a new OTP. Simple.
 */

import { Session, User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isAdmin: false,
  });

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
        isAdmin: false, // Admin status is checked server-side
      });
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
          isAdmin: false,
        });
      }
    );

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  /**
   * Send a one-time password to the user's email.
   * Supabase handles the email delivery — we don't need our own email service.
   */
  const sendOTP = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Don't create a magic link — we only want the OTP code
        shouldCreateUser: true,
      },
    });
    if (error) throw error;
  }, []);

  /**
   * Verify the OTP code entered by the user.
   * If valid, Supabase creates a session and the auth state updates automatically
   * via the onAuthStateChange listener above.
   */
  const verifyOTP = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email', // We're using email OTP (not SMS)
    });
    if (error) throw error;
  }, []);

  /**
   * Sign out — clears the session from the browser.
   * The onAuthStateChange listener will update the auth state to null.
   */
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return {
    ...authState,
    sendOTP,
    verifyOTP,
    signOut,
  };
}
