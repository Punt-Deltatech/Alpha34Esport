import { apiClient } from '../lib/apiClient';
import type { ApiSuccess, Tournament, TournamentHistory } from '../types/api';

// Module 3: Tournament Management

export interface CreateTournamentPayload {
  tournament_name: string;
  start_date: string;
  end_date: string;
  banner_url?: string;
  game: string;
  detail: {
    max_team: number;
    register_deadline: string;
    prize_pool: number;
    description: string;
    format: string;
    require_attachment: boolean;
    organizer: string;
  };
}

export async function listTournaments(): Promise<Tournament[]> {
  const res = await apiClient.get<ApiSuccess<Tournament[]>>('/tournaments');
  return res.data.data;
}

export async function getTournament(id: string): Promise<Tournament> {
  const res = await apiClient.get<ApiSuccess<Tournament>>(`/tournaments/${id}`);
  return res.data.data;
}

export async function createTournament(payload: CreateTournamentPayload): Promise<Tournament> {
  const res = await apiClient.post<ApiSuccess<Tournament>>('/tournaments', payload);
  return res.data.data;
}

export async function updateTournament(id: string, payload: Partial<Tournament>): Promise<Tournament> {
  const res = await apiClient.put<ApiSuccess<Tournament>>(`/tournaments/${id}`, payload);
  return res.data.data;
}

export async function deleteTournament(id: string): Promise<void> {
  await apiClient.delete(`/tournaments/${id}`);
}

export async function getTournamentHistory(id: string): Promise<TournamentHistory[]> {
  const res = await apiClient.get<ApiSuccess<TournamentHistory[]>>(`/tournaments/${id}/history`);
  return res.data.data;
}

export async function generateBracket(tournamentId: string) {
  const res = await apiClient.post(`/tournaments/${tournamentId}/matches/generate-bracket`);
  return res.data.data;
}
