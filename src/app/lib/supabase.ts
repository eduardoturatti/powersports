import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

// Singleton: prevent multiple GoTrueClient instances during HMR
const GLOBAL_KEY = '__arena_supabase__' as const;

function getClient(): SupabaseClient {
  const g = globalThis as any;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = createClient(supabaseUrl, publicAnonKey, {
      auth: {
        detectSessionInUrl: true,
        autoRefreshToken: true,
        persistSession: true,
        flowType: 'implicit',
      },
    });
  }
  return g[GLOBAL_KEY];
}

export const supabase = getClient();

export const COMPETITION_ID = '00000000-0000-0000-0001-000000000001';

// Types
export interface Team {
  id: string;
  name: string;
  short_name: string;
  slug: string;
  color: string;
  color_detail: string;
  text_color: string;
  logo_url: string;
  coach: string;
  default_tactic: string;
  city: string;
  stadium: string;
  // Extended fields
  founded_year?: number;
  president?: string;
  colors_description?: string;
  photo_url?: string;
  discipline_points?: number;
  total_goals_scored?: number;
  total_goals_conceded?: number;
  total_yellow_cards?: number;
  total_red_cards?: number;
  total_wins?: number;
  total_draws?: number;
  total_losses?: number;
}

export interface Player {
  id: string;
  team_id: string;
  name: string;
  number: string;
  position: string;
  photo_url: string;
  stats: Record<string, unknown>;
  team?: Team;
  // Extended fields
  birth_date?: string;
  height_cm?: number;
  weight_kg?: number;
  dominant_foot?: string;
  nationality?: string;
  total_games?: number;
  total_goals?: number;
  total_assists?: number;
  total_yellow_cards?: number;
  total_red_cards?: number;
  total_minutes?: number;
  avg_rating?: number;
  is_suspended?: boolean;
  suspension_until?: string;
  yellow_card_accumulator?: number;
}

export interface Match {
  id: string;
  competition_id: string;
  home_team_id: string;
  away_team_id: string;
  round_name: string;
  round_number: number;
  title: string;
  match_date: string;
  location: string;
  score_home: number | null;
  score_away: number | null;
  previous_score_home: string | null;
  previous_score_away: string | null;
  status: string;
  broadcast: boolean;
  extra_data: Record<string, unknown>;
  home_team?: Team;
  away_team?: Team;
  // Extended fields
  referee?: string;
  assistant_referee_1?: string;
  assistant_referee_2?: string;
  attendance?: number;
  mvp_player_id?: string;
  notes?: string;
  stoppage_time_1st?: number;
  stoppage_time_2nd?: number;
  penalty_score_home?: number;
  penalty_score_away?: number;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  team_id: string;
  player_id: string;
  event_type: string;
  minute: number;
  half: string;
  detail: Record<string, unknown>;
  created_at: string;
  player?: { name: string; number: string };
  team?: { short_name: string };
}

export interface MatchLineup {
  id: string;
  match_id: string;
  team_id: string;
  player_id: string;
  is_starter: boolean;
  lineup_position: number;
  player?: Player;
}

export interface StandingRow {
  team: Team;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  yellowCards: number;
  redCards: number;
  discipline: number; // yellow*1 + red*3 — lower is better
  form: ('W' | 'D' | 'L')[];
}

export interface MatchTeamStats {
  id: string;
  match_id: string;
  team_id: string;
  possession_pct?: number;
  passes_total?: number;
  passes_completed?: number;
  shots_total?: number;
  shots_on_target?: number;
  shots_off_target?: number;
  shots_blocked?: number;
  saves?: number;
  fouls_committed?: number;
  fouls_suffered?: number;
  offsides?: number;
  corners?: number;
  yellow_cards?: number;
  red_cards?: number;
}

export interface MatchPlayerStats {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  minutes_played?: number;
  is_starter?: boolean;
  goals?: number;
  assists?: number;
  shots?: number;
  shots_on_target?: number;
  yellow_cards?: number;
  red_cards?: number;
  saves?: number;
  goals_conceded?: number;
  clean_sheet?: boolean;
  rating?: number;
  is_mvp?: boolean;
  player?: { name: string; number: string; position: string; photo_url: string };
}

// API Functions
export async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('competition_teams')
    .select('team_id, teams(*)')
    .eq('competition_id', COMPETITION_ID);

  if (error) {
    console.error('[Arena] Error fetching teams via competition_teams:', error);
    const { data: allTeams, error: fallbackError } = await supabase
      .from('teams')
      .select('*')
      .order('name');

    if (fallbackError) { console.error('[Arena] Fallback teams fetch also failed:', fallbackError); return []; }
    console.log('[Arena] Fallback fetched', (allTeams || []).length, 'teams directly');
    return allTeams || [];
  }

  const teams = (data || []).map((ct: any) => ct.teams).filter(Boolean);
  console.log('[Arena] Fetched', teams.length, 'teams via competition_teams');
  return teams;
}

