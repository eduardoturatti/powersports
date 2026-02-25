# Arena Forca do Vale - Design System Guidelines

> PWA mobile-first para torcedores do Campeonato Municipal de Futebol Amador de Encantado 2026.
> Identidade visual: esportiva, moderna, clean. Inspiracao: FotMob local.

---

## 1. Fontes

| Uso | Fonte | Pesos | CSS Variable |
|-----|-------|-------|-------------|
| Titulos, nomes de times, botoes, labels da nav | Plus Jakarta Sans | 400, 500, 600, 700, 800 | `--font-heading` |
| Corpo de texto, paragrafos, descricoes | Inter | 400, 500, 600 | `--font-body` |
| Placares, numeros, estatisticas, posicoes, minutos | JetBrains Mono | 400, 500, 600, 700 | `--font-mono` |

### Hierarquia tipografica

* `h1`: 1.5rem / 700 / line-height 1.3
* `h2`: 1.25rem / 700 / line-height 1.3
* `h3`: 1.125rem / 600 / line-height 1.4
* `h4`: 1rem / 600 / line-height 1.5
* `button`: 0.875rem / 600 / font-heading
* `label` / `input`: 0.875rem / 500-400
* Micro-text: `text-[10px]` e `text-[9px]` para badges, labels secundarios, rodape

---

## 2. Cores - Light Mode (padrao)

| Token | Hex | Uso |
|-------|-----|-----|
| `--background` | `#f8fafc` | Fundo geral (slate-50) |
| `--foreground` | `#0f172a` | Texto principal (slate-900) |
| `--card` | `#ffffff` | Fundo de cards |
| `--primary` | `#22c55e` | Verde primario (green-500) - cor de marca |
| `--primary-foreground` | `#ffffff` | Texto sobre primary |
| `--secondary` | `#f1f5f9` | Fundo de pills, badges, inputs (slate-100) |
| `--secondary-foreground` | `#334155` | Texto sobre secondary (slate-700) |
| `--muted` | `#e2e8f0` | Fundo de fallback TeamLogo, FormDots vazios (slate-200) |
| `--muted-foreground` | `#64748b` | Texto secundario, metadados (slate-500) |
| `--accent` | `rgba(34, 197, 94, 0.08)` | Fundo de destaque verde sutil |
| `--accent-foreground` | `#16a34a` | Texto verde de destaque (green-600) |
| `--destructive` | `#ef4444` | Vermelho de erro/cartao vermelho |
| `--border` | `#e2e8f0` | Todas as bordas, divisores (slate-200) |
| `--input` | `#e2e8f0` | Borda de inputs |
| `--ring` | `#22c55e` | Focus ring (verde) |
| `--subtle` | `#94a3b8` | Texto ultra-suave - separador ":" no placar, local (slate-400) |
| `--faint` | `#cbd5e1` | Texto mais apagado - patrocinio no footer, icones vazios (slate-300) |

---

## 3. Cores - Dark Mode (via `prefers-color-scheme: dark`)

| Token | Valor | Nota |
|-------|-------|------|
| `--background` | `#0a0f1a` | Fundo escuro profundo (quase preto azulado) |
| `--foreground` | `#f1f5f9` | Texto claro (slate-100) |
| `--card` | `rgba(255,255,255,0.05)` | Glassmorphism - fundo semi-transparente |
| `--secondary` | `rgba(255,255,255,0.08)` | Glass pills/badges |
| `--muted` | `rgba(255,255,255,0.06)` | Glass de elementos inativos |
| `--muted-foreground` | `#94a3b8` | Texto secundario (slate-400) |
| `--border` | `rgba(255,255,255,0.08)` | Bordas semi-transparentes (glass) |
| `--accent` | `rgba(34,197,94,0.12)` | Destaque verde mais forte no dark |
| `--accent-foreground` | `#22c55e` | Verde direto (mais brilhante que no light) |
| `--subtle` | `#475569` | (slate-600) |
| `--faint` | `#334155` | (slate-700) |
| `--popover` | `#111827` | Fundo do modal (gray-900) |

---

## 4. Glassmorphism (Dark Mode)

O efeito glass aparece em 2 elementos fixos:

* **Header**: `bg-background/90 backdrop-blur-xl`
* **Bottom Nav**: `bg-background/95 backdrop-blur-xl`

