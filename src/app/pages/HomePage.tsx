import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  ChevronLeft, ChevronRight, MapPin, Trophy, BarChart3,
  Zap, Radio, Calendar, Users, ArrowRight, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  fetchMatches, fetchTeams, calculateStandings,
  type Match, type Team, type StandingRow,
} from '../lib/supabase';
import { isPremium } from '../lib/premium';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { PageTransition } from '../components/PageTransition';
import PowerLogo from '../components/PowerLogo';
import SponsorLogos from '../components/SponsorLogos';

/* ─── Reusable sub-components ─── */

function StatusBadge({ status, matchDate }: { status: string; matchDate: string }) {
  if (status === 'finished') {
    return (
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Encerrado
      </span>
    );
  }
  const date = new Date(matchDate);
  return (
    <span className="text-[10px] font-medium text-muted-foreground">
      {format(date, "dd MMM · HH:mm", { locale: ptBR })}
    </span>
  );
}

function TeamLogo({ url, name, size = 40 }: { url?: string; name: string; size?: number }) {
  const [error, setError] = useState(false);
  if (!url || error) {
    return (
      <div
        className="rounded-full bg-muted flex items-center justify-center text-foreground font-bold"
        style={{ width: size, height: size, fontFamily: 'var(--font-heading)', fontSize: size * 0.35 }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      onError={() => setError(true)}
      className="object-contain"
      style={{ width: size, height: size }}
    />
  );
}

function smartDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Hoje';
  if (isTomorrow(d)) return 'Amanhã';
  if (isYesterday(d)) return 'Ontem';
  return format(d, "dd MMM", { locale: ptBR });
}

function BroadcastBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-red-500/15 text-red-500 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
      <Radio className="w-2.5 h-2.5" />
      <span className="tracking-wide uppercase">AO VIVO NA F7</span>
    </span>
  );
}

/* ─── Playoff Placeholder Logic ─── */

function isPlayoffRound(match: Match): boolean {
  if (match.round_number > 7) return true;
  const rn = (match.round_name || '').toLowerCase();
  return /semi|final|terceiro|3[°º]|disput/.test(rn);
}

function getPlayoffLabels(match: Match): { home: string; away: string } | null {
  if (!isPlayoffRound(match)) return null;
  if (match.status === 'finished') return null;

  const rn = (match.round_name || '').toLowerCase();
  const title = (match.title || '').toLowerCase();
  const combined = `${rn} ${title}`;

  if (/semi/i.test(combined)) {
    if (/1|primeira/i.test(title) || /1/i.test(rn.replace('semi', '')))
      return { home: '1º Grupo', away: '4º Grupo' };
    if (/2|segunda/i.test(title) || /2/i.test(rn.replace('semi', '')))
      return { home: '2º Grupo', away: '3º Grupo' };
    return { home: 'A definir', away: 'A definir' };
  }

  if (/terceiro|3[°º]|disput/i.test(combined)) {
    return { home: 'Perd. Semi 1', away: 'Perd. Semi 2' };
  }

  if (/final/i.test(combined)) {
    return { home: 'Venc. Semi 1', away: 'Venc. Semi 2' };
  }

  return { home: 'A definir', away: 'A definir' };
}

function PlaceholderTeam({ label, size = 44 }: { label: string; size?: number }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-2">
      <div
        className="rounded-full bg-muted/60 border-2 border-dashed border-border flex items-center justify-center text-muted-foreground"
        style={{ width: size, height: size, fontFamily: 'var(--font-mono)', fontSize: size * 0.22 }}
      >
        ?
      </div>
      <span
        className="text-[11px] font-semibold text-muted-foreground text-center"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {label}
      </span>
    </div>
  );
}

/* ─── Match Card (compact) ─── */

