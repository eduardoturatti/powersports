import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
}

/**
 * Send a magic link to the user's email via Supabase Auth.
 * The user clicks the link in their email → gets redirected back logged in.
 * No SMS, no OTP code — just a link with a button.
 */
export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
  try {
    // Use the current origin dynamically so the link works in any environment
    // (preview, localhost, production at power.jornalfv.com.br, etc.)
    const redirectTo = typeof window !== 'undefined'
      ? window.location.origin
      : 'https://power.jornalfv.com.br';

    console.log('[Auth] Sending magic link to', email.trim().toLowerCase(), '→ redirect to', redirectTo);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      console.error('[Auth] Magic link send error:', error.message);
      return { error: mapAuthError(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('[Auth] Magic link send exception:', err);
    return { error: 'Erro de conexão. Tente novamente.' };
  }
}

/**
 * Verify a 6-digit OTP code sent to the user's email.
 * This is the fallback when the magic link redirect doesn't work.
 * The code is generated alongside the magic link — same request.
 */
export async function verifyOtpCode(
  email: string,
  token: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    });

    if (error) {
      console.error('[Auth] OTP verify error:', error.message);
      return { error: mapAuthError(error.message) };
    }

    console.log('[Auth] OTP verified successfully for', email);
    return { error: null };
  } catch (err) {
    console.error('[Auth] OTP verify exception:', err);
    return { error: 'Erro de conexão. Tente novamente.' };
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Get current logged-in user from session
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session?.user) return null;

    return {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.user_metadata?.name || '',
    };
  } catch {
    return null;
  }
}

/**
 * Get current access token
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Subscribe to auth state changes (e.g. when user returns from magic link).
 * Returns an unsubscribe function.
 * The callback now also receives the access_token so callers can use it
 * immediately without waiting for getSession() to sync.
 */
export function onAuthChange(callback: (user: UserProfile | null, accessToken?: string) => void): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    console.log('[Auth] onAuthStateChange event:', _event, 'has session:', !!session, 'has token:', !!session?.access_token);
    if (session?.user) {
      callback(
        {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || '',
        },
        session.access_token,
      );
    } else {
      callback(null);
    }
  });

  return () => subscription.unsubscribe();
}

function mapAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail não encontrado';
  if (msg.includes('rate limit')) return 'Muitas tentativas. Aguarde 60 segundos.';
  if (msg.includes('Email not confirmed')) return 'E-mail não confirmado';
  if (msg.includes('Signups not allowed')) return 'Cadastros desabilitados no momento';
  if (msg.includes('For security purposes')) {
    // Extract seconds from message like "...after 26 seconds."
    const match = msg.match(/after (\d+) seconds/);
    const secs = match ? match[1] : '60';
    return `COOLDOWN:${secs}`;
  }
  if (msg.includes('Token has expired')) return 'Código expirado. Solicite um novo.';
  if (msg.includes('otp_expired')) return 'Código expirado. Solicite um novo.';
  if (msg.includes('invalid') && msg.includes('otp')) return 'Código inválido. Verifique e tente novamente.';
  return msg;
}