import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, MapPin, Calendar, Clock, Radio, Users, Star } from 'lucide-react';
import {
  fetchMatchById, fetchMatchEvents, fetchMatchLineups, fetchMatchTeamStats, fetchPlayerById,
  type Match, type MatchEvent, type MatchLineup, type MatchTeamStats, type Player,
} from '../lib/supabase';
import { PremiumGate } from '../components/PremiumGate';
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

const EVENT_ICONS: Record<string, string> = {
  goal: '\u26BD', own_goal: '\u26BD', yellow_card: '\uD83D\uDFE8', red_card: '\uD83D\uDFE5',
  substitution: '\uD83D\uDD04', penalty_scored: '\u26BD', penalty_missed: '\u274C',
};

const EVENT_LABELS: Record<string, string> = {
  goal: 'Gol', own_goal: 'Gol Contra', yellow_card: 'Cartão Amarelo', red_card: 'Cartão Vermelho',
  substitution: 'Substituição', penalty_scored: 'Pênalti Convertido', penalty_missed: 'Pênalti Perdido',
};

function StatBar({ label, home, away, homeColor, awayColor }: { label: string; home: number; away: number; homeColor?: string; awayColor?: string }) {
  const total = home + away;
  const homePercent = total > 0 ? (home / total) * 100 : 50;
  const awayPercent = total > 0 ? (away / total) * 100 : 50;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>{home}</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>{away}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
        <div className="rounded-l-full transition-all" style={{
          width: `${homePercent}%`,
          backgroundColor: homeColor || '#22c55e',
        }} />
        <div className="rounded-r-full transition-all" style={{
          width: `${awayPercent}%`,
          backgroundColor: awayColor || '#64748b',
        }} />
      </div>
    </div>
  );
}

