import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trophy, ExternalLink, CheckCircle, Loader2,
  Mail, ArrowRight, KeyRound, Timer,
} from 'lucide-react';
import { sendMagicLink, verifyOtpCode, getCurrentUser, onAuthChange } from '../lib/auth';
import { checkPremiumStatus, STRIPE_CHECKOUT_URL } from '../lib/premium';

const GOLD = '#D4A843';
const GOLD_BG = (opacity: number) => `rgba(212,168,67,${opacity})`;
const GOLD_DARK = '#BF9638';
const COOLDOWN_SECS = 60;

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'menu' | 'email' | 'otp' | 'checking' | 'success' | 'not_found';

export function PremiumModal({ isOpen, onClose, onSuccess }: PremiumModalProps) {
  const [step, setStep] = useState<Step>('menu');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cooldown timer
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const handleAuthError = useCallback((errorStr: string) => {
    if (errorStr.startsWith('COOLDOWN:')) {
      const secs = parseInt(errorStr.split(':')[1], 10) || COOLDOWN_SECS;
      startCooldown(secs);
      setError(`Aguarde ${secs}s antes de reenviar`);
    } else {
      setError(errorStr);
    }
  }, [startCooldown]);

  // Listen for auth state changes (user returning from magic link — if it works)
  useEffect(() => {
    if (!isOpen) return;

    const unsub = onAuthChange(async (user, accessToken) => {
      if (user && (step === 'otp' || step === 'email')) {
        setStep('checking');
        console.log('[PremiumModal] Auth changed, checking premium with direct token...');
        const isPremium = await checkPremiumStatus(accessToken);
        if (isPremium) {
          setStep('success');
          setTimeout(() => {
            onSuccess();
            handleClose();
          }, 1500);
        } else {
          setStep('not_found');
        }
      }
    });

    return unsub;
  }, [isOpen, step]);

  if (!isOpen) return null;

  const reset = () => {
    setStep('menu');
    setEmail('');
    setOtpCode('');
    setError('');
    setLoading(false);
    setCooldown(0);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSendCode = async () => {
    if (!isValidEmail(email)) {
      setError('Digite um e-mail válido');
      return;
    }
    if (cooldown > 0) return;

    setLoading(true);
    setError('');

    const result = await sendMagicLink(email);
    setLoading(false);

    if (result.error) {
      handleAuthError(result.error);
    } else {
      startCooldown(COOLDOWN_SECS);
      setStep('otp');
      setOtpCode('');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    setError('');

    const result = await sendMagicLink(email);
    setLoading(false);

    if (result.error) {
      handleAuthError(result.error);
    } else {
      startCooldown(COOLDOWN_SECS);
      setOtpCode('');
    }
  };

  const handleVerifyCode = async () => {
    if (otpCode.trim().length < 6) {
      setError('Digite o código de 6 dígitos');
      return;
    }
    setLoading(true);
    setError('');

    const result = await verifyOtpCode(email, otpCode);
    setLoading(false);

    if (result.error) {
      handleAuthError(result.error);
    } else {
      // OTP verified successfully — save email and check premium immediately
      const normalizedEmail = email.trim().toLowerCase();
      localStorage.setItem('ps_user_email', normalizedEmail);

      // Go directly to checking step — don't wait for onAuthStateChange
      setStep('checking');
      console.log('[PremiumModal] OTP verified, checking premium for', normalizedEmail);
      const isPrem = await checkPremiumStatus(undefined, normalizedEmail);
      if (isPrem) {
        setStep('success');
        setTimeout(() => { onSuccess(); handleClose(); }, 1500);
      } else {
        setStep('not_found');
      }
    }
  };

  const handleAlreadyLoggedIn = async () => {
    setStep('checking');
    const user = await getCurrentUser();
    if (user) {
      const isPremium = await checkPremiumStatus();
      if (isPremium) {
        setStep('success');
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 1500);
      } else {
        setStep('not_found');
      }
    } else {
      setStep('email');
    }
  };

  const handleStripeCheckout = () => {
    window.open(STRIPE_CHECKOUT_URL, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-popover border border-border rounded-2xl p-6 shadow-2xl">

        {/* ─── SUCCESS ─── */}
        {step === 'success' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <CheckCircle className="w-16 h-16" style={{ color: GOLD }} />
            <p className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>
              Premium Ativado!
            </p>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-body)' }}>Aproveite todas as estatísticas</p>
          </div>
        )}

        {/* ─── MENU INICIAL ─── */}
        {step === 'menu' && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: GOLD_BG(0.2) }}>
                <Trophy className="w-5 h-5" style={{ color: GOLD }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 700 }}>
                  Power Sports Premium
                </h3>
                <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-body)' }}>Municipal de Encantado 2026</p>
              </div>
            </div>

            <p className="text-sm text-secondary-foreground mb-5 leading-relaxed" style={{ fontFamily: 'var(--font-body)', fontWeight: 400 }}>
              Desbloqueie <strong className="text-foreground">artilharia, cartões, estatísticas completas</strong>,
              {' '}comparativos e perfis de jogadores.
            </p>

            {/* Already premium */}
            <button
              onClick={handleAlreadyLoggedIn}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-4 mb-3 transition-colors active:scale-[0.98]"
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = GOLD_BG(0.3))}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: GOLD_BG(0.1) }}>
                <Mail className="w-4 h-4" style={{ color: GOLD }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 700 }}>
                  Já tenho Premium
                </p>
                <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-body)' }}>Entrar com meu e-mail</p>
              </div>
              <ArrowRight className="w-4 h-4 text-subtle" />
            </button>

            {/* Buy premium */}
            <button
              onClick={handleStripeCheckout}
              className="w-full flex items-center gap-3 rounded-xl p-4 mb-4 transition-colors active:scale-[0.98]"
              style={{ backgroundColor: GOLD }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = GOLD_DARK)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GOLD)}
            >
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <ExternalLink className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 700 }}>
                  Comprar Premium — R$19,90
                </p>
                <p className="text-[10px] text-white/70" style={{ fontFamily: 'var(--font-body)' }}>Pagamento único • Todo o campeonato</p>
              </div>
            </button>

            <button
              onClick={handleClose}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Fechar
            </button>
          </>
        )}

        {/* ─── EMAIL INPUT ─── */}
        {step === 'email' && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: GOLD_BG(0.1) }}>
                <Mail className="w-5 h-5" style={{ color: GOLD }} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700 }}>
                  Entrar com e-mail
                </h3>
                <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-body)' }}>Enviaremos um código de acesso</p>
              </div>
            </div>

            <div className="mb-4">
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
              <div className="flex items-center gap-2 mb-3 text-destructive text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleSendCode}
              disabled={loading || !email.trim() || cooldown > 0}
              className="w-full disabled:opacity-40 text-white font-bold rounded-xl py-3 transition-colors flex items-center justify-center gap-2 mb-3"
              style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 600, backgroundColor: GOLD }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : cooldown > 0 ? (
                <>
                  <Timer className="w-4 h-4" />
                  Aguarde {cooldown}s
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Enviar código
                </>
              )}
            </button>

            <button
              onClick={() => { setStep('menu'); setError(''); }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Voltar
            </button>
          </>
        )}

        {/* ─── OTP CODE INPUT ─── */}
        {step === 'otp' && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: GOLD_BG(0.1) }}>
                <KeyRound className="w-5 h-5" style={{ color: GOLD }} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700 }}>
                  Digite o código
                </h3>
                <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-body)' }}>
                  Enviado para <strong className="text-foreground">{email}</strong>
                </p>
              </div>
            </div>

            <div className="mb-4">
              <input
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
                Abra o e-mail e digite o código de 6 dígitos
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
              disabled={loading || otpCode.length < 6}
              className="w-full disabled:opacity-40 text-white font-bold rounded-xl py-3 transition-colors flex items-center justify-center gap-2 mb-3"
              style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 600, backgroundColor: GOLD }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Verificar código
                </>
              )}
            </button>

            <button
              onClick={handleResend}
              disabled={loading || cooldown > 0}
              className="w-full bg-card border border-border text-foreground font-semibold rounded-xl py-3 transition-colors active:scale-[0.98] flex items-center justify-center gap-2 mb-3 disabled:opacity-40"
              style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 600 }}
              onMouseEnter={(e) => { if (cooldown <= 0) e.currentTarget.style.borderColor = GOLD_BG(0.2); }}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
            >
              {loading ? (
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
          </>
        )}

        {/* ─── CHECKING PREMIUM ─── */}
        {step === 'checking' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-body)' }}>Verificando acesso...</p>
          </div>
        )}

        {/* ─── NOT FOUND ─── */}
        {step === 'not_found' && (
          <>
            <div className="flex flex-col items-center py-6 gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: GOLD_BG(0.1), border: `1px solid ${GOLD_BG(0.2)}` }}
              >
                <Trophy className="w-6 h-6" style={{ color: GOLD }} />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700 }}>
                  Premium não encontrado
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                  E-mail verificado: <strong className="text-foreground">{email}</strong>
                  <br />Nenhum pagamento encontrado para este e-mail.
                  <br />Compre agora por apenas <strong style={{ color: GOLD }}>R$ 19,90</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={handleStripeCheckout}
              className="w-full text-white font-bold rounded-xl py-3 transition-colors flex items-center justify-center gap-2 mb-3"
              style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 600, backgroundColor: GOLD }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = GOLD_DARK)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GOLD)}
            >
              <ExternalLink className="w-4 h-4" />
              Comprar Premium — R$19,90
            </button>

            <p className="text-[10px] text-muted-foreground text-center mb-3" style={{ fontFamily: 'var(--font-body)' }}>
              Após o pagamento, volte aqui e entre com seu e-mail.
            </p>

            <button
              onClick={async () => {
                setStep('checking');
                // Pass email explicitly for the fallback endpoint
                const isPremium = await checkPremiumStatus(undefined, email.trim().toLowerCase());
                if (isPremium) {
                  setStep('success');
                  setTimeout(() => {
                    onSuccess();
                    handleClose();
                  }, 1500);
                } else {
                  setStep('not_found');
                }
              }}
              className="w-full text-center text-xs text-primary hover:text-primary/80 transition-colors py-2 mb-2 font-semibold"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Já paguei? Verificar novamente
            </button>

            <button
              onClick={reset}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Fechar
            </button>
          </>
        )}
      </div>
    </div>
  );
}