import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Trophy } from 'lucide-react';
import { fetchAllEvents, fetchTeams, type Team, type MatchEvent } from '../lib/supabase';
import { PremiumPageGate } from '../components/PremiumGate';
import { PageTransition } from '../components/PageTransition';

function TeamLogo({ url, name }: { url?: string; name: string }) {
  const [err, setErr] = useState(false);
  if (!url || err) {
    return (
      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[7px] font-bold text-foreground shrink-0">
        {name.slice(0, 2)}
      </div>
    );
  }
  return <img src={url} alt={name} onError={() => setErr(true)} className="w-5 h-5 object-contain shrink-0" />;
}

interface ScorerRow {
  playerId: string;
  playerName: string;
  playerNumber: string;
  playerPhoto: string | null;
  teamName: string;
  teamLogo: string;
  goals: number;
}

export function TopScorersPage() {
  const navigate = useNavigate();
  const [scorers, setScorers] = useState<ScorerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [events, teams] = await Promise.all([fetchAllEvents(), fetchTeams()]);
      const teamsMap = new Map(teams.map(t => [t.id, t]));

      const goalEvents = events.filter(e => ['goal', 'penalty_scored'].includes(e.event_type));

      const countMap = new Map<string, ScorerRow>();
      goalEvents.forEach(ev => {
        const p = ev.player as any;
        if (!p) return;
        const key = ev.player_id;
        const existing = countMap.get(key);
        const team = teamsMap.get(ev.team_id) || (ev.team as any);
        if (existing) {
          existing.goals++;
        } else {
          countMap.set(key, {
            playerId: ev.player_id,
            playerName: p.name || 'Jogador',
            playerNumber: p.number || '',
            playerPhoto: p.photo_url || null,
            teamName: team?.short_name || team?.name || '',
            teamLogo: team?.logo_url || '',
            goals: 1,
          });
        }
      });

      const sorted = Array.from(countMap.values()).sort((a, b) => b.goals - a.goals);
      setScorers(sorted);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <PremiumPageGate>
      <PageTransition>
      <div className="px-4 py-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="flex items-center gap-2 mb-5">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            Artilharia
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : scorers.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">Nenhum gol registrado</p>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {scorers.map((s, idx) => {
              const pos = idx + 1;
              const isMedal = pos <= 3;
              const medalColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
              return (
                <button
                  key={s.playerId}
                  onClick={() => navigate(`/jogador/${s.playerId}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors ${
                    idx < scorers.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <span
                    className={`w-6 text-center text-sm font-bold ${isMedal ? medalColors[pos - 1] : 'text-subtle'}`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {pos}
                  </span>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <TeamLogo url={s.teamLogo} name={s.teamName} />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{s.playerName}</p>
                      <p className="text-[10px] text-muted-foreground">{s.teamName} · #{s.playerNumber}</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-green-600" style={{ fontFamily: 'var(--font-mono)' }}>
                    {s.goals}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      </PageTransition>
    </PremiumPageGate>
  );
}