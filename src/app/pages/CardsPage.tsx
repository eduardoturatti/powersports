import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, AlertTriangle, Shield, Ban } from 'lucide-react';
import {
  fetchAllEvents, fetchTeams, fetchAllPlayers,
  type Team, type Player, type MatchEvent,
} from '../lib/supabase';
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

interface CardPlayerRow {
  playerId: string;
  playerName: string;
  playerNumber: string;
  teamName: string;
  teamLogo: string;
  yellows: number;
  reds: number;
  isSuspended: boolean;
  isPendurado: boolean;
  yellowAccumulator: number;
}

interface FairPlayRow {
  team: Team;
  yellows: number;
  reds: number;
  score: number; // Art.79: amarelo = 10pts, vermelho = 50pts
}

export function CardsPage() {
  const navigate = useNavigate();
  const [playerCards, setPlayerCards] = useState<CardPlayerRow[]>([]);
  const [fairPlay, setFairPlay] = useState<FairPlayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'players' | 'fairplay' | 'pendurados'>('players');

  useEffect(() => {
    async function load() {
      const [events, teams, allPlayers] = await Promise.all([
        fetchAllEvents(),
        fetchTeams(),
        fetchAllPlayers(),
      ]);
      const teamsMap = new Map(teams.map(t => [t.id, t]));
      const playersMap = new Map<string, Player>();
      allPlayers.forEach(p => playersMap.set(p.id, p));

      // Build player card data
      const cardMap = new Map<string, CardPlayerRow>();
      events
        .filter(e => ['yellow_card', 'red_card'].includes(e.event_type))
        .forEach(ev => {
          const player = playersMap.get(ev.player_id);
          if (!player) return;
          const team = teamsMap.get(player.team_id);
          const key = ev.player_id;
          const existing = cardMap.get(key);
          if (existing) {
            if (ev.event_type === 'yellow_card') existing.yellows++;
            else existing.reds++;
          } else {
            cardMap.set(key, {
              playerId: ev.player_id,
              playerName: player.name,
              playerNumber: player.number,
              teamName: team?.short_name || '',
              teamLogo: team?.logo_url || '',
              yellows: ev.event_type === 'yellow_card' ? 1 : 0,
              reds: ev.event_type === 'red_card' ? 1 : 0,
              isSuspended: player.is_suspended ?? false,
              isPendurado: false,
              yellowAccumulator: player.yellow_card_accumulator ?? 0,
            });
          }
        });

      // Use DB accumulator for pendurado/suspended status
      cardMap.forEach((row) => {
        const player = playersMap.get(row.playerId);
        if (player) {
          row.isSuspended = player.is_suspended ?? false;
          row.yellowAccumulator = player.yellow_card_accumulator ?? row.yellows;
          row.isPendurado = !row.isSuspended && row.yellowAccumulator >= 2;
        }
      });

      // Also add players who have no card events but are suspended/pendurado from DB
      allPlayers.forEach(p => {
        if (!cardMap.has(p.id) && (p.is_suspended || (p.yellow_card_accumulator ?? 0) >= 2)) {
          const team = teamsMap.get(p.team_id);
          cardMap.set(p.id, {
            playerId: p.id,
            playerName: p.name,
            playerNumber: p.number,
            teamName: team?.short_name || '',
            teamLogo: team?.logo_url || '',
            yellows: p.total_yellow_cards ?? 0,
            reds: p.total_red_cards ?? 0,
            isSuspended: p.is_suspended ?? false,
            isPendurado: !p.is_suspended && (p.yellow_card_accumulator ?? 0) >= 2,
            yellowAccumulator: p.yellow_card_accumulator ?? 0,
          });
        }
      });

      const sortedCards = Array.from(cardMap.values()).sort((a, b) => {
        const scoreA = a.yellows * 10 + a.reds * 50;
        const scoreB = b.yellows * 10 + b.reds * 50;
        return scoreB - scoreA;
      });
      setPlayerCards(sortedCards);

      // Fair Play table: Art.79 scoring - amarelo = 10pts, vermelho = 50pts
      const fpMap = new Map<string, FairPlayRow>();
      teams.forEach(t => {
        const dbDiscipline = t.discipline_points;
        fpMap.set(t.id, {
          team: t,
          yellows: t.total_yellow_cards ?? 0,
          reds: t.total_red_cards ?? 0,
          score: dbDiscipline ?? 0,
        });
      });

      // Compute from events if DB doesn't have discipline_points
      events
        .filter(e => ['yellow_card', 'red_card'].includes(e.event_type))
        .forEach(ev => {
          const fp = fpMap.get(ev.team_id);
          if (!fp) return;
          if (ev.event_type === 'yellow_card') fp.yellows++;
          else fp.reds++;
        });

      // Recalculate score from events if team doesn't have discipline_points from DB
      fpMap.forEach((fp) => {
        if (fp.team.discipline_points == null) {
          fp.score = fp.yellows * 10 + fp.reds * 50;
        }
      });

      const sortedFP = Array.from(fpMap.values()).sort((a, b) => a.score - b.score);
      setFairPlay(sortedFP);
      setLoading(false);
    }
    load();
  }, []);

  const suspendedPlayers = playerCards.filter(p => p.isSuspended);
  const penduradoPlayers = playerCards.filter(p => p.isPendurado);

  return (
    <PremiumPageGate>
      <PageTransition>
      <div className="px-4 py-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="flex items-center gap-2 mb-5">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            Cartões &amp; Fair Play
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-0.5 mb-5">
          <button
            onClick={() => setTab('players')}
            className={`flex-1 py-2 rounded-md text-xs font-semibold transition-colors ${
              tab === 'players' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Jogadores
          </button>
          <button
            onClick={() => setTab('pendurados')}
            className={`flex-1 py-2 rounded-md text-xs font-semibold transition-colors relative ${
              tab === 'pendurados' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Situação
            {(suspendedPlayers.length + penduradoPlayers.length) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 text-white text-[8px] font-bold flex items-center justify-center">
                {suspendedPlayers.length + penduradoPlayers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('fairplay')}
            className={`flex-1 py-2 rounded-md text-xs font-semibold transition-colors ${
              tab === 'fairplay' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Fair Play
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'players' ? (
          playerCards.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">Nenhum cartão registrado</p>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_40px_40px] gap-0 px-4 py-2 border-b border-border text-[10px] text-muted-foreground font-semibold"
                style={{ fontFamily: 'var(--font-heading)' }}>
                <span>Jogador</span>
                <span className="text-center">CA</span>
                <span className="text-center">CV</span>
              </div>
              {playerCards.filter(pc => pc.yellows > 0 || pc.reds > 0).map((pc, idx, arr) => (
                <button
                  key={pc.playerId}
                  onClick={() => navigate(`/jogador/${pc.playerId}`)}
                  className={`w-full grid grid-cols-[1fr_40px_40px] gap-0 px-4 py-2.5 items-center hover:bg-muted transition-colors ${
                    idx < arr.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <TeamLogo url={pc.teamLogo} name={pc.teamName} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-foreground truncate">{pc.playerName}</span>
                        {pc.isSuspended && (
                          <span className="text-[7px] bg-red-500/20 text-red-500 px-1 py-0 rounded font-bold shrink-0">SUSP</span>
                        )}
                        {pc.isPendurado && (
                          <span className="text-[7px] bg-yellow-500/20 text-yellow-600 px-1 py-0 rounded font-bold shrink-0">PEND</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{pc.teamName}</p>
                    </div>
                  </div>
                  <span className="text-center text-sm font-bold text-yellow-600" style={{ fontFamily: 'var(--font-mono)' }}>
                    {pc.yellows || '-'}
                  </span>
                  <span className="text-center text-sm font-bold text-red-500" style={{ fontFamily: 'var(--font-mono)' }}>
                    {pc.reds || '-'}
                  </span>
                </button>
              ))}
            </div>
          )
        ) : tab === 'pendurados' ? (
          <div className="space-y-5">
            {/* Suspended players */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Ban className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  Suspensos
                </h3>
                <span className="text-[10px] text-muted-foreground ml-auto">{suspendedPlayers.length} jogadores</span>
              </div>
              {suspendedPlayers.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm bg-card rounded-xl border border-border">
                  Nenhum jogador suspenso
                </p>
              ) : (
                <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
                  {suspendedPlayers.map(pc => (
                    <button
                      key={pc.playerId}
                      onClick={() => navigate(`/jogador/${pc.playerId}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
                    >
                      <TeamLogo url={pc.teamLogo} name={pc.teamName} />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs text-foreground font-semibold truncate">{pc.playerName}</p>
                        <p className="text-[10px] text-muted-foreground">{pc.teamName}</p>
                      </div>
                      <span className="text-[8px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded font-bold">SUSPENSO</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pendurado players */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <h3 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  Pendurados (2 CA)
                </h3>
                <span className="text-[10px] text-muted-foreground ml-auto">{penduradoPlayers.length} jogadores</span>
              </div>
              {penduradoPlayers.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm bg-card rounded-xl border border-border">
                  Nenhum jogador pendurado
                </p>
              ) : (
                <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
                  {penduradoPlayers.map(pc => (
                    <button
                      key={pc.playerId}
                      onClick={() => navigate(`/jogador/${pc.playerId}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
                    >
                      <TeamLogo url={pc.teamLogo} name={pc.teamName} />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs text-foreground font-semibold truncate">{pc.playerName}</p>
                        <p className="text-[10px] text-muted-foreground">{pc.teamName} &middot; {pc.yellowAccumulator} CA acumulados</p>
                      </div>
                      <span className="text-[8px] bg-yellow-500/20 text-yellow-600 px-1.5 py-0.5 rounded font-bold">PENDURADO</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[9px] text-subtle text-center mt-2">
              Art.79: Jogador com 3 cartões amarelos acumulados cumpre suspensão automática.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {fairPlay.map((fp, idx) => {
              const isBest = idx === 0;
              const isWorst = idx === fairPlay.length - 1 && fairPlay.length > 1;
              return (
                <div
                  key={fp.team.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    isBest ? 'border-green-500/30 bg-green-500/5' : isWorst ? 'border-red-500/20 bg-red-500/5' : 'border-border bg-card'
                  }`}
                >
                  <span className={`w-6 text-center text-sm font-bold ${isBest ? 'text-green-600' : isWorst ? 'text-red-500' : 'text-subtle'}`}
                    style={{ fontFamily: 'var(--font-mono)' }}>
                    {idx + 1}
                  </span>
                  <TeamLogo url={fp.team.logo_url} name={fp.team.short_name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-semibold truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                      {fp.team.short_name}
                    </p>
                    <div className="h-1 rounded-full bg-secondary mt-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${fp.score > 1500 ? 'bg-red-500' : fp.score > 1000 ? 'bg-yellow-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min((fp.score / 2000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className={`text-sm font-bold ${fp.score > 1500 ? 'text-red-500' : 'text-foreground'}`}
                      style={{ fontFamily: 'var(--font-mono)' }}>
                      {fp.score}
                    </span>
                    <div className="flex items-center gap-2 text-[9px]">
                      <span className="text-yellow-600" style={{ fontFamily: 'var(--font-mono)' }}>{fp.yellows} CA</span>
                      <span className="text-red-500" style={{ fontFamily: 'var(--font-mono)' }}>{fp.reds} CV</span>
                    </div>
                  </div>
                  {isBest && (
                    <Shield className="w-4 h-4 text-primary shrink-0" />
                  )}
                </div>
              );
            })}
            <p className="text-[9px] text-subtle text-center mt-2">
              Art.79 &mdash; Pontuação: CA = 10pts | CV = 50pts
            </p>
          </div>
        )}
      </div>
      </PageTransition>
    </PremiumPageGate>
  );
}