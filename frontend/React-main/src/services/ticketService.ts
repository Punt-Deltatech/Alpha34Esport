import { apiClient } from '../lib/apiClient';
import type { ApiSuccess, Ticket } from '../types/api';

// Module 12: Ticketing / Complaint System

export interface CreateTicketPayload {
  target_type: Ticket['target_type'];
  target_id?: string;
  category: string;
  subject: string;
  description?: string;
  priority?: Ticket['priority'];
}

export async function createTicket(payload: CreateTicketPayload): Promise<Ticket> {
  const res = await apiClient.post<ApiSuccess<Ticket>>('/tickets', payload);
  return res.data.data;
}

export async function listMyTickets(): Promise<Ticket[]> {
  const res = await apiClient.get<ApiSuccess<Ticket[]>>('/tickets');
  return res.data.data;
}

// Admin only
export async function listAllTickets(status?: Ticket['status']): Promise<Ticket[]> {
  const res = await apiClient.get<ApiSuccess<Ticket[]>>('/tickets/all', { params: status ? { status } : undefined });
  return res.data.data;
}

export async function getTicket(id: string): Promise<Ticket> {
  const res = await apiClient.get<ApiSuccess<Ticket>>(`/tickets/${id}`);
  return res.data.data;
}

export async function assignTicket(id: string, assignedToId: string): Promise<Ticket> {
  const res = await apiClient.put<ApiSuccess<Ticket>>(`/tickets/${id}/assign`, { assigned_to_id: assignedToId });
  return res.data.data;
}

export async function resolveTicket(id: string, status: 'Resolved' | 'Rejected', resolution?: string): Promise<Ticket> {
  const res = await apiClient.put<ApiSuccess<Ticket>>(`/tickets/${id}/resolve`, { status, resolution: resolution ?? '' });
  return res.data.data;
}
