import { apiClient } from '../lib/apiClient';
import type { ApiSuccess, AppNotification } from '../types/api';

// Notification / InvitationNotification / GeneralNotification part of Module 4.

export async function listMyNotifications(): Promise<AppNotification[]> {
  const res = await apiClient.get<ApiSuccess<AppNotification[]>>('/notifications');
  return res.data.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.put(`/notifications/${id}/read`);
}

export async function respondToInvitation(notificationId: string, accept: boolean) {
  const res = await apiClient.post(`/notifications/${notificationId}/respond`, { accept });
  return res.data.data;
}
