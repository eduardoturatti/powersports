import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Users } from 'lucide-react';
import { fetchAllEvents, fetchTeams, fetchPlayersByTeam, type Team, type Player } from '../lib/supabase';
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

interface AssistRow {
  playerId: string;
  playerName: string;
  playerNumber: string;
  teamName: string;
  teamLogo: string;
  assists: number;
}

export function TopAssistsPage() {
  const navigate = useNavigate();
  const [assisters, setAssisters] = useState<AssistRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [events, teams] = await Promise.all([fetchAllEvents(), fetchTeams()]);
      const teamsMap = new Map(teams.map(t => [t.id, t]));

      const allPlayersPromises = teams.map(t => fetchPlayersByTeam(t.id));
      const allPlayersArrays = await Promise.all(allPlayersPromises);
      const playersMap = new Map<string, Player>();
      allPlayersArrays.flat().forEach(p => playersMap.set(p.id, p));

      const countMap = new Map<string, AssistRow>();
      events
        .filter(e => e.event_type === 'goal' && (e.detail as any)?.assist_player_id)
        .forEach(ev => {
          const assistId = (ev.detail as any).assist_player_id;
          const player = playersMap.get(assistId);
          if (!player) return;

          const team = teamsMap.get(player.team_id);
          const existing = countMap.get(assistId);
          if (existing) {
            existing.assists++;
          } else {
            countMap.set(assistId, {
              playerId: assistId,
              playerName: player.name,
              playerNumber: player.number,
              teamName: team?.short_name || '',
              teamLogo: team?.logo_url || '',
              assists: 1,
            });
          }
        });

      const sorted = Array.from(countMap.values()).sort((a, b) => b.assists - a.assists);
      setAssisters(sorted);
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
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
              Assistências
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : assisters.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">Nenhuma assistência registrada</p>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {assisters.map((a, idx) => (
                <button
                  key={a.playerId}
                  onClick={() => navigate(`/jogador/${a.playerId}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors ${
                    idx < assisters.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <span className={`w-6 text-center text-sm font-bold ${idx < 3 ? 'text-blue-600' : 'text-subtle'}`}
                    style={{ fontFamily: 'var(--font-mono)' }}>
                    {idx + 1}
                  </span>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <TeamLogo url={a.teamLogo} name={a.teamName} />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{a.playerName}</p>
                      <p className="text-[10px] text-muted-foreground">{a.teamName} · #{a.playerNumber}</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-blue-600" style={{ fontFamily: 'var(--font-mono)' }}>
                    {a.assists}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </PageTransition>
    </PremiumPageGate>
  );
}