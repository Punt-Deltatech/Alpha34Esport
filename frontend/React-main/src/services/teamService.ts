import { apiClient } from '../lib/apiClient';
import type { ApiSuccess, Team, TeamMember } from '../types/api';

// Module 4: Team & Member Management (Module 7: Coordination reuses these same endpoints)

export interface CreateTeamPayload {
  team_name: string;
  logo_url?: string;
  max_member?: number;
  social_url?: string;
  game?: string;
  description?: string;
}

export interface AddMemberPayload {
  profile_id: string;
  fullname?: string;
  game_uid?: string;
  role?: 'starter' | 'substitute';
  phone?: string;
  position?: 'captain' | 'member';
  social_contact?: string;
  avatar?: string;
}

export async function listTeams(): Promise<Team[]> {
  const res = await apiClient.get<ApiSuccess<Team[]>>('/teams');
  return res.data.data;
}

export async function getTeam(id: string): Promise<Team> {
  const res = await apiClient.get<ApiSuccess<Team>>(`/teams/${id}`);
  return res.data.data;
}

// Creating a team also enrolls the caller as its captain (see TeamController.Create on the backend).
export async function createTeam(payload: CreateTeamPayload): Promise<Team> {
  const res = await apiClient.post<ApiSuccess<Team>>('/teams', payload);
  return res.data.data;
}

export async function updateTeam(id: string, payload: Partial<Team>): Promise<Team> {
  const res = await apiClient.put<ApiSuccess<Team>>(`/teams/${id}`, payload);
  return res.data.data;
}

export async function deleteTeam(id: string): Promise<void> {
  await apiClient.delete(`/teams/${id}`);
}

export async function addTeamMember(teamId: string, payload: AddMemberPayload): Promise<TeamMember> {
  const res = await apiClient.post<ApiSuccess<TeamMember>>(`/teams/${teamId}/members`, payload);
  return res.data.data;
}

export async function updateTeamMember(
  teamId: string,
  memberId: string,
  payload: Partial<Pick<TeamMember, 'role' | 'position' | 'status'>>,
): Promise<TeamMember> {
  const res = await apiClient.put<ApiSuccess<TeamMember>>(`/teams/${teamId}/members/${memberId}`, payload);
  return res.data.data;
}

export async function removeTeamMember(teamId: string, memberId: string): Promise<void> {
  await apiClient.delete(`/teams/${teamId}/members/${memberId}`);
}
