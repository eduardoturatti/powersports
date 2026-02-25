import React from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PageTransition } from '../components/PageTransition';
import PowerLogo from '../components/PowerLogo';
import SponsorLogos from '../components/SponsorLogos';

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs">Voltar</span>
        </button>

        <div className="flex justify-center mb-6">
          <PowerLogo width={200} />
        </div>

        <h1 className="text-xl font-bold text-foreground text-center mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
          Sobre
        </h1>

        <div className="space-y-4 text-sm text-secondary-foreground leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
          <p>
            <strong className="text-foreground">Power Sports</strong> é a plataforma de acompanhamento
            esportivo do <strong className="text-foreground">Jornal Força do Vale</strong>.
          </p>

          <p>
            Placares, classificação e estatísticas do futebol amador do Vale do Taquari.
          </p>

          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Contato
            </p>
            <a
              href="mailto:contato@jornalforcadovale.com.br"
              className="flex items-center gap-2 text-accent-foreground hover:text-primary transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span className="text-sm">contato@jornalforcadovale.com.br</span>
            </a>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-4">
            Uma realização <strong className="text-foreground">Arena Força do Vale | Jornal Força do Vale</strong>
          </p>

          <div className="pt-2">
            <p className="text-[9px] text-subtle text-center uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Apoio e Patrocínio
            </p>
            <div className="flex justify-center">
              <SponsorLogos width={180} />
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
