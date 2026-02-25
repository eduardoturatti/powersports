import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper: get authenticated user from access token
async function getAuthUser(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  if (!token) return null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// Helper: normalize email to lowercase trimmed
function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// ─── Health check ───
app.get("/make-server-5f8f5c8c/health", (c) => {
  return c.json({ status: "ok" });
});

// ─── Signup (email/password — legacy, kept for compatibility) ───
app.post("/make-server-5f8f5c8c/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "E-mail e senha são obrigatórios" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || '' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      console.log(`[Signup] Error creating user ${email}: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    console.log(`[Signup] User created successfully: ${data.user?.id}`);
    return c.json({ user: { id: data.user?.id, email: data.user?.email } });
  } catch (err) {
    console.log(`[Signup] Exception during signup: ${err}`);
    return c.json({ error: "Erro interno ao criar conta" }, 500);
  }
});

// ─── Premium Status Check ───
// Authenticated user checks if they have an active premium subscription
app.get("/make-server-5f8f5c8c/api/premium/status", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization') || null);
    if (!user) {
      console.log('[Premium] No authenticated user found');
      return c.json({ is_premium: false, error: 'Not authenticated' }, 200);
    }

    const email = user.email ? normalizeEmail(user.email) : null;
    if (!email) {
      console.log(`[Premium] User ${user.id} has no email`);
      return c.json({ is_premium: false }, 200);
    }

    console.log(`[Premium] Checking premium status for email: "${email}", user_id: ${user.id}`);

    // Check KV store for subscriber data by email
    const subKey = `sub_email_${email}`;
    const raw = await kv.get(subKey);

    console.log(`[Premium] KV lookup key="${subKey}", found=${!!raw}`);

    if (raw) {
      try {
        const sub = JSON.parse(raw as string);
        console.log(`[Premium] KV data: is_active=${sub.is_active}, valid_until=${sub.valid_until}, email=${sub.email}`);
        // Check if subscription is active and not expired
        if (sub.is_active && new Date(sub.valid_until) > new Date()) {
          console.log(`[Premium] ✓ Active subscription (KV) for ${email}, valid until ${sub.valid_until}`);
          return c.json({
            is_premium: true,
            valid_until: sub.valid_until,
            plan: sub.plan || 'premium',
            checked_email: email,
          }, 200);
        } else {
          console.log(`[Premium] KV subscription found but inactive or expired: is_active=${sub.is_active}, valid_until=${sub.valid_until}, now=${new Date().toISOString()}`);
        }
      } catch (parseErr) {
        console.log(`[Premium] KV parse error: ${parseErr}, raw value: ${String(raw).substring(0, 200)}`);
      }
    }

    // ─── Fallback: Check Stripe API directly ───
    // If webhook failed or user is not in KV, verify with Stripe
    try {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeKey) {
        // Initialize Stripe with fetch client for Deno compatibility
        const stripe = new Stripe(stripeKey, { 
          apiVersion: '2023-10-16', 
          httpClient: Stripe.createFetchHttpClient() 
        });
        
        console.log(`[Premium] Stripe fallback: searching for email "${email}"`);

        // Method 1: Search checkout sessions directly by customer_email
        let foundSession = null;
        try {
          const sessions = await stripe.checkout.sessions.list({
            customer_email: email,
            status: 'complete',
            limit: 5,
          });
          console.log(`[Premium] Stripe sessions by customer_email: found ${sessions.data.length}`);
          
          for (const s of sessions.data) {
            if (s.payment_status === 'paid') {
              foundSession = s;
              console.log(`[Premium] ✓ Found paid session: ${s.id}, payment_status=${s.payment_status}`);
              break;
            }
          }
        } catch (sessErr) {
          console.log(`[Premium] Stripe sessions search error: ${sessErr}`);
        }

        // Method 2: Search by customer object if Method 1 didn't find anything
        if (!foundSession) {
          try {
            const customers = await stripe.customers.list({
              email: email,
              limit: 3,
            });
            console.log(`[Premium] Stripe customers by email: found ${customers.data.length}`);

            for (const cust of customers.data) {
              const custSessions = await stripe.checkout.sessions.list({
                customer: cust.id,
                status: 'complete',
                limit: 5,
              });
              console.log(`[Premium] Stripe sessions for customer ${cust.id}: found ${custSessions.data.length}`);
              
              for (const s of custSessions.data) {
                if (s.payment_status === 'paid') {
                  foundSession = s;
                  console.log(`[Premium] ✓ Found paid session via customer: ${s.id}`);
                  break;
                }
              }
              if (foundSession) break;
            }
          } catch (custErr) {
            console.log(`[Premium] Stripe customer search error: ${custErr}`);
          }
        }

        // Method 3: List recent paid sessions and match by email in customer_details
        if (!foundSession) {
          try {
            const recentSessions = await stripe.checkout.sessions.list({
              status: 'complete',
              limit: 50,
            });
            console.log(`[Premium] Stripe recent sessions scan: checking ${recentSessions.data.length} sessions`);
            
            for (const s of recentSessions.data) {
              const sessEmail = s.customer_details?.email ? normalizeEmail(s.customer_details.email) : null;
              if (sessEmail === email && s.payment_status === 'paid') {
                foundSession = s;
                console.log(`[Premium] ✓ Found paid session via scan: ${s.id}, customer_details.email=${sessEmail}`);
                break;
              }
            }
          } catch (scanErr) {
            console.log(`[Premium] Stripe session scan error: ${scanErr}`);
          }
        }

        if (foundSession) {
          // Update KV store to cache this result
          const subData = {
            email: email,
            name: foundSession.customer_details?.name || '',
            phone: foundSession.customer_details?.phone || '',
            plan: 'premium',
            valid_until: '2026-05-31T23:59:59Z',
            is_active: true,
            stripe_payment_id: (foundSession.payment_intent as string) || foundSession.id,
            created_at: new Date().toISOString(),
            source: 'stripe_fallback',
          };

          await kv.set(subKey, JSON.stringify(subData));
          console.log(`[Premium] ✓ Saved to KV and activated for ${email}`);

          return c.json({
            is_premium: true,
            valid_until: subData.valid_until,
            plan: subData.plan,
            checked_email: email,
          }, 200);
        }

        console.log(`[Premium] ✗ No paid Stripe session found for ${email}`);
      } else {
        console.log('[Premium] No STRIPE_SECRET_KEY configured, skipping Stripe fallback');
      }
    } catch (stripeErr) {
      console.error(`[Premium] Stripe API check failed: ${stripeErr}`);
    }

    console.log(`[Premium] ✗ No active subscription found for ${email}`);
    return c.json({ is_premium: false, checked_email: email }, 200);
  } catch (err) {
    console.log(`[Premium] Status check error: ${err}`);
    return c.json({ is_premium: false, error: 'Internal error' }, 500);
  }
});

