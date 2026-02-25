import { projectId, publicAnonKey } from '/utils/supabase/info';
import { getAccessToken } from './auth';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-5f8f5c8c`;

const PREMIUM_CACHE_KEY = 'ps_premium';
const PREMIUM_UNTIL_KEY = 'ps_premium_until';

// Stripe Payment Link — replace with your actual link
// Set via STRIPE_PAYMENT_LINK env var or hardcode here
export const STRIPE_CHECKOUT_URL =
  'https://buy.stripe.com/9B6aEX9Hy8Tt3r5gGCbEA01';

export const WHATSAPP_LINK =
  'https://wa.me/5551999999999?text=Quero%20assinar%20o%20Power%20Sports%20Premium';

/**
 * Sync check — uses localStorage cache.
 * Call checkPremiumStatus() to refresh.
 */
export function isPremium(): boolean {
  const cached = localStorage.getItem(PREMIUM_CACHE_KEY);
  const until = localStorage.getItem(PREMIUM_UNTIL_KEY);
  if (cached !== 'true' || !until) return false;
  return new Date(until) > new Date();
}

/**
 * Async check — calls server and updates cache.
 * Returns true if user is a valid premium subscriber.
 *
 * Strategy:
 *   1. Try authenticated endpoint (JWT) → works when session is ready
 *   2. If 401 (Invalid JWT), fallback to email-based endpoint → always works
 *   3. If no token at all but email is known, go straight to email endpoint
 */
export async function checkPremiumStatus(accessToken?: string, email?: string): Promise<boolean> {
  try {
    const token = accessToken || await getAccessToken();

    // ─── Attempt 1: Authenticated endpoint (JWT) ───
    if (token) {
      console.log('[Premium] Attempt 1: checking with JWT (len=' + token.length + ')');

      try {
        const res = await fetch(`${SERVER_URL}/api/premium/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          console.log('[Premium] JWT endpoint response:', JSON.stringify(data));

          if (data.is_premium && data.valid_until) {
            localStorage.setItem(PREMIUM_CACHE_KEY, 'true');
            localStorage.setItem(PREMIUM_UNTIL_KEY, data.valid_until);
            console.log('[Premium] ✓ Premium active via JWT, cached until', data.valid_until);
            return true;
          }

          // Server responded OK but not premium — check if it actually reached our code
          if (data.checked_email) {
            console.log('[Premium] ✗ Not premium. Server checked email:', data.checked_email);
            clearPremiumCache();
            return false;
          }
        }

        // 401 or other error — fall through to email-based check
        const errText = await res.text().catch(() => '');
        console.warn('[Premium] JWT endpoint failed:', res.status, errText);
      } catch (fetchErr) {
        console.warn('[Premium] JWT endpoint fetch error:', fetchErr);
      }
    } else {
      console.log('[Premium] No JWT token available, skipping authenticated endpoint');
    }

    // ─── Attempt 2: Email-based endpoint (no JWT needed) ───
    // Get email from: parameter > supabase session > localStorage
    let checkEmail = email;

    if (!checkEmail) {
      try {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        checkEmail = session?.user?.email || undefined;
      } catch {
        // ignore
      }
    }

    if (!checkEmail) {
      // Try to get from localStorage (saved during login)
      checkEmail = localStorage.getItem('ps_user_email') || undefined;
    }

    if (!checkEmail) {
      console.log('[Premium] No email available for fallback check');
      clearPremiumCache();
      return false;
    }

    console.log('[Premium] Attempt 2: checking by email "' + checkEmail + '" (no JWT)');

    try {
      const res = await fetch(`${SERVER_URL}/api/premium/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ email: checkEmail }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log('[Premium] Email endpoint response:', JSON.stringify(data));

        if (data.is_premium && data.valid_until) {
          localStorage.setItem(PREMIUM_CACHE_KEY, 'true');
          localStorage.setItem(PREMIUM_UNTIL_KEY, data.valid_until);
          console.log('[Premium] ✓ Premium active via email check, cached until', data.valid_until);
          return true;
        }

        console.log('[Premium] ✗ Not premium via email check. Checked:', data.checked_email);
        clearPremiumCache();
        return false;
      }

      console.error('[Premium] Email endpoint failed:', res.status, await res.text().catch(() => ''));
    } catch (emailErr) {
      console.error('[Premium] Email endpoint fetch error:', emailErr);
    }

    clearPremiumCache();
    return false;
  } catch (err) {
    console.error('[Premium] checkPremiumStatus exception:', err);
    return isPremium(); // fallback to cache
  }
}

/**
 * Clear premium cache (on logout)
 */
export function clearPremiumCache(): void {
  localStorage.removeItem(PREMIUM_CACHE_KEY);
  localStorage.removeItem(PREMIUM_UNTIL_KEY);
}
