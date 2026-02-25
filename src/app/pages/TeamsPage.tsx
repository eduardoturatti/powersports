import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { fetchTeams, type Team } from '../lib/supabase';
import { Users } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';

function TeamCard({ team, onClick }: { team: Team; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-all active:scale-95"
      style={{
        background: team.color
          ? `linear-gradient(135deg, ${team.color}10, transparent 70%)`
          : undefined,
      }}
    >
      {team.logo_url && !imgError ? (
        <img
          src={team.logo_url}
          alt={team.name}
          onError={() => setImgError(true)}
          className="w-16 h-16 object-contain"
        />
      ) : (
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ background: team.color || '#374151', fontFamily: 'var(--font-heading)' }}
        >
          {team.short_name.slice(0, 3)}
        </div>
      )}
      <div className="text-center">
        <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          {team.short_name}
        </p>
        {team.coach && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Tec. {team.coach}
          </p>
        )}
      </div>
    </button>
  );
}

export function TeamsPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchTeams();
      setTeams(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground">Carregando times...</p>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="px-4 py-4">
      <div className="flex items-center gap-2 mb-5">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          Times
        </h2>
        <span className="text-xs text-muted-foreground ml-auto">{teams.length} equipes</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            onClick={() => navigate(`/time/${team.slug || team.id}`)}
          />
        ))}
      </div>
    </div>
    </PageTransition>
  );
}