// ─── Premium Activate (Admin / Manual) ───
// Activates premium for an email. Protected by service role key.
app.post("/make-server-5f8f5c8c/api/premium/activate", async (c) => {
  try {
    // Simple auth: check for service role key in X-Admin-Key header
    const adminKey = c.req.header('X-Admin-Key');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!adminKey || adminKey !== serviceKey) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { email, name, phone, valid_until, stripe_payment_id } = body;

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    const normalized = normalizeEmail(email);
    const subKey = `sub_email_${normalized}`;

    // Create/update subscription in KV store
    const subData = {
      email: normalized,
      name: name || '',
      phone: phone || '', // WhatsApp captured from Stripe, stored for reference
      plan: 'premium',
      valid_until: valid_until || '2026-05-31T23:59:59Z',
      is_active: true,
      stripe_payment_id: stripe_payment_id || '',
      created_at: new Date().toISOString(),
    };

    await kv.set(subKey, JSON.stringify(subData));
    console.log(`[Premium] Activated subscription for ${normalized} until ${subData.valid_until}`);

    // Create auth user by email if they don't exist yet
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error: createErr } = await supabase.auth.admin.createUser({
      email: normalized,
      email_confirm: true,
      user_metadata: { name: name || '' },
    });

    if (createErr && !createErr.message.includes('already been registered')) {
      console.log(`[Premium] Note: Could not create auth user for ${normalized}: ${createErr.message}`);
    }

    return c.json({ success: true, email: normalized });
  } catch (err) {
    console.log(`[Premium] Activate error: ${err}`);
    return c.json({ error: 'Internal error' }, 500);
  }
});

