import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Loader2, CheckCircle, Mail, LogOut, KeyRound, Timer,
} from 'lucide-react';
import { sendMagicLink, verifyOtpCode, getCurrentUser, signOut, onAuthChange, type UserProfile } from '../lib/auth';
import { checkPremiumStatus, clearPremiumCache } from '../lib/premium';
import { PageTransition } from '../components/PageTransition';
import PowerLogo from '../components/PowerLogo';

const COOLDOWN_SECS = 60;

type Step = 'email' | 'sent' | 'profile';

export function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [premium, setPremium] = useState(false);

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Cooldown timer
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const otpInputRef = useRef<HTMLInputElement>(null);

  const startCooldown = useCallback((secs: number) => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldown(secs);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // Handle cooldown errors from auth responses
  const handleAuthError = useCallback((errorStr: string) => {
    if (errorStr.startsWith('COOLDOWN:')) {
      const secs = parseInt(errorStr.split(':')[1], 10) || COOLDOWN_SECS;
      startCooldown(secs);
      setError(`Aguarde ${secs}s antes de reenviar`);
    } else {
      setError(errorStr);
    }
  }, [startCooldown]);

  useEffect(() => {
    async function init() {
      const u = await getCurrentUser();
      if (u) {
        setUser(u);
        setStep('profile');
        const isPrem = await checkPremiumStatus();
        setPremium(isPrem);
      }
      setLoading(false);
    }
    init();
  }, []);

  // Listen for auth state changes (user returning from magic link)
  useEffect(() => {
    const unsub = onAuthChange(async (u, accessToken) => {
      if (u) {
        setUser(u);
        setSuccess('Login realizado!');
        console.log('[LoginPage] Auth changed, checking premium with direct token...');
        const isPrem = await checkPremiumStatus(accessToken);
        setPremium(isPrem);
        setTimeout(() => {
          setStep('profile');
          setSuccess('');
        }, 1000);
      }
    });
    return unsub;
  }, []);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Digite um e-mail válido');
      return;
    }
    if (cooldown > 0) return;

    setSubmitting(true);
    setError('');

    const result = await sendMagicLink(email);
    setSubmitting(false);

    if (result.error) {
      handleAuthError(result.error);
    } else {
      startCooldown(COOLDOWN_SECS);
      setStep('sent');
      setOtpCode('');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || submitting) return;
    setSubmitting(true);
    setError('');

    const result = await sendMagicLink(email);
    setSubmitting(false);

    if (result.error) {
      handleAuthError(result.error);
    } else {
      startCooldown(COOLDOWN_SECS);
      setOtpCode('');
      setSuccess('Novo código enviado!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleVerifyCode = async () => {
    if (otpCode.trim().length < 6) {
      setError('Digite o código de 6 dígitos');
      return;
    }
    setSubmitting(true);
    setError('');

    const result = await verifyOtpCode(email, otpCode);
    setSubmitting(false);

    if (result.error) {
      handleAuthError(result.error);
    } else {
      // Save email for premium fallback check
      localStorage.setItem('ps_user_email', email.trim().toLowerCase());
    }
    // Success is handled by onAuthChange listener above
  };

  const handleLogout = async () => {
    await signOut();
    clearPremiumCache();
    setUser(null);
    setPremium(false);
    setStep('email');
    setEmail('');
    setOtpCode('');
    setCooldown(0);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Profile ───
  if (step === 'profile' && user) {
    return (
      <PageTransition>
        <div className="px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs" style={{ fontFamily: 'var(--font-body)' }}>Voltar</span>
          </button>

          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 700 }}>
                {user.name || 'Torcedor'}
              </h2>
              {user.email && (
                <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: 'var(--font-body)', fontWeight: 400 }}>
                  {user.email}
                </p>
              )}
            </div>
          </div>

          {/* Premium status */}
          <div className="bg-card rounded-xl border border-border p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 700 }}>
                  Status Premium
                </p>
                <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: 'var(--font-body)', fontWeight: 400 }}>
                  {premium ? 'Premium ativo ✓' : 'Inativo'}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${premium ? 'bg-green-500' : 'bg-muted'}`} />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 mt-6">
            <button
              onClick={() => navigate('/premium')}
              className="w-full bg-card rounded-xl border border-border p-4 text-left hover:border-primary/20 transition-colors active:scale-[0.98]"
            >
              <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 700 }}>
                {premium ? 'Acessar Premium' : 'Comprar Premium'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                Estatísticas completas do campeonato
              </p>
            </button>

            <button
              onClick={handleLogout}
              className="w-full bg-card rounded-xl border border-destructive/20 p-4 text-left hover:border-destructive/40 transition-colors active:scale-[0.98] flex items-center gap-3"
            >
              <LogOut className="w-4 h-4 text-destructive" />
              <p className="text-sm font-semibold text-destructive" style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 600 }}>
                Sair da conta
              </p>
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  // ─── Email / Sent Flow ───
  return (
    <PageTransition>
      <div className="px-4 py-6 min-h-[70vh] flex flex-col">
        <button
          onClick={() => {
            if (step === 'sent') {
              setStep('email');
              setError('');
              setOtpCode('');
            } else {
              navigate(-1);
            }
          }}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs" style={{ fontFamily: 'var(--font-body)' }}>
            {step === 'sent' ? 'Alterar e-mail' : 'Voltar'}
          </span>
        </button>

        <div className="flex justify-center mb-6">
          <PowerLogo width={180} />
        </div>

        <div className="text-center mb-8">
          <h1
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3 }}
          >
            {step === 'email' ? 'Entrar com e-mail' : 'Verifique seu e-mail'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5" style={{ fontFamily: 'var(--font-body)', fontWeight: 400 }}>
            {step === 'email'
              ? 'Enviaremos um código de acesso para o seu e-mail'
              : (
                <>
                  Enviamos um código para{' '}
                  <strong className="text-foreground">{email}</strong>
                </>
              )}
          </p>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-accent-foreground rounded-xl px-4 py-3 mb-4">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>{success}</span>
          </div>
        )}

        {/* ─── Email Input ─── */}
        {step === 'email' && (
          <form onSubmit={handleSendLink} className="space-y-4 flex-1">
            <div>
              <label
                className="text-xs text-muted-foreground mb-1.5 block"
                style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '0.75rem' }}
              >
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="seu@email.com"
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground text-sm"
                style={{ fontFamily: 'var(--font-body)' }}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-xs text-destructive flex items-center gap-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !email.trim() || cooldown > 0}
              className="w-full bg-primary hover:bg-green-600 disabled:opacity-40 text-primary-foreground font-bold rounded-xl py-3.5 transition-colors flex items-center justify-center gap-2"
              style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 600 }}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : cooldown > 0 ? (
                <>
                  <Timer className="w-4 h-4" />
                  Aguarde {cooldown}s
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Enviar código de acesso
                </>
              )}
            </button>
          </form>
        )}

        {/* ─── Code Sent — OTP Input ─── */}
        {step === 'sent' && (
          <div className="flex-1 flex flex-col">
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <KeyRound className="w-7 h-7 text-primary" />
              </div>
            </div>

            {/* OTP Code Input */}
            <div className="mb-4">
              <label
                className="text-xs text-muted-foreground mb-1.5 block"
                style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '0.75rem' }}
              >
                Código de verificação
              </label>
              <input
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otpCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtpCode(val);
                  setError('');
                }}
                placeholder="000000"
                className="w-full bg-secondary border border-border rounded-xl px-4 py-4 text-foreground text-center text-2xl tracking-[0.5em] placeholder-muted-foreground"
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground mt-2 text-center leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                Abra o e-mail que enviamos para <strong className="text-foreground">{email}</strong> e digite o código de 6 dígitos.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 mb-3 text-destructive text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleVerifyCode}
              disabled={submitting || otpCode.length < 6}
              className="w-full bg-primary hover:bg-green-600 disabled:opacity-40 text-primary-foreground font-bold rounded-xl py-3.5 transition-colors flex items-center justify-center gap-2 mb-3"
              style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 600 }}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Verificar código
                </>
              )}
            </button>

            <div className="bg-secondary/50 rounded-lg px-4 py-3 mb-4">
              <p className="text-[10px] text-muted-foreground text-center leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                Não recebeu? Verifique a caixa de spam ou reenvie abaixo.
              </p>
            </div>

            <button
              onClick={handleResend}
              disabled={submitting || cooldown > 0}
              className="w-full bg-card border border-border text-foreground font-semibold rounded-xl py-3 transition-colors hover:border-primary/20 active:scale-[0.98] flex items-center justify-center gap-2 mb-3 disabled:opacity-40"
              style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 600 }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : cooldown > 0 ? (
                <>
                  <Timer className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Reenviar em {cooldown}s</span>
                </>
              ) : (
                'Reenviar código'
              )}
            </button>

            <button
              onClick={() => { setStep('email'); setError(''); setOtpCode(''); }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Alterar e-mail
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  );
}