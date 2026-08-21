import { apiClient } from '../lib/apiClient';
import type { ApiSuccess, CheatingReport, Match, MatchResult } from '../types/api';

// Module 6: Scheduling + Module 8: Match Results

export async function listMatchesForTournament(tournamentId: string): Promise<Match[]> {
  const res = await apiClient.get<ApiSuccess<Match[]>>(`/tournaments/${tournamentId}/matches`);
  return res.data.data;
}

export async function getMatch(id: string): Promise<Match> {
  const res = await apiClient.get<ApiSuccess<Match>>(`/matches/${id}`);
  return res.data.data;
}

export interface SubmitMatchResultPayload {
  match_id: string;
  winner_team_id: string;
  score_team1: number;
  score_team2: number;
  submitted_by?: string;
  proof_image_url?: string;
}

// Marks the Match finished and auto-advances the winner into the next round's Match.
export async function submitMatchResult(payload: SubmitMatchResultPayload): Promise<MatchResult> {
  const res = await apiClient.post<ApiSuccess<MatchResult>>('/match-results', payload);
  return res.data.data;
}

export async function getMatchResult(matchId: string): Promise<MatchResult> {
  const res = await apiClient.get<ApiSuccess<MatchResult>>(`/match-results/${matchId}`);
  return res.data.data;
}

export async function submitCheatingReport(payload: {
  issue_type: string;
  description?: string;
  team_ids: string[];
}): Promise<CheatingReport> {
  const res = await apiClient.post<ApiSuccess<CheatingReport>>('/cheating-reports', payload);
  return res.data.data;
}

export async function listCheatingReports(): Promise<CheatingReport[]> {
  const res = await apiClient.get<ApiSuccess<CheatingReport[]>>('/cheating-reports');
  return res.data.data;
}
