import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Trophy, AlertTriangle, Swords, Lock,
  BarChart3, ExternalLink, CheckCircle,
} from 'lucide-react';
import { isPremium, checkPremiumStatus, STRIPE_CHECKOUT_URL } from '../lib/premium';
import { getCurrentUser, type UserProfile } from '../lib/auth';
import { PremiumModal } from '../components/PremiumModal';
import { PageTransition } from '../components/PageTransition';

const GOLD = '#D4A843';
const GOLD_BG = (opacity: number) => `rgba(212,168,67,${opacity})`;
const GOLD_DARK = '#BF9638';

const PREMIUM_SECTIONS = [
  {
    path: '/artilharia',
    label: 'Artilharia',
    desc: 'Ranking dos goleadores do campeonato',
    icon: Trophy,
    color: 'from-green-500/20 to-green-500/5',
  },
  {
    path: '/cartoes',
    label: 'Cartões & Fair Play',
    desc: 'Ranking de cartões e disciplina por time',
    icon: AlertTriangle,
    color: 'from-yellow-500/20 to-yellow-500/5',
  },
  {
    path: '/mano-a-mano',
    label: 'Mano a Mano',
    desc: 'Compare dois times lado a lado',
    icon: Swords,
    color: 'from-purple-500/20 to-purple-500/5',
  },
  {
    path: '/times',
    label: 'Estatísticas',
    desc: 'Stats de time e elenco completo',
    icon: BarChart3,
    color: 'from-blue-500/20 to-blue-500/5',
  },
];

export function PremiumPage() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [premium, setPremium] = useState(isPremium());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const [u, isPrem] = await Promise.all([
        getCurrentUser(),
        checkPremiumStatus(),
      ]);
      setUser(u);
      setPremium(isPrem);
      setLoading(false);
    }
    init();
  }, []);

  const handleClick = (path: string) => {
    if (premium) {
      navigate(path);
    } else {
      setShowModal(true);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Premium user: Feature Hub ───
  if (premium) {
    return (
      <PageTransition>
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: GOLD_BG(0.2) }}>
              <Trophy className="w-5 h-5" style={{ color: GOLD }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 700 }}>
                Premium
              </h2>
              <p className="text-[10px] flex items-center gap-1" style={{ fontFamily: 'var(--font-body)', color: GOLD }}>
                <CheckCircle className="w-3 h-3" /> Acesso completo ativado
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {PREMIUM_SECTIONS.map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.path}
                  onClick={() => navigate(section.path)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-gradient-to-r ${section.color} hover:border-primary/20 transition-all active:scale-[0.98]`}
                >
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 700 }}>
                      {section.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-body)' }}>{section.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </PageTransition>
    );
  }

  // ─── Non-premium: Sales Page ───
  return (
    <PageTransition>
      <div className="px-4 py-4">
        {/* Hero */}
        <div className="text-center mb-8 pt-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: GOLD_BG(0.15), border: `1px solid ${GOLD_BG(0.25)}` }}
          >
            <Trophy className="w-8 h-8" style={{ color: GOLD }} />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.3 }}>
            Power Sports Premium
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto" style={{ fontFamily: 'var(--font-body)', fontWeight: 400 }}>
            Tudo sobre o Municipal de Encantado 2026 na palma da mão.
          </p>
        </div>

        {/* Price */}
        <div className="bg-card rounded-2xl p-5 mb-6 text-center" style={{ border: `1px solid ${GOLD_BG(0.25)}` }}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
            Pagamento único
          </p>
          <div className="flex items-baseline justify-center gap-1 mb-2">
            <span className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>R$</span>
            <span className="text-4xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
              19,90
            </span>
          </div>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-body)', fontWeight: 400 }}>
            Válido por todo o campeonato (fev-mai 2026)
          </p>
        </div>

        {/* Features list */}
        <div className="space-y-3 mb-6">
          {[
            { icon: Trophy, label: 'Artilharia', desc: 'Top goleadores com destaque visual' },
            { icon: AlertTriangle, label: 'Cartões & Fair Play', desc: 'Ranking disciplinar por jogador e time' },
            { icon: Swords, label: 'Mano a Mano', desc: 'Confronto direto entre times' },
            { icon: BarChart3, label: 'Estatísticas completas', desc: 'Stats detalhadas de cada time e jogador' },
          ].map(feat => (
            <div key={feat.label} className="flex items-center gap-3 bg-card rounded-lg border border-border px-4 py-3">
              <feat.icon className="w-4 h-4 shrink-0" style={{ color: GOLD }} />
              <div>
                <p className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 600 }}>
                  {feat.label}
                </p>
                <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-body)' }}>{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="space-y-3">
          <a
            href={STRIPE_CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-white font-bold rounded-xl py-3.5 transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 700, backgroundColor: GOLD }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = GOLD_DARK)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GOLD)}
          >
            <Trophy className="w-4 h-4" />
            Comprar Premium — R$19,90
          </a>

          <button
            onClick={() => setShowModal(true)}
            className="w-full bg-card border border-border text-foreground font-semibold rounded-xl py-3 transition-colors active:scale-[0.98]"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 600 }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = GOLD_BG(0.3))}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
          >
            Já tenho Premium — Entrar
          </button>
        </div>

        <PremiumModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={() => setPremium(true)}
        />
      </div>
    </PageTransition>
  );
}