// ─── Stripe Webhook (automatic activation after payment) ───
app.post("/make-server-5f8f5c8c/api/stripe/webhook", async (c) => {
  try {
    const body = await c.req.json();

    // TODO: Verify Stripe webhook signature with STRIPE_WEBHOOK_SECRET
    // For now, we process the event directly.

    if (body.type === 'checkout.session.completed') {
      const session = body.data?.object;
      const customerDetails = session?.customer_details || {};
      const customFields = session?.custom_fields || [];

      // Extract email (primary identifier for login)
      const email = customerDetails.email || '';
      let name = customerDetails.name || '';
      let phone = customerDetails.phone || '';

      // Check custom fields for phone/name (WhatsApp captured for reference)
      for (const field of customFields) {
        if (field.key === 'telefone' || field.key === 'phone' || field.key === 'whatsapp') {
          phone = field.text?.value || field.numeric?.value || phone;
        }
        if (field.key === 'nome' || field.key === 'name') {
          name = field.text?.value || name;
        }
      }

      if (!email) {
        console.log('[Stripe Webhook] No email found in checkout session');
        return c.json({ error: 'No email in session' }, 400);
      }

      const normalized = normalizeEmail(email);
      const subKey = `sub_email_${normalized}`;

      const subData = {
        email: normalized,
        name,
        phone, // WhatsApp stored for reference only
        plan: 'premium',
        valid_until: '2026-05-31T23:59:59Z',
        is_active: true,
        stripe_payment_id: session?.payment_intent || session?.id || '',
        created_at: new Date().toISOString(),
      };

      await kv.set(subKey, JSON.stringify(subData));
      console.log(`[Stripe Webhook] Activated premium for ${normalized}`);

      // Create/find auth user by email
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      const { error: createErr } = await supabase.auth.admin.createUser({
        email: normalized,
        email_confirm: true,
        user_metadata: { name },
      });

      if (createErr && !createErr.message.includes('already been registered')) {
        console.log(`[Stripe Webhook] Note: Could not create auth user for ${normalized}: ${createErr.message}`);
      } else {
        console.log(`[Stripe Webhook] Auth user ensured for ${normalized}`);
      }

      return c.json({ success: true });
    }

    return c.json({ received: true });
  } catch (err) {
    console.log(`[Stripe Webhook] Error: ${err}`);
    return c.json({ error: 'Webhook processing error' }, 500);
  }
});