function MatchCard({ match, onClick }: { match: Match; onClick: () => void }) {
  const isFinished = match.status === 'finished';
  const hasScore = match.score_home !== null && match.score_away !== null;
  const playoffLabels = getPlayoffLabels(match);

  return (
    <button
      onClick={onClick}
      className="w-full bg-card rounded-xl border border-border hover:border-primary/20 p-4 transition-all active:scale-[0.98]"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-muted-foreground font-medium">
          {match.round_name || `Rodada ${match.round_number}`}
        </span>
        <div className="flex items-center gap-1.5">
          {match.broadcast && <BroadcastBadge />}
          <StatusBadge status={match.status} matchDate={match.match_date} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        {playoffLabels ? (
          <PlaceholderTeam label={playoffLabels.home} size={44} />
        ) : (
          <div className="flex-1 flex flex-col items-center gap-2">
            <TeamLogo url={match.home_team?.logo_url} name={match.home_team?.short_name || '?'} size={44} />
            <span className="text-xs font-bold text-foreground truncate max-w-[110px] text-center" style={{ fontFamily: 'var(--font-heading)' }}>
              {match.home_team?.name || match.home_team?.short_name || '?'}
            </span>
          </div>
        )}

        <div className="flex-shrink-0 px-4">
          {hasScore ? (
            <div className="flex items-center gap-2">
              <span
                className={`text-3xl font-bold ${isFinished ? 'text-foreground' : 'text-muted-foreground'}`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {match.score_home}
              </span>
              <span className="text-lg text-subtle font-light">:</span>
              <span
                className={`text-3xl font-bold ${isFinished ? 'text-foreground' : 'text-muted-foreground'}`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {match.score_away}
              </span>
            </div>
          ) : (
            <span className="text-lg text-subtle" style={{ fontFamily: 'var(--font-mono)' }}>vs</span>
          )}
        </div>

        {playoffLabels ? (
          <PlaceholderTeam label={playoffLabels.away} size={44} />
        ) : (
          <div className="flex-1 flex flex-col items-center gap-2">
            <TeamLogo url={match.away_team?.logo_url} name={match.away_team?.short_name || '?'} size={44} />
            <span className="text-xs font-bold text-foreground truncate max-w-[110px] text-center" style={{ fontFamily: 'var(--font-heading)' }}>
              {match.away_team?.name || match.away_team?.short_name || '?'}
            </span>
          </div>
        )}
      </div>

      {match.location && (
        <div className="flex items-center justify-center gap-1 mt-3 text-[10px] text-subtle">
          <MapPin className="w-3 h-3" />
          <span>{match.location}</span>
        </div>
      )}
    </button>
  );
}

/* ─── Mini Standings Widget ─── */

function MiniStandings({ standings, onViewAll }: { standings: StandingRow[]; onViewAll: () => void }) {
  if (standings.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            Classificação
          </h3>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-[10px] text-accent-foreground font-semibold hover:text-primary transition-colors"
        >
          Ver completa <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-[24px_1fr_32px_28px_32px] gap-0 px-3 py-2 border-b border-border text-[10px] text-muted-foreground font-semibold"
          style={{ fontFamily: 'var(--font-heading)' }}>
          <span className="text-center">#</span>
          <span>Time</span>
          <span className="text-center">P</span>
          <span className="text-center">J</span>
          <span className="text-center">SG</span>
        </div>
        {standings.map((row, idx) => {
          const pos = idx + 1;
          const isQualified = pos <= 4;
          const isEliminated = pos >= 5;

          return (
            <div
              key={row.team.id}
              className={`grid grid-cols-[24px_1fr_32px_28px_32px] gap-0 px-3 py-2.5 items-center ${
                idx < standings.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <span
                className={`text-center text-xs font-bold ${
                  isQualified ? 'text-primary' : isEliminated ? 'text-destructive' : 'text-muted-foreground'
                }`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {pos}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <TeamLogo url={row.team.logo_url} name={row.team.short_name} size={22} />
                <span className="text-xs font-bold text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                  {row.team.short_name}
                </span>
              </div>
              <span className="text-center text-xs font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                {row.points}
              </span>
              <span className="text-center text-[11px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                {row.played}
              </span>
              <span
                className={`text-center text-[11px] font-semibold ${
                  row.goalDifference > 0 ? 'text-green-600' : row.goalDifference < 0 ? 'text-red-500' : 'text-muted-foreground'
                }`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mini legend */}
      <div className="flex items-center gap-3 mt-2 px-1">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-[9px] text-muted-foreground">Semifinal</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-[9px] text-muted-foreground">Eliminado</span>
        </div>
      </div>
    </section>
  );
}

/* ─── Quick Nav Cards ─── */

function QuickNav({ navigate }: { navigate: (path: string) => void }) {
  const premium = isPremium();
  const items = [
    { path: '/times', label: 'Times', desc: '7 equipes', icon: Users, gradient: 'from-blue-500/15 to-blue-600/5' },
    { path: '/classificacao', label: 'Tabela', desc: 'Completa', icon: BarChart3, gradient: 'from-green-500/15 to-green-600/5' },
    { path: '/premium', label: 'Premium', desc: premium ? 'Ativo' : 'Estatísticas', icon: Trophy, gradient: 'from-[#D4A843]/15 to-[#D4A843]/5' },
  ];

  return (
    <section>
      <div className="grid grid-cols-3 gap-2">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-gradient-to-br ${item.gradient} hover:border-primary/20 transition-all active:scale-95`}
            >
              <Icon className="w-5 h-5 text-foreground" />
              <span className="text-[11px] font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                {item.label}
              </span>
              <span className="text-[9px] text-muted-foreground">{item.desc}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Competition Selector ─── */

function CompetitionSelector() {
  const [open, setOpen] = useState(false);

  const competitions = [
    { id: '00000000-0000-0000-0001-000000000001', name: 'Municipal de Encantado 2026', active: true },
  ];

  const selected = competitions.find(c => c.active) || competitions[0];

  return (
    <div className="relative flex items-center justify-center">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 shadow-sm hover:border-primary/20 transition-all active:scale-[0.98]"
      >
        <Trophy className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          {selected.name}
        </span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-72 z-40 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider" style={{ fontFamily: 'var(--font-heading)' }}>
                Selecionar campeonato
              </span>
            </div>
            <div className="py-1">
              {competitions.map(comp => (
                <button
                  key={comp.id}
                  onClick={() => setOpen(false)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    comp.active
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-secondary text-foreground'
                  }`}
                >
                  <Trophy className={`w-4 h-4 shrink-0 ${comp.active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                      {comp.name}
                    </p>
                  </div>
                  {comp.active && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-border">
              <p className="text-[10px] text-muted-foreground text-center">
                Mais campeonatos em breve
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── MAIN HOME PAGE ─── */

export function HomePage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [rounds, setRounds] = useState<number[]>([]);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  const loadData = useCallback(async () => {
    const [matchesData, teamsData] = await Promise.all([
      fetchMatches(),
      fetchTeams(),
    ]);
    console.log('Fetched matches:', matchesData.length, '| teams:', teamsData.length);

    setMatches(matchesData);
    setTeams(teamsData);

    const calc = calculateStandings(matchesData, teamsData);
    setStandings(calc);

    const roundSet = new Set<number>();
    matchesData.forEach(m => {
      if (m.round_number) roundSet.add(m.round_number);
    });
    const sortedRounds = Array.from(roundSet).sort((a, b) => a - b);
    setRounds(sortedRounds);

    // Select current round intelligently — based on match dates, not just status
    const now = new Date();

    // Priority 1: Round with a live match
    const liveRound = sortedRounds.find(r =>
      matchesData.some(m => m.round_number === r && (m.status === 'live' || m.status === 'in_progress'))
    );
    if (liveRound) {
      setSelectedRound(liveRound);
    } else {
      // Priority 2: Find the round whose matches are closest to today
      // For each round, compute the closest match date to now
      let bestRound = sortedRounds[0];
      let bestScore = Infinity;

      for (const r of sortedRounds) {
        const roundMatchesList = matchesData.filter(m => m.round_number === r);
        if (roundMatchesList.length === 0) continue;

        // Check if this round has any upcoming (scheduled) matches
        const hasUpcoming = roundMatchesList.some(m => m.status === 'scheduled' || m.status === 'upcoming');
        const allFinished = roundMatchesList.every(m => m.status === 'finished');

        // Find the closest match date in this round to now
        const closestDate = roundMatchesList.reduce((closest, m) => {
          const diff = Math.abs(new Date(m.match_date).getTime() - now.getTime());
          return diff < closest ? diff : closest;
        }, Infinity);

        // Scoring: prefer rounds with upcoming matches, then most recently played
        // Upcoming rounds get a small bonus (lower score = better)
        const score = hasUpcoming ? closestDate * 0.5 : closestDate;

        if (score < bestScore) {
          bestScore = score;
          bestRound = r;
        }
      }

      setSelectedRound(bestRound);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived data
  const roundMatches = matches.filter(m => m.round_number === selectedRound);
  const currentRoundIdx = rounds.indexOf(selectedRound);

  // Upcoming matches: find the nearest future match by date, then show its entire round
  const now = new Date();
  console.log('[Home] Current time:', now.toISOString());
  console.log('[Home] All matches summary:', matches.map(m => ({ round: m.round_number, date: m.match_date, status: m.status, home: m.home_team?.short_name, away: m.away_team?.short_name })));
  const nextUpcomingRound = (() => {
    // Get ALL non-finished matches with future dates, sorted by date ascending
    const futureMatches = matches
      .filter(m => m.status !== 'finished' && new Date(m.match_date).getTime() > now.getTime())
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
    console.log('[Home] Future non-finished matches:', futureMatches.length, futureMatches.map(m => ({ round: m.round_number, date: m.match_date, status: m.status })));
    return futureMatches.length > 0 ? futureMatches[0].round_number : null;
  })();
  console.log('[Home] Next upcoming round:', nextUpcomingRound);
  const upcomingMatches = nextUpcomingRound
    ? matches
        .filter(m => m.round_number === nextUpcomingRound && m.status !== 'finished')
        .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
    : [];

  // Recent results: all games from the LAST fully finished round
  const lastFinishedRound = [...rounds]
    .reverse()
    .find(r => {
      const rm = matches.filter(m => m.round_number === r);
      return rm.length > 0 && rm.every(m => m.status === 'finished');
    });
  const recentResults = lastFinishedRound
    ? matches
        .filter(m => m.round_number === lastFinishedRound)
        .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
    : [];

  // Total stats
  const totalMatches = matches.length;
  const finishedCount = matches.filter(m => m.status === 'finished').length;
  const totalGoals = matches
    .filter(m => m.status === 'finished')
    .reduce((sum, m) => sum + (m.score_home || 0) + (m.score_away || 0), 0);

  const goPrev = () => {
    if (currentRoundIdx > 0) {
      setSlideDirection('left');
      setSelectedRound(rounds[currentRoundIdx - 1]);
    }
  };
  const goNext = () => {
    if (currentRoundIdx < rounds.length - 1) {
      setSlideDirection('right');
      setSelectedRound(rounds[currentRoundIdx + 1]);
    }
  };

  const handleRoundPillClick = (r: number) => {
    setSlideDirection(r > selectedRound ? 'right' : 'left');
    setSelectedRound(r);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground">Carregando Arena...</p>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="pb-4">
      {/* ─── Hero Banner ─── */}
      <div className="relative overflow-hidden px-4 pt-5 pb-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-green-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          {/* Competition Selector */}
          <div className="mb-5">
            <CompetitionSelector />
          </div>

          {/* Stats pills */}
          {finishedCount > 0 && (
            <div className="flex justify-center gap-3 mt-4">
              <div className="bg-card rounded-lg px-3 py-1.5 border border-border">
                <span className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                  {finishedCount}/{totalMatches}
                </span>
                <span className="text-[9px] text-muted-foreground block">Jogos</span>
              </div>
              <div className="bg-card rounded-lg px-3 py-1.5 border border-border">
                <span className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                  {totalGoals}
                </span>
                <span className="text-[9px] text-muted-foreground block">Gols</span>
              </div>
              <div className="bg-card rounded-lg px-3 py-1.5 border border-border">
                <span className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                  {finishedCount > 0 ? (totalGoals / finishedCount).toFixed(1) : '0'}
                </span>
                <span className="text-[9px] text-muted-foreground block">Média/Jogo</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* ─── Upcoming / Next Matches ─── */}
        {upcomingMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                Próximos Jogos
              </h3>
            </div>
            <div className="space-y-2">
              {upcomingMatches.map(match => {
                const playoffLabels = getPlayoffLabels(match);
                return (
                <button
                  key={match.id}
                  onClick={() => navigate(`/jogo/${match.id}`)}
                  className="w-full flex items-center gap-3 bg-card rounded-xl border border-border p-3 hover:border-primary/20 transition-all active:scale-[0.98]"
                >
                  {playoffLabels ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-muted/60 border border-dashed border-border flex items-center justify-center text-muted-foreground text-[9px]" style={{ fontFamily: 'var(--font-mono)' }}>?</div>
                      <span className="text-[11px] font-semibold text-muted-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                        {playoffLabels.home}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <TeamLogo url={match.home_team?.logo_url} name={match.home_team?.short_name || '?'} size={28} />
                      <span className="text-[11px] font-bold text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                        {match.home_team?.name || match.home_team?.short_name || '?'}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col items-center shrink-0 px-2">
                    <span className="text-[9px] text-muted-foreground font-medium uppercase">
                      {smartDateLabel(match.match_date)}
                    </span>
                    <span className="text-xs font-bold text-accent-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                      {format(new Date(match.match_date), 'HH:mm')}
                    </span>
                    {match.broadcast && (
                      <span className="flex items-center gap-0.5 text-red-500 mt-0.5">
                        <Radio className="w-2.5 h-2.5" />
                        <span className="text-[8px] font-semibold uppercase">AO VIVO NA F7</span>
                      </span>
                    )}
                  </div>

                  {playoffLabels ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span className="text-[11px] font-semibold text-muted-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                        {playoffLabels.away}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-muted/60 border border-dashed border-border flex items-center justify-center text-muted-foreground text-[9px]" style={{ fontFamily: 'var(--font-mono)' }}>?</div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span className="text-[11px] font-bold text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                        {match.away_team?.name || match.away_team?.short_name || '?'}
                      </span>
                      <TeamLogo url={match.away_team?.logo_url} name={match.away_team?.short_name || '?'} size={28} />
                    </div>
                  )}
                </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Recent Results ─── */}
        {recentResults.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                Últimos Resultados
              </h3>
            </div>
            <div className="space-y-2">
              {recentResults.map(match => (
                <button
                  key={match.id}
                  onClick={() => navigate(`/jogo/${match.id}`)}
                  className="w-full flex items-center gap-3 bg-card rounded-xl border border-border p-3 hover:border-primary/20 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <TeamLogo url={match.home_team?.logo_url} name={match.home_team?.short_name || '?'} size={28} />
                    <span className="text-[11px] font-bold text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                      {match.home_team?.name || match.home_team?.short_name || '?'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 px-2">
                    <span className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                      {match.score_home}
                    </span>
                    <span className="text-subtle">:</span>
                    <span className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                      {match.score_away}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="text-[11px] font-bold text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                      {match.away_team?.name || match.away_team?.short_name || '?'}
                    </span>
                    <TeamLogo url={match.away_team?.logo_url} name={match.away_team?.short_name || '?'} size={28} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ─── Mini Standings ─── */}
        <MiniStandings
          standings={standings}
          onViewAll={() => navigate('/classificacao')}
        />

        {/* ─── Quick Navigation ─── */}
        <QuickNav navigate={navigate} />

        {/* ─── Round-by-Round Section ─── */}
        {rounds.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                Jogos por Rodada
              </h3>
            </div>

            {/* Round navigator */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={goPrev}
                disabled={currentRoundIdx <= 0}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground disabled:opacity-20 hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex-1 text-center">
                <span className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  {roundMatches[0]?.round_name || `Rodada ${selectedRound}`}
                </span>
              </div>

              <button
                onClick={goNext}
                disabled={currentRoundIdx >= rounds.length - 1}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground disabled:opacity-20 hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Round pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
              {rounds.map(r => {
                const allFinished = matches.filter(m => m.round_number === r).every(m => m.status === 'finished');
                return (
                  <button
                    key={r}
                    onClick={() => handleRoundPillClick(r)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      r === selectedRound
                        ? 'bg-primary text-primary-foreground'
                        : allFinished
                        ? 'bg-secondary text-muted-foreground'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>

            {/* Match cards for selected round */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedRound}
                initial={{ opacity: 0, x: slideDirection === 'right' ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: slideDirection === 'right' ? -30 : 30 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                className="flex flex-col gap-3"
              >
                {roundMatches.length === 0 ? (
                  <div className="text-center py-12 text-subtle text-sm">
                    Nenhum jogo nesta rodada
                  </div>
                ) : (
                  roundMatches.map(match => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onClick={() => navigate(`/jogo/${match.id}`)}
                    />
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          </section>
        )}

        {/* ─── Empty State ─── */}
        {matches.length === 0 && !loading && (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 text-faint mx-auto mb-4" />
            <h3 className="text-base font-bold text-muted-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Em breve!
            </h3>
            <p className="text-xs text-subtle max-w-xs mx-auto leading-relaxed">
              O Municipal 2026 está sendo preparado. Os jogos aparecerão aqui assim que a tabela for publicada.
            </p>
          </div>
        )}

        {/* ─── Footer / Credits ─── */}
        <div className="border-t border-border pt-4 mt-2">
          <p className="text-[9px] text-subtle text-center uppercase tracking-wider mb-3"
            style={{ fontFamily: 'var(--font-heading)' }}>
            Apoio e Patrocínio
          </p>
          <div className="flex justify-center mb-4">
            <SponsorLogos width={220} />
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
          <div className="flex justify-center mt-3 opacity-40">
            <PowerLogo width={90} />
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
}