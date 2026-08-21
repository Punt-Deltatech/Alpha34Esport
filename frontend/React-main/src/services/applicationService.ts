import { apiClient } from '../lib/apiClient';
import type { ApiSuccess, Application, Referee, ReviewLog, WhitelistTeam } from '../types/api';

// Module 5: Registration & Screening

export interface SubmitApplicationPayload {
  tournament_id: string;
  team_id: string;
  document_url?: string; // path returned by uploadService.uploadFile(), if the tournament requires one
}

export async function submitApplication(payload: SubmitApplicationPayload): Promise<Application> {
  const res = await apiClient.post<ApiSuccess<Application>>('/applications', payload);
  return res.data.data;
}

export async function getApplication(id: string): Promise<Application> {
  const res = await apiClient.get<ApiSuccess<Application>>(`/applications/${id}`);
  return res.data.data;
}

export async function listApplicationsForTournament(tournamentId: string): Promise<Application[]> {
  const res = await apiClient.get<ApiSuccess<Application[]>>(`/tournaments/${tournamentId}/applications`);
  return res.data.data;
}

// A team's own applications across all tournaments (any authenticated user can call this for
// their own team — unlike listApplicationsForTournament, which is screener/admin-only).
export async function listApplicationsForTeam(teamId: string): Promise<Application[]> {
  const res = await apiClient.get<ApiSuccess<Application[]>>(`/teams/${teamId}/applications`);
  return res.data.data;
}

// Referee/Organizer/Admin only. Approving creates the WhitelistTeam slot on the backend.
export async function reviewApplication(
  id: string,
  action: 'Approved' | 'Rejected',
  screenerNote?: string,
): Promise<Application> {
  const res = await apiClient.put<ApiSuccess<Application>>(`/applications/${id}/review`, {
    action,
    screener_note: screenerNote ?? '',
  });
  return res.data.data;
}

export async function listReferees(): Promise<Referee[]> {
  const res = await apiClient.get<ApiSuccess<Referee[]>>('/referees');
  return res.data.data;
}

export async function listWhitelistTeams(): Promise<WhitelistTeam[]> {
  const res = await apiClient.get<ApiSuccess<WhitelistTeam[]>>('/whitelist-teams');
  return res.data.data;
}

export async function listWhitelistForTournament(tournamentId: string): Promise<WhitelistTeam[]> {
  const res = await apiClient.get<ApiSuccess<WhitelistTeam[]>>(`/tournaments/${tournamentId}/whitelist-teams`);
  return res.data.data;
}

export async function listReviewLogsForTournament(tournamentId: string): Promise<ReviewLog[]> {
  const res = await apiClient.get<ApiSuccess<ReviewLog[]>>(`/tournaments/${tournamentId}/review-logs`);
  return res.data.data;
}
