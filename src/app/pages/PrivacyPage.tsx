import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PageTransition } from '../components/PageTransition';

export function PrivacyPage() {
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

        <h1 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          Política de Privacidade
        </h1>
        <p className="text-[10px] text-muted-foreground mb-6" style={{ fontFamily: 'var(--font-mono)' }}>
          Última atualização: 19 de fevereiro de 2026
        </p>

        <div className="space-y-5 text-sm text-secondary-foreground leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
          <section>
            <h2 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Responsável
            </h2>
            <p>
              BBT ASSESSORIA DE COMUNICAÇÃO LTDA
              <br />
              <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                CNPJ: 90.070.459/0001-54
              </span>
              <br />
              Rua Padre Anchieta, 1584/203 — Encantado, RS
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Dados Coletados
            </h2>
            <p>
              Usuários premium: nome, e-mail e telefone (WhatsApp, para contato). Dados de pagamento são processados por terceiro
              e não são acessados ou armazenados por nós. Usuários gratuitos: nenhum dado pessoal.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Finalidade
            </h2>
            <p>
              Fornecer acesso ao serviço contratado e prevenir uso indevido.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Compartilhamento
            </h2>
            <p>
              Não vendemos nem comercializamos dados pessoais. Dados são compartilhados exclusivamente
              com o processador de pagamentos e quando exigido por determinação legal.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Segurança
            </h2>
            <p>
              Utilizamos criptografia em trânsito e autenticação segura.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Direitos (LGPD)
            </h2>
            <p>
              Acesso, correção ou exclusão de dados pessoais podem ser solicitados por e-mail.
              Atendimento em até 15 dias úteis.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Contato
            </h2>
            <p>
              <a
                href="mailto:contato@jornalforcadovale.com.br"
                className="text-accent-foreground hover:text-primary transition-colors"
              >
                contato@jornalforcadovale.com.br
              </a>
            </p>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}