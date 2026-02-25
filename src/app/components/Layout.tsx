import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { Home, BarChart3, Users, Lock, Trophy, User, Mail, CheckCircle, X, AlertCircle } from 'lucide-react';
import { isPremium, checkPremiumStatus } from '../lib/premium';
import { getCurrentUser, onAuthChange, type UserProfile } from '../lib/auth';
import PowerLogo from './PowerLogo';
import SponsorLogos from './SponsorLogos';

const NAV_ITEMS = [
  { path: '/', label: 'Jogos', icon: Home },
  { path: '/classificacao', label: 'Tabela', icon: BarChart3 },
  { path: '/times', label: 'Times', icon: Users },
  { path: '/premium', label: 'Premium', icon: Trophy, premium: true },
];

const MAIN_PATHS = ['/', '/classificacao', '/times', '/premium'];

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [premium, setPremium] = useState(isPremium());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stripeSuccess, setStripeSuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
    setPremium(isPremium());
  }, [location.pathname]);

  // Detect ?success=true from Stripe redirect AND clean auth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Stripe success
    if (params.get('success') === 'true') {
      setStripeSuccess(true);
    }

    // Auth error from Supabase redirect (e.g. expired/invalid magic link)
    const errorParam = params.get('error');
    const errorDesc = params.get('error_description');
    if (errorParam) {
      console.error('[Auth Callback] Error from Supabase redirect:', errorParam, errorDesc);
      const friendlyMsg = errorDesc
        ? errorDesc.replace(/\+/g, ' ')
        : 'Link expirado ou inválido. Solicite um novo.';
      setAuthError(friendlyMsg);
    }

    // Clean ALL auth/stripe params from URL to keep it tidy
    const paramsToClean = ['success', 'code', 'error', 'error_description', 'error_code'];
    const url = new URL(window.location.href);
    let needsClean = false;
    for (const p of paramsToClean) {
      if (url.searchParams.has(p)) {
        url.searchParams.delete(p);
        needsClean = true;
      }
    }
    // Also clean hash fragment if it contains access_token (implicit flow fallback)
    if (url.hash && url.hash.includes('access_token')) {
      url.hash = '';
      needsClean = true;
    }
    if (needsClean) {
      window.history.replaceState({}, '', url.pathname + (url.search || '') + (url.hash || ''));
    }
  }, []);

  // Global auth state listener — handles magic link return on any page
  useEffect(() => {
    const unsub = onAuthChange(async (u, accessToken) => {
      if (u) {
        setUser(u);
        console.log('[Layout] Auth changed, checking premium with direct token...');
        const isPrem = await checkPremiumStatus(accessToken);
        setPremium(isPrem);
      } else {
        setUser(null);
        setPremium(false);
      }
    });
    return unsub;
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const showFooter =
    MAIN_PATHS.includes(location.pathname) && location.pathname !== '/';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Auth Error Banner */}
      {authError && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="max-w-lg mx-auto px-4 pt-2">
            <div className="bg-card border border-destructive/30 rounded-xl p-4 shadow-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  Erro no login
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {authError}
                </p>
              </div>
              <button
                onClick={() => setAuthError(null)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Success Banner */}
      {stripeSuccess && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="max-w-lg mx-auto px-4 pt-2">
            <div className="bg-card border border-green-500/30 rounded-xl p-4 shadow-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  Pagamento confirmado!
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Enviamos um link de acesso para seu e-mail. Verifique sua caixa de entrada.
                </p>
              </div>
              <button
                onClick={() => setStripeSuccess(false)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex flex-col items-start gap-0">
            <PowerLogo width={150} />
          </button>
          <div className="flex items-center gap-2">
            {premium && (
              <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide" style={{ backgroundColor: 'rgba(212,168,67,0.2)', color: '#D4A843' }}>
                PRO
              </span>
            )}
            <button
              onClick={() => navigate('/conta')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                user
                  ? 'bg-primary/15 text-primary'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {user ? (
                <Mail className="w-3.5 h-3.5" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pt-[64px] pb-[72px]">
        <div className="max-w-lg mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Footer - only show on main pages (except home which has its own) */}
      {showFooter && (
        <div className="max-w-lg mx-auto px-4 pb-20">
          <div className="border-t border-border pt-4 pb-2">
            <p className="text-[9px] text-subtle text-center uppercase tracking-wider mb-3"
              style={{ fontFamily: 'var(--font-heading)' }}>
              Apoio e Patrocínio
            </p>
            <div className="flex justify-center mb-3">
              <SponsorLogos width={180} />
            </div>
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              <strong className="text-foreground">Power Sports</strong> — Arena Força do Vale | Jornal Força do Vale
            </p>
            <div className="flex items-center justify-center gap-3 mt-2">
              <button
                onClick={() => navigate('/sobre')}
                className="text-[10px] text-subtle hover:text-foreground transition-colors"
              >
                Sobre
              </button>
              <span className="text-[10px] text-faint">·</span>
              <button
                onClick={() => navigate('/termos')}
                className="text-[10px] text-subtle hover:text-foreground transition-colors"
              >
                Termos de Uso
              </button>
              <span className="text-[10px] text-faint">·</span>
              <button
                onClick={() => navigate('/privacidade')}
                className="text-[10px] text-subtle hover:text-foreground transition-colors"
              >
                Privacidade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border">
        <div className="max-w-lg mx-auto flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                  active
                    ? item.premium ? 'text-[#D4A843]' : 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.premium && !premium && (
                    <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1.5" style={{ color: '#D4A843' }} />
                  )}
                </div>
                <span className="text-[10px] font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}