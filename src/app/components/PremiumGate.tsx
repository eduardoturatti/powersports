import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { isPremium, checkPremiumStatus } from '../lib/premium';
import { PremiumModal } from './PremiumModal';

const GOLD = '#D4A843';
const GOLD_BG = (opacity: number) => `rgba(212,168,67,${opacity})`;
const GOLD_DARK = '#BF9638';

interface PremiumGateProps {
  children: React.ReactNode;
  label?: string;
  inline?: boolean;
}

export function PremiumGate({ children, label = 'Conteúdo Premium', inline = false }: PremiumGateProps) {
  const [showModal, setShowModal] = useState(false);
  const [unlocked, setUnlocked] = useState(isPremium());

  useEffect(() => {
    // Refresh premium status on mount
    checkPremiumStatus().then((isPrem) => {
      if (isPrem !== unlocked) setUnlocked(isPrem);
    });
  }, []);

  if (unlocked) return <>{children}</>;

  if (inline) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Trophy className="w-3 h-3" style={{ color: GOLD }} />
          <span>{label}</span>
        </button>
        <PremiumModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={() => setUnlocked(true)}
        />
      </>
    );
  }

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="relative cursor-pointer group rounded-xl border border-border bg-card p-6 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />
        <div className="relative z-20 flex flex-col items-center justify-center py-6 gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: GOLD_BG(0.1), border: `1px solid ${GOLD_BG(0.2)}` }}
          >
            <Trophy className="w-5 h-5" style={{ color: GOLD }} />
          </div>
          <p className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            {label}
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Compre o Premium para desbloquear
          </p>
        </div>
      </div>
      <PremiumModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => setUnlocked(true)}
      />
    </>
  );
}

export function PremiumPageGate({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = useState(false);
  const [unlocked, setUnlocked] = useState(isPremium());

  useEffect(() => {
    checkPremiumStatus().then((isPrem) => {
      if (isPrem !== unlocked) setUnlocked(isPrem);
    });
  }, []);

  if (unlocked) return <>{children}</>;

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-5">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ backgroundColor: GOLD_BG(0.1), border: `1px solid ${GOLD_BG(0.2)}` }}
        >
          <Trophy className="w-8 h-8" style={{ color: GOLD }} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            Conteúdo Premium
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            Esta seção requer acesso premium. Desbloqueie estatísticas completas, artilharia, perfis de jogadores e muito mais.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-white font-bold rounded-xl px-8 py-3 transition-colors"
          style={{ fontFamily: 'var(--font-heading)', backgroundColor: GOLD }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = GOLD_DARK)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GOLD)}
        >
          Desbloquear Premium
        </button>
        <p className="text-xs text-muted-foreground">
          Por apenas <strong style={{ color: GOLD }}>R$ 19,90</strong> por todo o campeonato
        </p>
      </div>
      <PremiumModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => setUnlocked(true)}
      />
    </>
  );
}
