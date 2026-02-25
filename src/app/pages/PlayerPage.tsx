import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, User, Trophy, AlertTriangle, Star, Clock, Footprints, Ruler, Weight, Flag } from 'lucide-react';
import { fetchPlayerById, fetchAllEvents, fetchMatches, type Player, type MatchEvent, type Match } from '../lib/supabase';
import { PremiumPageGate } from '../components/PremiumGate';
import { format, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
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

const EVENT_ICONS: Record<string, string> = {
  goal: '\u26BD', own_goal: '\u26BD', yellow_card: '\uD83D\uDFE8', red_card: '\uD83D\uDFE5',
  substitution: '\uD83D\uDD04', penalty_scored: '\u26BD', penalty_missed: '\u274C',
};

const FOOT_LABELS: Record<string, string> = {
  right: 'Destro', left: 'Canhoto', both: 'Ambidestro',
};

export function PlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<Player | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const [p, allEvents, allMatches] = await Promise.all([
        fetchPlayerById(id),
        fetchAllEvents(),
        fetchMatches(),
      ]);
      setPlayer(p);
      setEvents(allEvents.filter(e => e.player_id === id));

      const assistEvents = allEvents.filter(e =>
        (e.detail as any)?.assist_player_id === id && e.event_type === 'goal'
      );

      setEvents(prev => {
        const ids = new Set(prev.map(e => e.id));
        const combined = [...prev];
        assistEvents.forEach(ae => {
          if (!ids.has(ae.id)) combined.push(ae);
        });
        return combined;
      });

      setMatches(allMatches);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-muted-foreground">Jogador não encontrado</p>
        <button onClick={() => navigate(-1)} className="text-primary text-sm mt-3">Voltar</button>
      </div>
    );
  }

  const team = player.team;
  const playerEvents = events.filter(e => e.player_id === id);
  const computedGoals = playerEvents.filter(e => ['goal', 'penalty_scored'].includes(e.event_type)).length;
  const computedAssists = events.filter(e => (e.detail as any)?.assist_player_id === id && e.event_type === 'goal').length;
  const computedYellows = playerEvents.filter(e => e.event_type === 'yellow_card').length;
  const computedReds = playerEvents.filter(e => e.event_type === 'red_card').length;

  // Use DB totals if available, fallback to computed from events
  const goals = player.total_goals ?? computedGoals;
  const assists = player.total_assists ?? computedAssists;
  const yellows = player.total_yellow_cards ?? computedYellows;
  const reds = player.total_red_cards ?? computedReds;
  const totalGames = player.total_games;
  const totalMinutes = player.total_minutes;

  const matchIds = [...new Set(playerEvents.map(e => e.match_id))];
  const playerMatches = matches
    .filter(m => matchIds.includes(m.id))
    .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());

  const age = player.birth_date
    ? differenceInYears(new Date(), new Date(player.birth_date))
    : null;

  const hasBio = player.height_cm || player.weight_kg || player.dominant_foot || player.nationality || player.birth_date;

  return (
    <PremiumPageGate>
      <PageTransition>
      <div className="pb-6">
        <div className="px-4 pt-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>

        {/* Player Header */}
        <div
          className="px-4 pb-6"
          style={{
            background: team ? `linear-gradient(135deg, ${(team as any).color || '#1f2937'}30, transparent)` : undefined,
          }}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              {player.photo_url ? (
                <img src={player.photo_url} alt={player.name} className="w-20 h-20 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <span
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-popover border-2 border-border flex items-center justify-center text-xs font-bold text-foreground"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {player.number}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                {player.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {team && <TeamLogo url={(team as any).logo_url} name={(team as any).short_name} size={18} />}
                <span className="text-sm text-muted-foreground">{(team as any)?.short_name || ''}</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground inline-block px-2 py-0.5 rounded-full bg-secondary">
                  {player.position || 'Posição indefinida'}
                </span>
                {player.is_suspended && (
                  <span className="text-[9px] font-bold text-red-500 bg-red-500/15 px-2 py-0.5 rounded-full uppercase">
                    Suspenso
                  </span>
                )}
                {!player.is_suspended && player.yellow_card_accumulator != null && player.yellow_card_accumulator >= 2 && (
                  <span className="text-[9px] font-bold text-yellow-600 bg-yellow-500/15 px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Pendurado
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 space-y-5">
          {/* Bio Info */}
          {hasBio && (
            <section>
              <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Perfil
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {player.birth_date && age !== null && (
                  <div className="bg-card rounded-lg border border-border p-3 flex items-center gap-2.5">
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>{age} anos</p>
                      <p className="text-[9px] text-muted-foreground">
                        {format(new Date(player.birth_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                )}
                {player.height_cm && (
                  <div className="bg-card rounded-lg border border-border p-3 flex items-center gap-2.5">
                    <Ruler className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>{player.height_cm} cm</p>
                      <p className="text-[9px] text-muted-foreground">Altura</p>
                    </div>
                  </div>
                )}
                {player.weight_kg && (
                  <div className="bg-card rounded-lg border border-border p-3 flex items-center gap-2.5">
                    <Weight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>{player.weight_kg} kg</p>
                      <p className="text-[9px] text-muted-foreground">Peso</p>
                    </div>
                  </div>
                )}
                {player.dominant_foot && (
                  <div className="bg-card rounded-lg border border-border p-3 flex items-center gap-2.5">
                    <Footprints className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground">{FOOT_LABELS[player.dominant_foot] || player.dominant_foot}</p>
                      <p className="text-[9px] text-muted-foreground">Pé dominante</p>
                    </div>
                  </div>
                )}
                {player.nationality && (
                  <div className="bg-card rounded-lg border border-border p-3 flex items-center gap-2.5 col-span-2">
                    <Flag className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground">{player.nationality}</p>
                      <p className="text-[9px] text-muted-foreground">Nacionalidade</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Stats */}
          <section>
            <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Estatísticas
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Gols', value: goals, color: 'text-green-600' },
                { label: 'Assist.', value: assists, color: 'text-blue-600' },
                { label: 'CA', value: yellows, color: 'text-yellow-600' },
                { label: 'CV', value: reds, color: 'text-red-500' },
              ].map(s => (
                <div key={s.label} className="bg-card rounded-lg border border-border p-3 text-center">
                  <p className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: 'var(--font-mono)' }}>
                    {s.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Extended stats row */}
            {(totalGames != null || totalMinutes != null || player.avg_rating != null) && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {totalGames != null && (
                  <div className="bg-card rounded-lg border border-border p-3 text-center">
                    <p className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                      {totalGames}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Jogos</p>
                  </div>
                )}
                {totalMinutes != null && (
                  <div className="bg-card rounded-lg border border-border p-3 text-center">
                    <p className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                      {totalMinutes}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Minutos</p>
                  </div>
                )}
                {player.avg_rating != null && (
                  <div className="bg-card rounded-lg border border-border p-3 text-center">
                    <p className="text-xl font-bold text-accent-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                      {player.avg_rating.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Nota</p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min((player.avg_rating / 10) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Suspension info */}
            {player.is_suspended && player.suspension_until && (
              <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <div>
                  <p className="text-xs text-red-500 font-semibold">Suspenso</p>
                  <p className="text-[10px] text-muted-foreground">
                    Até {format(new Date(player.suspension_until), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>
            )}
            {!player.is_suspended && player.yellow_card_accumulator != null && player.yellow_card_accumulator >= 2 && (
              <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
                <div>
                  <p className="text-xs text-yellow-600 font-semibold">Pendurado</p>
                  <p className="text-[10px] text-muted-foreground">
                    {player.yellow_card_accumulator} cartões amarelos acumulados &mdash; próximo suspende
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Match history */}
          {playerMatches.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Histórico de Partidas
              </h3>
              <div className="space-y-2">
                {playerMatches.map(m => {
                  const matchEvents = playerEvents.filter(e => e.match_id === m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => navigate(`/jogo/${m.id}`)}
                      className="w-full bg-card rounded-lg border border-border px-3 py-2.5 text-left hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-foreground">
                          {m.home_team?.short_name} {m.score_home} - {m.score_away} {m.away_team?.short_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(m.match_date), "dd/MM", { locale: ptBR })}
                        </span>
                      </div>
                      {matchEvents.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {matchEvents.map(ev => (
                            <span key={ev.id} className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <span>{EVENT_ICONS[ev.event_type] || '\u2022'}</span>
                              {ev.minute && <span>{ev.minute}'</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
      </PageTransition>
    </PremiumPageGate>
  );
}