export function MatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [lineups, setLineups] = useState<MatchLineup[]>([]);
  const [teamStats, setTeamStats] = useState<MatchTeamStats[]>([]);
  const [mvpPlayer, setMvpPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    const [m, ev, lu, ts] = await Promise.all([
      fetchMatchById(id),
      fetchMatchEvents(id),
      fetchMatchLineups(id),
      fetchMatchTeamStats(id),
    ]);
    setMatch(m);
    setEvents(ev);
    setLineups(lu);
    setTeamStats(ts);

    // Debug: log loaded data to help identify rendering issues
    console.log('[MatchDetail] Loaded:', {
      matchId: id,
      matchStatus: m?.status,
      eventsCount: ev?.length,
      lineupsCount: lu?.length,
      teamStatsCount: ts?.length,
      sampleEvent: ev?.[0],
    });

    // Fetch MVP player if present
    if (m?.mvp_player_id) {
      const mvp = await fetchPlayerById(m.mvp_player_id);
      setMvpPlayer(mvp);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-muted-foreground">Partida não encontrada</p>
        <button onClick={() => navigate('/')} className="text-primary text-sm mt-3">Voltar</button>
      </div>
    );
  }

  const isFinished = match.status === 'finished';
  const hasScore = match.score_home !== null && match.score_away !== null;

  const goalEvents = events.filter(e => ['goal', 'own_goal', 'penalty_scored'].includes(e.event_type));
  const homeGoals = goalEvents.filter(e => e.team_id === match.home_team_id);
  const awayGoals = goalEvents.filter(e => e.team_id === match.away_team_id);

  const homeLineup = lineups.filter(l => l.team_id === match.home_team_id);
  const awayLineup = lineups.filter(l => l.team_id === match.away_team_id);
  const homeStarters = homeLineup.filter(l => l.is_starter);
  const homeSubs = homeLineup.filter(l => !l.is_starter);
  const awayStarters = awayLineup.filter(l => l.is_starter);
  const awaySubs = awayLineup.filter(l => !l.is_starter);

  // Event-based stats (fallback if no match_team_stats)
  const homeYellows = events.filter(e => e.event_type === 'yellow_card' && e.team_id === match.home_team_id).length;
  const awayYellows = events.filter(e => e.event_type === 'yellow_card' && e.team_id === match.away_team_id).length;
  const homeReds = events.filter(e => e.event_type === 'red_card' && e.team_id === match.home_team_id).length;
  const awayReds = events.filter(e => e.event_type === 'red_card' && e.team_id === match.away_team_id).length;
  const homeSubs2 = events.filter(e => e.event_type === 'substitution' && e.team_id === match.home_team_id).length;
  const awaySubs2 = events.filter(e => e.event_type === 'substitution' && e.team_id === match.away_team_id).length;

  // Match team stats from DB
  const homeStats = teamStats.find(s => s.team_id === match.home_team_id);
  const awayStats = teamStats.find(s => s.team_id === match.away_team_id);
  const hasTeamStats = homeStats || awayStats;

  // Penalty shootout
  const hasPenalties = match.penalty_score_home != null && match.penalty_score_away != null;

  return (
    <PageTransition>
    <div className="pb-6">
      <div className="px-4 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>
      </div>

      <div className="px-4 pt-4 pb-6">
        <div className="text-center mb-1">
          <span className="text-[10px] text-muted-foreground font-medium">
            {match.round_name || `Rodada ${match.round_number}`}
          </span>
          {match.broadcast && (
            <span className="inline-flex items-center gap-1 bg-red-500/15 text-red-500 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ml-2">
              <Radio className="w-2.5 h-2.5" />
              <span className="tracking-wide uppercase">AO VIVO NA F7</span>
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1 flex flex-col items-center gap-2">
            <TeamLogo url={match.home_team?.logo_url} name={match.home_team?.short_name || '?'} size={56} />
            <span className="text-xs font-bold text-foreground text-center max-w-[110px] truncate" style={{ fontFamily: 'var(--font-heading)' }}>
              {match.home_team?.name || match.home_team?.short_name || '?'}
            </span>
          </div>

          <div className="flex-shrink-0 px-6 flex flex-col items-center gap-1">
            {hasScore ? (
              <div className="flex items-center gap-3">
                <span className="text-4xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                  {match.score_home}
                </span>
                <span className="text-xl text-subtle">:</span>
                <span className="text-4xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                  {match.score_away}
                </span>
              </div>
            ) : (
              <span className="text-2xl text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>vs</span>
            )}
            {hasPenalties && (
              <span className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                ({match.penalty_score_home} - {match.penalty_score_away} pen.)
              </span>
            )}
            {isFinished && (
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Encerrado</span>
            )}
            {!isFinished && (
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(match.match_date), "dd/MM \u00b7 HH:mm", { locale: ptBR })}
              </span>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center gap-2">
            <TeamLogo url={match.away_team?.logo_url} name={match.away_team?.short_name || '?'} size={56} />
            <span className="text-xs font-bold text-foreground text-center max-w-[110px] truncate" style={{ fontFamily: 'var(--font-heading)' }}>
              {match.away_team?.name || match.away_team?.short_name || '?'}
            </span>
          </div>
        </div>

        {/* Match info row */}
        <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-muted-foreground flex-wrap">
          {match.match_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(match.match_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
            </div>
          )}
          {match.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{match.location}</span>
            </div>
          )}
          {match.referee && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>Árbitro: {match.referee}</span>
            </div>
          )}
          {match.attendance != null && match.attendance > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{match.attendance} presentes</span>
            </div>
          )}
        </div>

        {/* Stoppage times */}
        {(match.stoppage_time_1st != null || match.stoppage_time_2nd != null) && isFinished && (
          <div className="flex items-center justify-center gap-3 mt-2 text-[9px] text-subtle">
            {match.stoppage_time_1st != null && (
              <span>Acréscimos 1T: +{match.stoppage_time_1st}'</span>
            )}
            {match.stoppage_time_2nd != null && (
              <span>Acréscimos 2T: +{match.stoppage_time_2nd}'</span>
            )}
          </div>
        )}
      </div>

      <div className="px-4 space-y-5">
        {/* MVP Highlight */}
        {mvpPlayer && isFinished && (
          <section>
            <button
              onClick={() => navigate(`/jogador/${mvpPlayer.id}`)}
              className="w-full bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 rounded-xl border border-yellow-500/20 p-3 flex items-center gap-3 hover:border-yellow-500/40 transition-colors active:scale-[0.98]"
            >
              <div className="relative">
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-yellow-600 font-semibold uppercase">Craque do Jogo</p>
                <p className="text-sm text-foreground font-bold truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                  {mvpPlayer.name}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">
                {mvpPlayer.position}
              </span>
            </button>
          </section>
        )}

        {/* Goals */}
        {goalEvents.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Gols
            </h3>
            <div className="space-y-2">
              {homeGoals.map(ev => (
                <div key={ev.id} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2">
                  <span className="text-sm">{EVENT_ICONS[ev.event_type] || '\u26BD'}</span>
                  <div className="flex-1">
                    <span className="text-sm text-foreground">{ev.player?.name || 'Jogador'}</span>
                    {ev.event_type === 'own_goal' && <span className="text-[10px] text-red-500 ml-1">(GC)</span>}
                  </div>
                  <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                    {ev.minute ? `${ev.minute}'` : ''}
                  </span>
                </div>
              ))}
              {awayGoals.map(ev => (
                <div key={ev.id} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2">
                  <span className="text-sm">{EVENT_ICONS[ev.event_type] || '\u26BD'}</span>
                  <div className="flex-1">
                    <span className="text-sm text-foreground">{ev.player?.name || 'Jogador'}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">({match.away_team?.short_name})</span>
                    {ev.event_type === 'own_goal' && <span className="text-[10px] text-red-500 ml-1">(GC)</span>}
                  </div>
                  <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                    {ev.minute ? `${ev.minute}'` : ''}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Timeline - PREMIUM */}
        <PremiumGate label="Timeline Completa">
          <section>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
              <Clock className="w-4 h-4 text-primary" /> Timeline
            </h3>
            <div className="relative">
              {(() => {
                // Robust half detection: handle '1', '2', '1st', '2nd', 'first_half', 'second_half', numbers, etc.
                const getHalfNumber = (ev: MatchEvent): 1 | 2 => {
                  const h = String(ev.half ?? '').toLowerCase().trim();
                  if (h === '1' || h === '1st' || h.includes('first') || h === 'primeiro' || h === '1t') return 1;
                  if (h === '2' || h === '2nd' || h.includes('second') || h === 'segundo' || h === '2t') return 2;
                  // Fallback to minute-based detection
                  if (ev.minute != null && ev.minute <= 45) return 1;
                  return 2;
                };

                const firstHalf = events.filter(ev => getHalfNumber(ev) === 1);
                const secondHalf = events.filter(ev => getHalfNumber(ev) === 2);

                const renderEvent = (ev: MatchEvent) => {
                  const isHome = ev.team_id === match.home_team_id;
                  return (
                    <div key={ev.id} className="relative flex items-start gap-3 pl-1">
                      <div className="w-11 shrink-0 text-right pr-1">
                        <span className="text-[11px] font-bold text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                          {ev.minute ? `${ev.minute}'` : '-'}
                        </span>
                      </div>
                      <div className="w-4 h-4 rounded-full bg-popover border border-border flex items-center justify-center text-[8px] z-10 shrink-0 mt-0.5">
                        {EVENT_ICONS[ev.event_type] || '\u2022'}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="text-xs text-foreground">
                          {ev.player?.name || 'Jogador'}
                          <span className="text-muted-foreground ml-1">({isHome ? match.home_team?.short_name : match.away_team?.short_name})</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">{EVENT_LABELS[ev.event_type] || ev.event_type}</p>
                      </div>
                    </div>
                  );
                };

                const renderHalfHeader = (label: string, stoppageTime?: number | null) => (
                  <div className="flex items-center gap-2 py-2 pl-1">
                    <div className="w-11 shrink-0" />
                    <div className="flex-1 flex items-center gap-2">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: 'var(--font-heading)' }}>
                        {label}
                        {stoppageTime != null && stoppageTime > 0 && (
                          <span className="text-subtle ml-1" style={{ fontFamily: 'var(--font-mono)' }}>+{stoppageTime}'</span>
                        )}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  </div>
                );

                return (
                  <>
                    {firstHalf.length > 0 && (
                      <>
                        {renderHalfHeader('1º Tempo')}
                        <div className="relative">
                          <div className="absolute left-[22px] top-0 bottom-0 w-px bg-border" />
                          <div className="space-y-1">
                            {firstHalf.map(renderEvent)}
                          </div>
                        </div>
                      </>
                    )}
                    {secondHalf.length > 0 && (
                      <>
                        {renderHalfHeader('Intervalo', match.stoppage_time_1st)}
                        {renderHalfHeader('2º Tempo')}
                        <div className="relative">
                          <div className="absolute left-[22px] top-0 bottom-0 w-px bg-border" />
                          <div className="space-y-1">
                            {secondHalf.map(renderEvent)}
                          </div>
                        </div>
                      </>
                    )}
                    {/* If no events at all but match is finished, show empty state */}
                    {firstHalf.length === 0 && secondHalf.length === 0 && events.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">Nenhum evento registrado</p>
                    )}
                    {/* Fallback: if somehow events exist but didn't land in either half, show them all */}
                    {firstHalf.length === 0 && secondHalf.length === 0 && events.length > 0 && (
                      <div className="relative">
                        <div className="absolute left-[22px] top-0 bottom-0 w-px bg-border" />
                        <div className="space-y-1">
                          {events.map(renderEvent)}
                        </div>
                      </div>
                    )}
                    {isFinished && (firstHalf.length > 0 || secondHalf.length > 0) && (
                      renderHalfHeader('Fim de Jogo', match.stoppage_time_2nd)
                    )}
                  </>
                );
              })()}
            </div>
          </section>
        </PremiumGate>

        {/* Lineups - PREMIUM */}
        {(homeLineup.length > 0 || awayLineup.length > 0) && (
          <PremiumGate label="Escalações">
            <section>
              <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Escalações
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold mb-2 uppercase" style={{ fontFamily: 'var(--font-heading)' }}>
                    {match.home_team?.short_name}
                  </p>
                  <div className="space-y-0.5">
                    {homeStarters.map(l => (
                      <div key={l.id} className="flex items-center gap-1.5 text-xs text-foreground py-0.5">
                        <span className="text-[10px] text-muted-foreground w-5 text-center" style={{ fontFamily: 'var(--font-mono)' }}>
                          {l.player?.number}
                        </span>
                        <span className="truncate">{l.player?.name}</span>
                      </div>
                    ))}
                    {homeSubs.length > 0 && (
                      <>
                        <p className="text-[9px] text-subtle mt-2 mb-1 uppercase">Reservas</p>
                        {homeSubs.map(l => (
                          <div key={l.id} className="flex items-center gap-1.5 text-xs text-muted-foreground py-0.5">
                            <span className="text-[10px] text-subtle w-5 text-center" style={{ fontFamily: 'var(--font-mono)' }}>
                              {l.player?.number}
                            </span>
                            <span className="truncate">{l.player?.name}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold mb-2 uppercase text-right" style={{ fontFamily: 'var(--font-heading)' }}>
                    {match.away_team?.short_name}
                  </p>
                  <div className="space-y-0.5">
                    {awayStarters.map(l => (
                      <div key={l.id} className="flex items-center gap-1.5 text-xs text-foreground py-0.5 justify-end">
                        <span className="truncate">{l.player?.name}</span>
                        <span className="text-[10px] text-muted-foreground w-5 text-center" style={{ fontFamily: 'var(--font-mono)' }}>
                          {l.player?.number}
                        </span>
                      </div>
                    ))}
                    {awaySubs.length > 0 && (
                      <>
                        <p className="text-[9px] text-subtle mt-2 mb-1 uppercase text-right">Reservas</p>
                        {awaySubs.map(l => (
                          <div key={l.id} className="flex items-center gap-1.5 text-xs text-muted-foreground py-0.5 justify-end">
                            <span className="truncate">{l.player?.name}</span>
                            <span className="text-[10px] text-subtle w-5 text-center" style={{ fontFamily: 'var(--font-mono)' }}>
                              {l.player?.number}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </PremiumGate>
        )}

        {/* Match Stats - PREMIUM */}
        <PremiumGate label="Estatísticas da Partida">
          <section>
            <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Estatísticas
            </h3>
            <div className="space-y-3">
              {hasTeamStats ? (
                <>
                  {/* DB-driven stats */}
                  {(homeStats?.possession_pct != null || awayStats?.possession_pct != null) && (
                    <StatBar
                      label="Posse de Bola %"
                      home={homeStats?.possession_pct ?? 50}
                      away={awayStats?.possession_pct ?? 50}
                      homeColor={match.home_team?.color}
                      awayColor={match.away_team?.color}
                    />
                  )}
                  {(homeStats?.shots_total != null || awayStats?.shots_total != null) && (
                    <StatBar
                      label="Finalizações"
                      home={homeStats?.shots_total ?? 0}
                      away={awayStats?.shots_total ?? 0}
                      homeColor={match.home_team?.color}
                      awayColor={match.away_team?.color}
                    />
                  )}
                  {(homeStats?.shots_on_target != null || awayStats?.shots_on_target != null) && (
                    <StatBar
                      label="No Gol"
                      home={homeStats?.shots_on_target ?? 0}
                      away={awayStats?.shots_on_target ?? 0}
                      homeColor={match.home_team?.color}
                      awayColor={match.away_team?.color}
                    />
                  )}
                  {(homeStats?.corners != null || awayStats?.corners != null) && (
                    <StatBar
                      label="Escanteios"
                      home={homeStats?.corners ?? 0}
                      away={awayStats?.corners ?? 0}
                      homeColor={match.home_team?.color}
                      awayColor={match.away_team?.color}
                    />
                  )}
                  {(homeStats?.fouls_committed != null || awayStats?.fouls_committed != null) && (
                    <StatBar
                      label="Faltas"
                      home={homeStats?.fouls_committed ?? 0}
                      away={awayStats?.fouls_committed ?? 0}
                      homeColor={match.home_team?.color}
                      awayColor={match.away_team?.color}
                    />
                  )}
                  {(homeStats?.offsides != null || awayStats?.offsides != null) && (
                    <StatBar
                      label="Impedimentos"
                      home={homeStats?.offsides ?? 0}
                      away={awayStats?.offsides ?? 0}
                      homeColor={match.home_team?.color}
                      awayColor={match.away_team?.color}
                    />
                  )}
                  {(homeStats?.saves != null || awayStats?.saves != null) && (
                    <StatBar
                      label="Defesas"
                      home={homeStats?.saves ?? 0}
                      away={awayStats?.saves ?? 0}
                      homeColor={match.home_team?.color}
                      awayColor={match.away_team?.color}
                    />
                  )}
                  {(homeStats?.passes_completed != null || awayStats?.passes_completed != null) && (
                    <StatBar
                      label="Passes Certos"
                      home={homeStats?.passes_completed ?? 0}
                      away={awayStats?.passes_completed ?? 0}
                      homeColor={match.home_team?.color}
                      awayColor={match.away_team?.color}
                    />
                  )}
                </>
              ) : null}

              {/* Always show event-based card stats */}
              <StatBar label="Cartões Amarelos" home={homeYellows} away={awayYellows} homeColor={match.home_team?.color} awayColor={match.away_team?.color} />
              <StatBar label="Cartões Vermelhos" home={homeReds} away={awayReds} homeColor={match.home_team?.color} awayColor={match.away_team?.color} />
              <StatBar label="Substituições" home={homeSubs2} away={awaySubs2} homeColor={match.home_team?.color} awayColor={match.away_team?.color} />
            </div>
          </section>
        </PremiumGate>
      </div>
    </div>
    </PageTransition>
  );
}