export async function fetchTeamBySlug(slug: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) { console.error('[Arena] Error fetching team by slug:', error); return null; }
  return data;
}

export async function fetchTeamById(id: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) { console.error('[Arena] Error fetching team by id:', error); return null; }
  return data;
}

export async function fetchPlayersByTeam(teamId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', teamId)
    .order('number');

  if (error) { console.error('[Arena] Error fetching players for team', teamId, ':', error); return []; }
  console.log('[Arena] Fetched', (data || []).length, 'players for team', teamId);
  return data || [];
}

export async function fetchPlayerById(playerId: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*, team:teams(*)')
    .eq('id', playerId)
    .maybeSingle();

  if (error) {
    console.error('[Arena] Error fetching player with team join:', error);
    const { data: rawPlayer, error: rawErr } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .maybeSingle();

    if (rawErr || !rawPlayer) { console.error('[Arena] Fallback player fetch failed:', rawErr); return null; }

    const { data: team } = await supabase.from('teams').select('*').eq('id', rawPlayer.team_id).maybeSingle();
    return { ...rawPlayer, team: team || undefined };
  }
  return data;
}

export async function fetchMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*, home_team:teams!home_team_id(id, name, short_name, slug, logo_url, color, color_detail, text_color), away_team:teams!away_team_id(id, name, short_name, slug, logo_url, color, color_detail, text_color)')
    .eq('competition_id', COMPETITION_ID)
    .order('match_date', { ascending: true });

  if (error) {
    console.error('[Arena] Error fetching matches with FK joins:', error);
    const { data: rawMatches, error: rawError } = await supabase
      .from('matches')
      .select('*')
      .eq('competition_id', COMPETITION_ID)
      .order('match_date', { ascending: true });

    if (rawError) { console.error('[Arena] Fallback raw matches fetch failed:', rawError); return []; }
    if (!rawMatches || rawMatches.length === 0) return [];

    const teamIds = [...new Set(rawMatches.flatMap(m => [m.home_team_id, m.away_team_id]))];
    const { data: teamsData } = await supabase.from('teams').select('*').in('id', teamIds);
    const teamsMap = new Map((teamsData || []).map((t: any) => [t.id, t]));

    return rawMatches.map((m: any) => ({
      ...m,
      home_team: teamsMap.get(m.home_team_id) || null,
      away_team: teamsMap.get(m.away_team_id) || null,
    }));
  }
  console.log('[Arena] Fetched', (data || []).length, 'matches with team joins');
  return data || [];
}

export async function fetchMatchById(matchId: string): Promise<Match | null> {
  const { data, error } = await supabase
    .from('matches')
    .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
    .eq('id', matchId)
    .maybeSingle();

  if (error) {
    console.error('[Arena] Error fetching match by id with joins:', error);
    const { data: rawMatch, error: rawError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .maybeSingle();

    if (rawError || !rawMatch) { console.error('[Arena] Fallback match fetch failed:', rawError); return null; }

    const { data: homeTeam } = await supabase.from('teams').select('*').eq('id', rawMatch.home_team_id).maybeSingle();
    const { data: awayTeam } = await supabase.from('teams').select('*').eq('id', rawMatch.away_team_id).maybeSingle();

    return { ...rawMatch, home_team: homeTeam, away_team: awayTeam };
  }
  return data;
}

export async function fetchMatchEvents(matchId: string): Promise<MatchEvent[]> {
  const { data, error } = await supabase
    .from('match_events')
    .select('*, player:players(name, number), team:teams(short_name)')
    .eq('match_id', matchId)
    .order('minute', { ascending: true });

  if (error) {
    console.error('[Arena] Error fetching events with joins:', error);
    const { data: rawEvents, error: rawErr } = await supabase
      .from('match_events')
      .select('*')
      .eq('match_id', matchId)
      .order('minute', { ascending: true });

    if (rawErr) { console.error('[Arena] Fallback events fetch failed:', rawErr); return []; }
    return rawEvents || [];
  }
  return data || [];
}

export async function fetchMatchLineups(matchId: string): Promise<MatchLineup[]> {
  const { data, error } = await supabase
    .from('match_lineups')
    .select('*, player:players(id, name, number, position, photo_url, team_id)')
    .eq('match_id', matchId)
    .order('lineup_position', { ascending: true });

  if (error) {
    console.error('[Arena] Error fetching lineups with joins:', error);
    const { data: rawLineups, error: rawErr } = await supabase
      .from('match_lineups')
      .select('*')
      .eq('match_id', matchId)
      .order('lineup_position', { ascending: true });

    if (rawErr) { console.error('[Arena] Fallback lineups fetch failed:', rawErr); return []; }
    return rawLineups || [];
  }
  return data || [];
}

export async function fetchAllEvents(): Promise<MatchEvent[]> {
  const { data: matches, error: matchErr } = await supabase
    .from('matches')
    .select('id')
    .eq('competition_id', COMPETITION_ID);

  if (matchErr) { console.error('[Arena] Error fetching match IDs for events:', matchErr); return []; }
  if (!matches || matches.length === 0) return [];

  const matchIds = matches.map(m => m.id);

  const { data, error } = await supabase
    .from('match_events')
    .select('*, player:players(id, name, number, team_id, photo_url, position), team:teams(short_name, logo_url, name)')
    .in('match_id', matchIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Arena] Error fetching all events with joins:', error);
    const { data: rawEvents, error: rawErr } = await supabase
      .from('match_events')
      .select('*')
      .in('match_id', matchIds)
      .order('created_at', { ascending: false });

    if (rawErr) { console.error('[Arena] Fallback all events fetch failed:', rawErr); return []; }
    return rawEvents || [];
  }
  console.log('[Arena] Fetched', (data || []).length, 'total events across', matchIds.length, 'matches');
  return data || [];
}

