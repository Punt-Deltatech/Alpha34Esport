// UI-facing notification shapes used by NotificationBell.tsx / NotificationDetailDialog.tsx.
// Backed by the real Go backend now (see ../../services/notificationService.ts) — mapNotification
// below translates the backend's merged shape (types/api.ts) into this file's existing
// discriminated-union shape, so the presentational components didn't have to change.

import type { AppNotification as ApiNotification } from '../../types/api';

// Matches the Notification struct on the Go side — one owner (TeamMember) can have many notifications (1..*)
export interface Notification {
  notificationID: string;
  title: string;
  isRead: boolean;
  createdDate: string; // ISO datetime
}

// Team invitation notification — must be accepted/declined
export interface InvitationNotification extends Notification {
  kind: 'invitation';
  inviterTeamID: string;
  actionStatus: 'pending' | 'accepted' | 'declined';
}

// General notification (system/tournament/etc.)
export interface GeneralNotification extends Notification {
  kind: 'general';
  message: string;
  category: string;
  referenceID: string;
}

export type AppNotification = InvitationNotification | GeneralNotification;

export function mapNotification(n: ApiNotification): AppNotification {
  if (n.type === 'invitation') {
    return {
      kind: 'invitation',
      notificationID: n.id,
      title: n.title,
      isRead: n.is_read,
      createdDate: n.created_date,
      inviterTeamID: n.inviter_team_id ?? '',
      actionStatus: n.action_status === 'rejected' ? 'declined' : (n.action_status ?? 'pending'),
    };
  }
  return {
    kind: 'general',
    notificationID: n.id,
    title: n.title,
    isRead: n.is_read,
    createdDate: n.created_date,
    message: n.message ?? '',
    category: n.category ?? '',
    referenceID: n.reference_id ?? '',
  };
}
