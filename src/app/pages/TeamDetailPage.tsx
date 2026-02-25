import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Calendar, MapPin, Shield, AlertTriangle, Users, Lock, BarChart3 } from 'lucide-react';
import {
  fetchTeams, fetchTeamBySlug, fetchTeamById, fetchPlayersByTeam,
  fetchMatches, fetchAllEvents,
  type Team, type Player, type Match, type MatchEvent, COMPETITION_ID,
} from '../lib/supabase';
import { PremiumGate } from '../components/PremiumGate';
import { isPremium } from '../lib/premium';
import { PremiumModal } from '../components/PremiumModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { PageTransition } from '../components/PageTransition';

function TeamLogo({ url, name, size = 48 }: { url?: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!url || err) {
    return (
      <div className="rounded-full bg-muted flex items-center justify-center text-foreground font-bold"
        style={{ width: size, height: size, fontFamily: 'var(--font-heading)', fontSize: size * 0.3 }}>
        {name.slice(0, 3)}
      </div>
    );
  }
  return <img src={url} alt={name} onError={() => setErr(true)} className="object-contain" style={{ width: size, height: size }} />;
}

const POSITION_ORDER: Record<string, number> = {
  'Goleiro': 0, 'Zagueiro': 1, 'Lateral': 2, 'Meio-Campo': 3, 'Meia': 3, 'Atacante': 4,
};

const POSITION_LABELS: Record<string, string> = {
  'Goleiro': 'GOL', 'Zagueiro': 'ZAG', 'Lateral': 'LAT',
  'Meio-Campo': 'MEI', 'Meia': 'MEI', 'Atacante': 'ATA',
};

