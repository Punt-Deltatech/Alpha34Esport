import { apiClient } from '../lib/apiClient';
import type { ApiSuccess, Account, Payout, PrizePlace } from '../types/api';

// Module 9: Prize Management

export async function listAccounts(): Promise<Account[]> {
  const res = await apiClient.get<ApiSuccess<Account[]>>('/accounts');
  return res.data.data;
}

export async function listPrizePlaces(): Promise<PrizePlace[]> {
  const res = await apiClient.get<ApiSuccess<PrizePlace[]>>('/prize-places');
  return res.data.data;
}

export async function listPayouts(teamId?: string): Promise<Payout[]> {
  const res = await apiClient.get<ApiSuccess<Payout[]>>('/payouts', { params: teamId ? { team_id: teamId } : undefined });
  return res.data.data;
}

export async function createPayout(payload: { prize_place_id: string; team_id?: string; amount: number }): Promise<Payout> {
  const res = await apiClient.post<ApiSuccess<Payout>>('/payouts', payload);
  return res.data.data;
}

export async function updatePayoutStatus(id: string, status: Payout['status']): Promise<Payout> {
  const res = await apiClient.put<ApiSuccess<Payout>>(`/payouts/${id}/status`, { status });
  return res.data.data;
}

export async function attachPayoutEvidence(id: string, fileUrl: string, fileType?: string) {
  const res = await apiClient.post(`/payouts/${id}/evidence`, { file_url: fileUrl, file_type: fileType ?? '' });
  return res.data.data;
}
