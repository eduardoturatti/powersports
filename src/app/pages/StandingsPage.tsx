import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { fetchMatches, fetchTeams, calculateStandings, fetchAllEvents, type StandingRow } from '../lib/supabase';
import { PageTransition } from '../components/PageTransition';

const GRID_COLS = 'grid-cols-[16px_1fr_22px_18px_18px_18px_18px_24px_20px_24px_42px]';

function FormDots({ form }: { form: ('W' | 'D' | 'L')[] }) {
  const colors = { W: 'bg-green-500', D: 'bg-yellow-500', L: 'bg-red-500' };
  return (
    <div className="flex gap-px">
      {form.map((r, i) => (
        <div key={i} className={`w-[6px] h-[6px] rounded-full ${colors[r]}`} />
      ))}
      {Array.from({ length: Math.max(0, 5 - form.length) }).map((_, i) => (
        <div key={`e-${i}`} className="w-[6px] h-[6px] rounded-full bg-muted" />
      ))}
    </div>
  );
}

function TeamLogo({ url, name }: { url?: string; name: string }) {
  const [error, setError] = useState(false);
  if (!url || error) {
    return (
      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[7px] font-bold text-foreground shrink-0"
        style={{ fontFamily: 'var(--font-heading)' }}>
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return <img src={url} alt={name} onError={() => setError(true)} className="w-5 h-5 object-contain shrink-0" />;
}

export function StandingsPage() {
  const navigate = useNavigate();
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [matchesData, teamsData, eventsData] = await Promise.all([
        fetchMatches(),
        fetchTeams(),
        fetchAllEvents(),
      ]);
      const calculated = calculateStandings(matchesData, teamsData, eventsData);
      setStandings(calculated);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground">Carregando classificação...</p>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="px-3 py-4">
        <h2 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          Classificação
        </h2>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {/* Header */}
          <div className={`grid ${GRID_COLS} gap-0 px-2 py-2 border-b border-border text-[9px] text-muted-foreground font-semibold`}
            style={{ fontFamily: 'var(--font-heading)' }}>
            <span className="text-center">#</span>
            <span className="pl-1">Time</span>
            <span className="text-center">P</span>
            <span className="text-center">J</span>
            <span className="text-center">V</span>
            <span className="text-center">E</span>
            <span className="text-center">D</span>
            <span className="text-center">SG</span>
            <span className="text-center">GP</span>
            <span className="text-center">DC</span>
            <span className="text-center">Forma</span>
          </div>

          {/* Rows */}
          {standings.map((row, idx) => {
            const pos = idx + 1;
            const isQualified = pos <= 4;
            const isEliminated = pos >= 5;

            return (
              <div
                key={row.team.id}
                className={`grid ${GRID_COLS} gap-0 px-2 py-2 items-center transition-colors cursor-pointer hover:bg-muted active:scale-[0.99] ${
                  idx < standings.length - 1 ? 'border-b border-border' : ''
                }`}
                onClick={() => navigate(`/time/${row.team.slug || row.team.id}`)}
              >
                <span className={`text-center text-[10px] font-bold ${
                  isQualified ? 'text-primary' : isEliminated ? 'text-destructive' : 'text-muted-foreground'
                }`} style={{ fontFamily: 'var(--font-mono)' }}>
                  {pos}
                </span>

                <div className="flex items-center gap-1.5 min-w-0 pl-1">
                  <TeamLogo url={row.team.logo_url} name={row.team.short_name} />
                  <span className="text-[11px] font-bold text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                    {row.team.name}
                  </span>
                </div>

                <span className="text-center text-[11px] font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                  {row.points}
                </span>
                <span className="text-center text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                  {row.played}
                </span>
                <span className="text-center text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                  {row.wins}
                </span>
                <span className="text-center text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                  {row.draws}
                </span>
                <span className="text-center text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                  {row.losses}
                </span>
                <span className={`text-center text-[10px] font-semibold ${
                  row.goalDifference > 0 ? 'text-green-600' : row.goalDifference < 0 ? 'text-red-500' : 'text-muted-foreground'
                }`} style={{ fontFamily: 'var(--font-mono)' }}>
                  {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                </span>
                <span className="text-center text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                  {row.goalsFor}
                </span>

                <span className={`text-center text-[10px] font-semibold ${
                  row.discipline > 0 ? 'text-yellow-600' : 'text-muted-foreground'
                }`} style={{ fontFamily: 'var(--font-mono)' }}>
                  {row.discipline}
                </span>

                <div className="flex justify-center">
                  <FormDots form={row.form} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] text-muted-foreground">Semifinal (1º–4º)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-muted-foreground">Eliminado (5º–7º)</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 px-1">
          <span className="text-[10px] text-muted-foreground font-medium" style={{ fontFamily: 'var(--font-heading)' }}>Forma:</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-[10px] text-muted-foreground">V</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" /><span className="text-[10px] text-muted-foreground">E</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[10px] text-muted-foreground">D</span>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