// ─── Premium Verify by Email (no JWT required) ───
// Fallback endpoint: accepts email in POST body, checks KV + Stripe.
// Used when the auth JWT is temporarily unavailable (e.g. right after OTP verification).
// Protected only by the Supabase anon key (standard Authorization header).
app.post("/make-server-5f8f5c8c/api/premium/verify-email", async (c) => {
  try {
    const { email: rawEmail } = await c.req.json();
    if (!rawEmail || typeof rawEmail !== 'string') {
      return c.json({ is_premium: false, error: 'Email is required' }, 400);
    }

    const email = normalizeEmail(rawEmail);
    console.log(`[Premium/VerifyEmail] Checking premium for email: "${email}"`);

    // 1. Check KV store
    const subKey = `sub_email_${email}`;
    const raw = await kv.get(subKey);
    console.log(`[Premium/VerifyEmail] KV key="${subKey}", found=${!!raw}`);

    if (raw) {
      try {
        const sub = JSON.parse(raw as string);
        if (sub.is_active && new Date(sub.valid_until) > new Date()) {
          console.log(`[Premium/VerifyEmail] ✓ Active subscription (KV) for ${email}`);
          return c.json({
            is_premium: true,
            valid_until: sub.valid_until,
            plan: sub.plan || 'premium',
            checked_email: email,
          });
        }
      } catch (parseErr) {
        console.log(`[Premium/VerifyEmail] KV parse error: ${parseErr}`);
      }
    }

    // 2. Check Stripe API
    try {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeKey) {
        const stripe = new Stripe(stripeKey, {
          apiVersion: '2023-10-16',
          httpClient: Stripe.createFetchHttpClient(),
        });

        console.log(`[Premium/VerifyEmail] Stripe search for "${email}"`);

        // Method A: checkout sessions by customer_email
        let foundSession = null;
        try {
          const sessions = await stripe.checkout.sessions.list({
            customer_email: email,
            status: 'complete',
            limit: 5,
          });
          console.log(`[Premium/VerifyEmail] Sessions by customer_email: ${sessions.data.length}`);
          for (const s of sessions.data) {
            if (s.payment_status === 'paid') {
              foundSession = s;
              break;
            }
          }
        } catch (e) {
          console.log(`[Premium/VerifyEmail] Sessions search error: ${e}`);
        }

        // Method B: search by customer
        if (!foundSession) {
          try {
            const customers = await stripe.customers.list({ email, limit: 3 });
            console.log(`[Premium/VerifyEmail] Customers found: ${customers.data.length}`);
            for (const cust of customers.data) {
              const cs = await stripe.checkout.sessions.list({
                customer: cust.id,
                status: 'complete',
                limit: 5,
              });
              for (const s of cs.data) {
                if (s.payment_status === 'paid') { foundSession = s; break; }
              }
              if (foundSession) break;
            }
          } catch (e) {
            console.log(`[Premium/VerifyEmail] Customer search error: ${e}`);
          }
        }

        // Method C: scan recent sessions
        if (!foundSession) {
          try {
            const recent = await stripe.checkout.sessions.list({ status: 'complete', limit: 50 });
            console.log(`[Premium/VerifyEmail] Scanning ${recent.data.length} recent sessions`);
            for (const s of recent.data) {
              const se = s.customer_details?.email ? normalizeEmail(s.customer_details.email) : null;
              if (se === email && s.payment_status === 'paid') {
                foundSession = s;
                break;
              }
            }
          } catch (e) {
            console.log(`[Premium/VerifyEmail] Scan error: ${e}`);
          }
        }

        if (foundSession) {
          const subData = {
            email,
            name: foundSession.customer_details?.name || '',
            phone: foundSession.customer_details?.phone || '',
            plan: 'premium',
            valid_until: '2026-05-31T23:59:59Z',
            is_active: true,
            stripe_payment_id: (foundSession.payment_intent as string) || foundSession.id,
            created_at: new Date().toISOString(),
            source: 'verify_email_fallback',
          };
          await kv.set(subKey, JSON.stringify(subData));
          console.log(`[Premium/VerifyEmail] ✓ Found in Stripe & saved to KV for ${email}`);
          return c.json({
            is_premium: true,
            valid_until: subData.valid_until,
            plan: subData.plan,
            checked_email: email,
          });
        }
      }
    } catch (stripeErr) {
      console.log(`[Premium/VerifyEmail] Stripe error: ${stripeErr}`);
    }

    console.log(`[Premium/VerifyEmail] ✗ No premium found for ${email}`);
    return c.json({ is_premium: false, checked_email: email });
  } catch (err) {
    console.log(`[Premium/VerifyEmail] Error: ${err}`);
    return c.json({ is_premium: false, error: 'Internal error' }, 500);
  }
});

// ─── Discipline Overrides ───
// GET: Fetch all manual discipline overrides
app.get("/make-server-5f8f5c8c/api/discipline", async (c) => {
  try {
    const raw = await kv.get("discipline_overrides");
    const overrides = raw ? JSON.parse(raw as string) : {};
    return c.json({ overrides });
  } catch (err) {
    console.log(`[Discipline] GET error: ${err}`);
    return c.json({ overrides: {} });
  }
});

// POST: Save discipline overrides (teamId -> number)
app.post("/make-server-5f8f5c8c/api/discipline", async (c) => {
  try {
    const { overrides } = await c.req.json();
    if (!overrides || typeof overrides !== 'object') {
      return c.json({ error: 'overrides object is required' }, 400);
    }
    await kv.set("discipline_overrides", JSON.stringify(overrides));
    console.log(`[Discipline] Saved overrides for ${Object.keys(overrides).length} teams`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`[Discipline] POST error: ${err}`);
    return c.json({ error: 'Internal error' }, 500);
  }
});

Deno.serve(app.fetch);