export function calculateStandings(matches: Match[], teams: Team[], events?: MatchEvent[]): StandingRow[] {
  const standingsMap = new Map<string, StandingRow>();

  teams.forEach(team => {
    standingsMap.set(team.id, {
      team,
      points: 0, played: 0, wins: 0, draws: 0, losses: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0, yellowCards: 0, redCards: 0, discipline: 0, form: [],
    });
  });

  const finishedMatches = matches
    .filter(m => m.status === 'finished' && m.score_home !== null && m.score_away !== null)
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());

  finishedMatches.forEach(match => {
    const home = standingsMap.get(match.home_team_id);
    const away = standingsMap.get(match.away_team_id);
    if (!home || !away) return;

    const sh = match.score_home!;
    const sa = match.score_away!;

    home.played++; away.played++;
    home.goalsFor += sh; home.goalsAgainst += sa;
    away.goalsFor += sa; away.goalsAgainst += sh;

    if (sh > sa) {
      home.wins++; home.points += 3; away.losses++;
      home.form.push('W'); away.form.push('L');
    } else if (sh < sa) {
      away.wins++; away.points += 3; home.losses++;
      home.form.push('L'); away.form.push('W');
    } else {
      home.draws++; away.draws++; home.points += 1; away.points += 1;
      home.form.push('D'); away.form.push('D');
    }
  });

  // Count cards from events if provided
  if (events && events.length > 0) {
    events.forEach(ev => {
      const type = (ev.event_type || '').toLowerCase();
      const row = standingsMap.get(ev.team_id);
      if (!row) return;
      if (type === 'yellow_card' || type === 'yellowcard' || type === 'cartao_amarelo') {
        row.yellowCards++;
      } else if (type === 'red_card' || type === 'redcard' || type === 'cartao_vermelho') {
        row.redCards++;
      }
    });
  }

  const standings = Array.from(standingsMap.values());
  standings.forEach(s => {
    s.goalDifference = s.goalsFor - s.goalsAgainst;
    // Use discipline_points from DB if available, otherwise calculate from events
    if (s.team.discipline_points !== undefined && s.team.discipline_points !== null) {
      s.discipline = s.team.discipline_points;
    } else {
      s.discipline = s.yellowCards + s.redCards * 3;
    }
    s.form = s.form.slice(-5);
  });

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    // Discipline: lower is better (fewer cards) — comes right after points per official rules
    if (a.discipline !== b.discipline) return a.discipline - b.discipline;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return 0;
  });

  return standings;
}

export async function fetchMatchTeamStats(matchId: string): Promise<MatchTeamStats[]> {
  const { data, error } = await supabase
    .from('match_team_stats')
    .select('*')
    .eq('match_id', matchId);
  if (error) { console.error('[Arena] Error fetching match team stats:', error); return []; }
  return data || [];
}

export async function fetchMatchPlayerStats(matchId: string): Promise<MatchPlayerStats[]> {
  const { data, error } = await supabase
    .from('match_player_stats')
    .select('*, player:players(name, number, position, photo_url)')
    .eq('match_id', matchId);
  if (error) { console.error('[Arena] Error fetching match player stats:', error); return []; }
  return data || [];
}

export async function fetchAllPlayers(): Promise<Player[]> {
  const { data: ctData, error: ctError } = await supabase
    .from('competition_teams')
    .select('team_id')
    .eq('competition_id', COMPETITION_ID);

  if (ctError || !ctData || ctData.length === 0) {
    console.error('[Arena] Error fetching competition teams for players:', ctError);
    const { data, error } = await supabase.from('players').select('*, team:teams(*)').order('name');
    if (error) { console.error('[Arena] Fallback fetchAllPlayers failed:', error); return []; }
    return data || [];
  }

  const teamIds = ctData.map(ct => ct.team_id);
  const { data, error } = await supabase
    .from('players')
    .select('*, team:teams(*)')
    .in('team_id', teamIds)
    .order('name');

  if (error) { console.error('[Arena] Error fetching all players:', error); return []; }
  console.log('[Arena] Fetched', (data || []).length, 'players across', teamIds.length, 'teams');
  return data || [];
}