No dark mode, os cards ja sao naturalmente glass porque `--card: rgba(255,255,255,0.05)` + `border: rgba(255,255,255,0.08)`.

---

## 5. Gradientes

| Onde | Classe/Estilo | Efeito |
|------|---------------|--------|
| LiveMatchCard | `bg-gradient-to-br from-green-500/10 via-transparent to-transparent` | Glow verde sutil |
| Hero background glow | `bg-green-500/8 rounded-full blur-3xl` (posicao absoluta) | Glow circular difuso atras do titulo |
| QuickNav cards | `bg-gradient-to-br from-blue-500/15 to-blue-600/5` / `from-green-500/15` / `from-yellow-500/15` | Gradientes sutis por categoria |
| PremiumPage sections | `bg-gradient-to-r from-green-500/20 to-green-500/5` / `blue` / `yellow` / `purple` | Gradientes horizontais por secao |
| TeamCard (grid) | `linear-gradient(135deg, ${team.color}10, transparent 70%)` | Gradiente diagonal com cor do time a 10% opacidade |
| TeamDetailPage header | `linear-gradient(135deg, ${team.color}40, ${team.color_detail}20, var(--background))` | Header com as 2 cores do time em degrade |
| PremiumGate overlay | `bg-gradient-to-t from-background via-background/80 to-transparent` | Gradiente de bloqueio (fade para branco/preto) |

---

## 6. Cores dos Times

As cores vem do banco de dados, campos `team.color` e `team.color_detail`:

* Usadas em: TeamCard (fundo 10%), TeamDetailPage header (40%+20%), barras de estatisticas
* `team.text_color` esta no type mas nao e muito usado
* Fallback quando sem cor: `#1f2937` (gray-800) ou `#374151` (gray-700)

---

## 7. Bordas e Linhas

| Padrao | Classe | Onde |
|--------|--------|------|
| Borda padrao de card | `border border-border` | Todos os cards, tabelas, inputs |
| Borda hover | `hover:border-primary/20` | Cards clicaveis (20% do verde) |
| Borda live | `border-green-500/40` + `animate-live-border` | Card de jogo ao vivo (pulsa entre 60% e 20%) |
| Divisor entre linhas | `border-b border-border` | Linhas de tabela, itens de lista |
| Divisor de secao (footer) | `border-t border-border` | Footer e secoes do modal |
| Divide utility | `divide-y divide-border` | Lista de elenco no TeamDetail |
| Border radius padrao | `rounded-xl` (0.75rem) | Cards, inputs, botoes principais |
| Border radius maior | `rounded-2xl` | LiveMatchCard, modal |
| Border radius pills | `rounded-full` | Badges, round pills, TeamLogo fallback |
| Border radius menor | `rounded-lg` | Stat cards, items de resultado |

---

## 8. Escala de Cinzas (Slate)

O projeto usa a escala Slate do Tailwind inteira:

| Slate | Hex | Variavel CSS | Uso |
|-------|-----|-------------|-----|
| 50 | `#f8fafc` | `--background` (light) | Fundo |
| 100 | `#f1f5f9` | `--secondary` (light) | Pills, badges |
| 200 | `#e2e8f0` | `--border`, `--muted` | Bordas, muted bg |
| 300 | `#cbd5e1` | `--faint` | Textos ultra-suaves |
| 400 | `#94a3b8` | `--subtle` (light), `--muted-foreground` (dark) | Separadores, meta |
| 500 | `#64748b` | `--muted-foreground` (light) | Texto secundario |
| 600 | `#475569` | `--subtle` (dark) | - |
| 700 | `#334155` | `--secondary-foreground` (light), `--faint` (dark) | - |
| 900 | `#0f172a` | `--foreground` (light) | Texto principal |

---

## 9. Brancos

| Contexto | Valor |
|----------|-------|
| Cards (light) | `#ffffff` puro |
| Cards (dark) | `rgba(255,255,255,0.05)` - 5% white |
| Secondary (dark) | `rgba(255,255,255,0.08)` - 8% white |
| Borders (dark) | `rgba(255,255,255,0.08)` - 8% white |
| Muted bg (dark) | `rgba(255,255,255,0.06)` - 6% white |
| Texto (dark) | `#f1f5f9` (slate-100, quase branco) |
| Primary-foreground | `#ffffff` puro |