export function TeamDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumUnlocked, setPremiumUnlocked] = useState(isPremium());

  useEffect(() => {
    async function load() {
      if (!slug) return;
      let t = await fetchTeamBySlug(slug);
      if (!t) t = await fetchTeamById(slug);
      if (!t) { setLoading(false); return; }

      setTeam(t);
      const [pl, ma, ev] = await Promise.all([
        fetchPlayersByTeam(t.id),
        fetchMatches(),
        fetchAllEvents(),
      ]);
      setPlayers(pl);
      setMatches(ma.filter(m => m.home_team_id === t!.id || m.away_team_id === t!.id));
      setEvents(ev.filter(e => e.team_id === t!.id));
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-muted-foreground">Time não encontrado</p>
        <button onClick={() => navigate('/times')} className="text-primary text-sm mt-3">Voltar</button>
      </div>
    );
  }

  const finishedMatches = matches.filter(m => m.status === 'finished').sort(
    (a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
  );
  const lastMatches = finishedMatches.slice(0, 3);
  const nextMatch = matches
    .filter(m => m.status === 'scheduled')
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())[0];

  const sortedPlayers = [...players].sort((a, b) => {
    const pa = POSITION_ORDER[a.position] ?? 5;
    const pb = POSITION_ORDER[b.position] ?? 5;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });

  // Stats from events (fallback)
  const computedGoals = events.filter(e => e.event_type === 'goal').length;
  const computedGoalsAgainst = (() => {
    let count = 0;
    finishedMatches.forEach(m => {
      if (m.home_team_id === team.id) count += (m.score_away || 0);
      else count += (m.score_home || 0);
    });
    return count;
  })();
  const yellowCards = events.filter(e => e.event_type === 'yellow_card').length;
  const redCards = events.filter(e => e.event_type === 'red_card').length;

  const totalGoals = team.total_goals_scored ?? computedGoals;
  const goalsAgainst = team.total_goals_conceded ?? computedGoalsAgainst;
  const totalYellows = team.total_yellow_cards ?? yellowCards;
  const totalReds = team.total_red_cards ?? redCards;

  const disciplineScore = team.discipline_points ?? (totalYellows * 10 + totalReds * 50);

  const suspendedPlayers = players.filter(p => p.is_suspended);
  const penduradoPlayers = players.filter(p => !p.is_suspended && (p.yellow_card_accumulator ?? 0) >= 2);

  // Player stats for premium table
  const playerStats = players.map(p => {
    const pEvents = events.filter(e => e.player_id === p.id);
    const goals = pEvents.filter(e => e.event_type === 'goal').length;
    const assists = events.filter(e => e.event_type === 'goal' && (e.detail as any)?.assist_player_id === p.id).length;
    const yellows = pEvents.filter(e => e.event_type === 'yellow_card').length;
    const reds = pEvents.filter(e => e.event_type === 'red_card').length;
    return { player: p, goals, assists, yellows, reds };
  });

  return (
    <PageTransition>
    <div className="pb-6">
      {/* Header */}
      <div
        className="relative px-4 pt-4 pb-6"
        style={{
          background: `linear-gradient(135deg, ${team.color || '#1f2937'}40, ${team.color_detail || team.color || '#1f2937'}20, var(--background))`,
        }}
      >
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <div className="flex items-center gap-4">
          <TeamLogo url={team.logo_url} name={team.short_name} size={72} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
              {team.name}
            </h1>
            {team.coach && (
              <p className="text-sm text-muted-foreground mt-1">Técnico: {team.coach}</p>
            )}
            {team.stadium && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {team.stadium}
              </p>
            )}
          </div>
        </div>

        {(team.founded_year || team.colors_description || team.city) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {team.founded_year && (
              <span className="text-[10px] text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full">
                Fundado em {team.founded_year}
              </span>
            )}
            {team.colors_description && (
              <span className="text-[10px] text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full">
                {team.colors_description}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-4 space-y-5 mt-4">
        {/* ─── ELENCO (FREE) — Foto, nome, posição — SEM número, sem stats ─── */}
        <section>
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
            <Shield className="w-4 h-4 text-primary" /> Elenco
            <span className="text-xs text-muted-foreground font-normal ml-auto">{players.length} jogadores</span>
          </h3>
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            {sortedPlayers.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                {/* Player photo or initial */}
                {p.photo_url ? (
                  <img
                    src={p.photo_url}
                    alt={p.name}
                    className="w-8 h-8 rounded-full object-cover bg-muted"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground"
                    style={{ fontFamily: 'var(--font-heading)' }}>
                    {p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-foreground flex-1 truncate">{p.name}</span>
                <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">
                  {p.position || '-'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Premium CTA buttons ─── */}
        <div className="space-y-2">
          <button
            onClick={() => {
              if (premiumUnlocked) {
                // Scroll to stats section
                document.getElementById('team-stats')?.scrollIntoView({ behavior: 'smooth' });
              } else {
                setShowPremiumModal(true);
              }
            }}
            className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3.5 hover:border-primary/20 transition-all active:scale-[0.98]"
          >
            <BarChart3 className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground flex-1 text-left" style={{ fontFamily: 'var(--font-heading)' }}>
              Estatísticas do Time
            </span>
            {!premiumUnlocked && <Lock className="w-3.5 h-3.5 text-subtle" />}
          </button>

          <button
            onClick={() => {
              if (premiumUnlocked) {
                document.getElementById('squad-stats')?.scrollIntoView({ behavior: 'smooth' });
              } else {
                setShowPremiumModal(true);
              }
            }}
            className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3.5 hover:border-primary/20 transition-all active:scale-[0.98]"
          >
            <Users className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground flex-1 text-left" style={{ fontFamily: 'var(--font-heading)' }}>
              Estatísticas do Elenco
            </span>
            {!premiumUnlocked && <Lock className="w-3.5 h-3.5 text-subtle" />}
          </button>
        </div>

        {/* ─── Últimos Resultados (FREE) ─── */}
        {lastMatches.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Últimos Resultados
            </h3>
            <div className="space-y-2">
              {lastMatches.map((m) => {
                const isHome = m.home_team_id === team.id;
                const opponent = isHome ? m.away_team : m.home_team;
                const teamScore = isHome ? m.score_home : m.score_away;
                const opponentScore = isHome ? m.score_away : m.score_home;
                const result = teamScore! > opponentScore! ? 'V' : teamScore! < opponentScore! ? 'D' : 'E';
                const resultColor = result === 'V' ? 'bg-green-500' : result === 'D' ? 'bg-red-500' : 'bg-yellow-500';

                return (
                  <button
                    key={m.id}
                    onClick={() => navigate(`/jogo/${m.id}`)}
                    className="w-full flex items-center gap-3 bg-card rounded-lg border border-border px-3 py-2.5 hover:bg-muted transition-colors"
                  >
                    <span className={`w-6 h-6 rounded-md ${resultColor} flex items-center justify-center text-[10px] font-bold text-white`}>
                      {result}
                    </span>
                    <span className="text-xs text-muted-foreground">{isHome ? 'vs' : '@'}</span>
                    <span className="text-sm text-foreground flex-1 text-left truncate">{opponent?.short_name || '?'}</span>
                    <span className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                      {teamScore} - {opponentScore}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Próximo Jogo (FREE) ─── */}
        {nextMatch && (
          <section>
            <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Próximo Jogo
            </h3>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground font-semibold">
                  {nextMatch.home_team_id === team.id ? nextMatch.away_team?.short_name : nextMatch.home_team?.short_name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {nextMatch.home_team_id === team.id ? 'Em casa' : 'Fora'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(nextMatch.match_date), "dd/MM \u00b7 HH:mm", { locale: ptBR })}</span>
                </div>
                {nextMatch.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{nextMatch.location}</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ─── PREMIUM: Estatísticas do Time ─── */}
        <div id="team-stats">
          <PremiumGate label="Estatísticas do Time">
            <section>
              <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Estatísticas do Time
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Gols Marcados', value: totalGoals, color: 'text-green-600' },
                  { label: 'Gols Sofridos', value: goalsAgainst, color: 'text-red-500' },
                  { label: 'Cartões Amarelos', value: totalYellows, color: 'text-yellow-600' },
                  { label: 'Cartões Vermelhos', value: totalReds, color: 'text-red-500' },
                  { label: 'Média Gols/Jogo', value: finishedMatches.length > 0 ? (totalGoals / finishedMatches.length).toFixed(1) : '0', color: 'text-blue-600' },
                  { label: 'Jogos', value: finishedMatches.length, color: 'text-foreground' },
                ].map(stat => (
                  <div key={stat.label} className="bg-card rounded-lg border border-border p-3 text-center">
                    <p className={`text-xl font-bold ${stat.color}`} style={{ fontFamily: 'var(--font-mono)' }}>
                      {stat.value}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Discipline bar */}
              <div className="bg-card rounded-lg border border-border p-3 mt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted-foreground font-semibold">Pontos Disciplinares</span>
                  <span className={`text-sm font-bold ${disciplineScore > 1500 ? 'text-red-500' : disciplineScore > 1000 ? 'text-yellow-600' : 'text-foreground'}`}
                    style={{ fontFamily: 'var(--font-mono)' }}>
                    {disciplineScore}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      disciplineScore > 1500 ? 'bg-red-500' : disciplineScore > 1000 ? 'bg-yellow-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min((disciplineScore / 2000) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">
                  CA = 10pts | CV = 50pts | Limite: 2000pts
                </p>
              </div>
            </section>
          </PremiumGate>
        </div>

        {/* ─── PREMIUM: Situação Disciplinar ─── */}
        {(suspendedPlayers.length > 0 || penduradoPlayers.length > 0) && (
          <PremiumGate label="Situação Disciplinar">
            <section>
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                <AlertTriangle className="w-4 h-4 text-yellow-500" /> Situação Disciplinar
              </h3>

              {suspendedPlayers.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] text-red-500 font-semibold uppercase mb-1.5">Suspensos</p>
                  <div className="space-y-1">
                    {suspendedPlayers.map(p => (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/jogador/${p.id}`)}
                        className="w-full flex items-center gap-2 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2 hover:bg-red-500/10 transition-colors"
                      >
                        <span className="text-xs text-foreground flex-1 text-left truncate">{p.name}</span>
                        <span className="text-[8px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded font-bold">SUSPENSO</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {penduradoPlayers.length > 0 && (
                <div>
                  <p className="text-[10px] text-yellow-600 font-semibold uppercase mb-1.5">Pendurados (2 CA)</p>
                  <div className="space-y-1">
                    {penduradoPlayers.map(p => (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/jogador/${p.id}`)}
                        className="w-full flex items-center gap-2 bg-yellow-500/5 border border-yellow-500/15 rounded-lg px-3 py-2 hover:bg-yellow-500/10 transition-colors"
                      >
                        <span className="text-xs text-foreground flex-1 text-left truncate">{p.name}</span>
                        <span className="text-[8px] bg-yellow-500/20 text-yellow-600 px-1.5 py-0.5 rounded font-bold">PENDURADO</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </PremiumGate>
        )}

        {/* ─── PREMIUM: Estatísticas do Elenco ─── */}
        <div id="squad-stats">
          <PremiumGate label="Estatísticas do Elenco">
            <section>
              <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Estatísticas do Elenco
              </h3>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-[1fr_32px_32px_32px_32px] gap-0 px-3 py-2 border-b border-border text-[10px] text-muted-foreground font-semibold"
                  style={{ fontFamily: 'var(--font-heading)' }}>
                  <span>Jogador</span>
                  <span className="text-center">G</span>
                  <span className="text-center">A</span>
                  <span className="text-center">CA</span>
                  <span className="text-center">CV</span>
                </div>
                {playerStats
                  .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.player.name.localeCompare(b.player.name))
                  .map(ps => (
                    <button
                      key={ps.player.id}
                      onClick={() => navigate(`/jogador/${ps.player.id}`)}
                      className="w-full grid grid-cols-[1fr_32px_32px_32px_32px] gap-0 px-3 py-2 items-center border-b border-border hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-foreground truncate">{ps.player.name}</span>
                      </div>
                      <span className="text-center text-xs font-bold text-green-600" style={{ fontFamily: 'var(--font-mono)' }}>
                        {ps.goals || '-'}
                      </span>
                      <span className="text-center text-xs text-blue-600" style={{ fontFamily: 'var(--font-mono)' }}>
                        {ps.assists || '-'}
                      </span>
                      <span className="text-center text-xs text-yellow-600" style={{ fontFamily: 'var(--font-mono)' }}>
                        {ps.yellows || '-'}
                      </span>
                      <span className="text-center text-xs text-red-500" style={{ fontFamily: 'var(--font-mono)' }}>
                        {ps.reds || '-'}
                      </span>
                    </button>
                  ))}
              </div>
            </section>
          </PremiumGate>
        </div>
      </div>

      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onSuccess={() => setPremiumUnlocked(true)}
      />
    </div>
    </PageTransition>
  );
}
