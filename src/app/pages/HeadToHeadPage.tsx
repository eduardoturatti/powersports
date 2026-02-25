import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Swords } from 'lucide-react';
import { fetchTeams, fetchMatches, fetchAllEvents, type Team, type Match, type MatchEvent } from '../lib/supabase';
import { PremiumPageGate } from '../components/PremiumGate';
import { PageTransition } from '../components/PageTransition';

function TeamLogo({ url, name, size = 32 }: { url?: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!url || err) {
    return (
      <div className="rounded-full bg-muted flex items-center justify-center text-foreground font-bold shrink-0"
        style={{ width: size, height: size, fontFamily: 'var(--font-heading)', fontSize: size * 0.3 }}>
        {name.slice(0, 2)}
      </div>
    );
  }
  return <img src={url} alt={name} onError={() => setErr(true)} className="object-contain shrink-0" style={{ width: size, height: size }} />;
}

function CompareBar({ label, home, away, homeColor, awayColor }: {
  label: string; home: number; away: number; homeColor: string; awayColor: string;
}) {
  const total = home + away;
  const homePct = total > 0 ? (home / total) * 100 : 50;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>{home}</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>{away}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-secondary gap-0.5">
        <div className="rounded-full transition-all duration-500" style={{ width: `${homePct}%`, backgroundColor: homeColor }} />
        <div className="rounded-full transition-all duration-500" style={{ width: `${100 - homePct}%`, backgroundColor: awayColor }} />
      </div>
    </div>
  );
}

export function HeadToHeadPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [teamA, setTeamA] = useState<string>('');
  const [teamB, setTeamB] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [t, m, e] = await Promise.all([fetchTeams(), fetchMatches(), fetchAllEvents()]);
      setTeams(t);
      setMatches(m);
      setEvents(e);
      setLoading(false);
    }
    load();
  }, []);

  const tA = teams.find(t => t.id === teamA);
  const tB = teams.find(t => t.id === teamB);

  const h2hMatch = matches.find(m =>
    m.status === 'finished' &&
    ((m.home_team_id === teamA && m.away_team_id === teamB) ||
     (m.home_team_id === teamB && m.away_team_id === teamA))
  );

  const getTeamStats = (tid: string) => {
    const teamMatches = matches.filter(m =>
      m.status === 'finished' && (m.home_team_id === tid || m.away_team_id === tid)
    );
    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
    teamMatches.forEach(m => {
      const isHome = m.home_team_id === tid;
      const gf = isHome ? (m.score_home || 0) : (m.score_away || 0);
      const ga = isHome ? (m.score_away || 0) : (m.score_home || 0);
      goalsFor += gf; goalsAgainst += ga;
      if (gf > ga) wins++; else if (gf < ga) losses++; else draws++;
    });
    const yellows = events.filter(e => e.team_id === tid && e.event_type === 'yellow_card').length;
    const reds = events.filter(e => e.team_id === tid && e.event_type === 'red_card').length;
    const goals = events.filter(e => e.team_id === tid && ['goal', 'penalty_scored'].includes(e.event_type)).length;
    return { wins, draws, losses, goalsFor, goalsAgainst, yellows, reds, goals, played: teamMatches.length };
  };

  const statsA = teamA ? getTeamStats(teamA) : null;
  const statsB = teamB ? getTeamStats(teamB) : null;

  return (
    <PremiumPageGate>
      <PageTransition>
      <div className="px-4 py-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="flex items-center gap-2 mb-5">
          <Swords className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            Mano a Mano
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Team selectors */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Time 1</label>
                <select
                  value={teamA}
                  onChange={e => setTeamA(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground appearance-none"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  <option value="">Selecione</option>
                  {teams.filter(t => t.id !== teamB).map(t => (
                    <option key={t.id} value={t.id}>{t.short_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Time 2</label>
                <select
                  value={teamB}
                  onChange={e => setTeamB(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground appearance-none"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  <option value="">Selecione</option>
                  {teams.filter(t => t.id !== teamA).map(t => (
                    <option key={t.id} value={t.id}>{t.short_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {tA && tB && statsA && statsB && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-center gap-2">
                    <TeamLogo url={tA.logo_url} name={tA.short_name} size={48} />
                    <span className="text-xs font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                      {tA.short_name}
                    </span>
                  </div>
                  <Swords className="w-6 h-6 text-subtle" />
                  <div className="flex flex-col items-center gap-2">
                    <TeamLogo url={tB.logo_url} name={tB.short_name} size={48} />
                    <span className="text-xs font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                      {tB.short_name}
                    </span>
                  </div>
                </div>

                {h2hMatch && (
                  <div className="bg-card rounded-xl border border-border p-4 text-center">
                    <p className="text-[10px] text-muted-foreground mb-2 uppercase font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                      Confronto Direto
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      <span className="text-sm font-bold text-foreground">{h2hMatch.home_team_id === teamA ? tA.short_name : tB.short_name}</span>
                      <span className="text-2xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                        {h2hMatch.score_home} - {h2hMatch.score_away}
                      </span>
                      <span className="text-sm font-bold text-foreground">{h2hMatch.away_team_id === teamA ? tA.short_name : tB.short_name}</span>
                    </div>
                  </div>
                )}

                <div className="bg-card rounded-xl border border-border p-4 space-y-4">
                  <CompareBar label="Vitórias" home={statsA.wins} away={statsB.wins}
                    homeColor={tA.color || '#22c55e'} awayColor={tB.color || '#3b82f6'} />
                  <CompareBar label="Empates" home={statsA.draws} away={statsB.draws}
                    homeColor={tA.color || '#22c55e'} awayColor={tB.color || '#3b82f6'} />
                  <CompareBar label="Derrotas" home={statsA.losses} away={statsB.losses}
                    homeColor={tA.color || '#22c55e'} awayColor={tB.color || '#3b82f6'} />
                  <CompareBar label="Gols Feitos" home={statsA.goalsFor} away={statsB.goalsFor}
                    homeColor={tA.color || '#22c55e'} awayColor={tB.color || '#3b82f6'} />
                  <CompareBar label="Gols Sofridos" home={statsA.goalsAgainst} away={statsB.goalsAgainst}
                    homeColor={tA.color || '#22c55e'} awayColor={tB.color || '#3b82f6'} />
                  <CompareBar label="Cartões Amarelos" home={statsA.yellows} away={statsB.yellows}
                    homeColor={tA.color || '#22c55e'} awayColor={tB.color || '#3b82f6'} />
                  <CompareBar label="Cartões Vermelhos" home={statsA.reds} away={statsB.reds}
                    homeColor={tA.color || '#22c55e'} awayColor={tB.color || '#3b82f6'} />
                </div>
              </div>
            )}

            {(!teamA || !teamB) && (
              <p className="text-center text-muted-foreground text-sm py-8">
                Selecione dois times para comparar
              </p>
            )}
          </>
        )}
      </div>
      </PageTransition>
    </PremiumPageGate>
  );
}