---

## 10. Cores Semanticas de Status

| Status | Cor |
|--------|-----|
| Ao Vivo (badge) | `bg-red-500/20 text-red-500` + dot `bg-red-500 animate-live-pulse` |
| Vitoria | `bg-green-500` (badge W), `text-green-600` (SG positivo, gols) |
| Empate | `bg-yellow-500` (badge D) |
| Derrota | `bg-red-500` (badge L), `text-red-500` (SG negativo) |
| Cartao amarelo | `text-yellow-600`, `bg-yellow-500` (dot) |
| Cartao vermelho | `text-red-500`, `bg-red-500` (dot) |
| Classificado (top 4) | `text-primary` (#22c55e) |
| Eliminado (ultimo) | `text-destructive` (#ef4444) |
| Medalhas artilharia | 1o `text-yellow-500`, 2o `text-gray-400`, 3o `text-amber-600` |

---

## 11. Animacoes

| Nome | CSS | Uso |
|------|-----|-----|
| `animate-live-pulse` | `opacity 1->0.5->1` 2s ease infinite | Dot vermelho "ao vivo" |
| `animate-live-border` | `border-color + box-shadow` green-500 60%->20% 2s | Borda pulsante do card ao vivo |
| `animate-spin` | Tailwind padrao | Loading spinner |
| `active:scale-[0.98]` | Press feedback | Cards clicaveis |
| `active:scale-95` | Press feedback | Botoes menores (QuickNav) |
| `transition-colors` | Tailwind padrao | Hover em quase tudo |
| `transition-all` | Tailwind padrao | Cards com hover |

---

## 12. Padroes de Componentes

**TeamLogo fallback:** Circulo `bg-muted` com 2-3 letras uppercase do nome, fonte heading, tamanho proporcional (`fontSize: size * 0.3~0.35`)

**Loading spinner:** `border-2 border-primary border-t-transparent rounded-full animate-spin` (w-8 h-8 ou w-10 h-10)

**Section header:** Icone lucide 4x4 `text-primary` + `h3` text-sm font-bold heading

**Stats pills:** `bg-card rounded-lg px-3 py-1.5 border border-border` com numero mono + label micro

**Round pills:** `rounded-full px-3 py-1.5 text-xs font-semibold` - ativo: `bg-primary text-primary-foreground` / live: `bg-red-500/20 text-red-500`

**Modal (bottom sheet em mobile):** `items-end sm:items-center` + backdrop `bg-black/70 backdrop-blur-sm` + `bg-popover border border-border rounded-2xl p-6 shadow-2xl`

---

## 13. Layout

* **Container:** `max-w-lg mx-auto` (32rem = 512px)
* **Padding horizontal:** `px-4` (16px)
* **Header:** fixo top-0, `py-3`, ~60px de altura
* **Bottom nav:** fixo bottom-0, `py-3`, ~72px
* **Content offset:** `pt-[60px] pb-[72px]`
* **Espacamento vertical entre secoes:** `space-y-5`
* **Gap entre cards em lista:** `space-y-2` ou `space-y-3`
* **Grid de times:** `grid-cols-2 gap-3`
* **Grid QuickNav:** `grid-cols-3 gap-2`

---

## 14. Regras Gerais

* Mobile-first sempre. Desktop e apenas um container centralizado com max-w-lg.
* Usar classes semanticas do Tailwind (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`) em vez de cores hardcoded.
* Nunca hardcodar cores de time. Sempre puxar de `team.color` / `team.color_detail` do banco.
* Datas em pt-BR usando `date-fns` com locale `ptBR`. Formatos: "dd MMM . HH:mm", "dd/MM . HH:mm", "dd 'de' MMMM, yyyy".
* Labels inteligentes: "Hoje", "Amanha", "Ontem" via `isToday`/`isTomorrow`/`isYesterday`.
* Icones: lucide-react, tamanho padrao `w-4 h-4` ou `w-5 h-5`.
* Scrollbar horizontal escondida com `.scrollbar-hide`.
* Polling de 30s para jogos ao vivo.
* Select options adaptam ao tema: `background: var(--popover); color: var(--popover-foreground)`.
