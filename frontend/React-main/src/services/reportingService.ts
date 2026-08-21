import { apiClient } from '../lib/apiClient';
import type { ApiSuccess, DashboardStats, FinancialSummary } from '../types/api';

// Module 11: Reporting (Admin/Organizer only, per RequireRole on the backend)

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await apiClient.get<ApiSuccess<DashboardStats>>('/reporting/dashboard');
  return res.data.data;
}

export async function getFinancialSummary(tournamentId: string) {
  const res = await apiClient.get<
    ApiSuccess<{ summary: FinancialSummary; expenses: { category: string; amount: number }[]; income: { category: string; amount: number }[] }>
  >(`/tournaments/${tournamentId}/financial-summary`);
  return res.data.data;
}
