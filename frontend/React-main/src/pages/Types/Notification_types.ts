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
  inviteeUserID: string; // used when clicking "Accept" to know which id to add to the team (see joinTeamAsMember in Team_types.ts)
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

// ---------- Send team invitation ----------
// Must match STORAGE_KEY in NotificationBell.tsx so invitations actually show up in the bell
// (same pattern as notifyApplicationDecision in Referee_types.ts)
const NOTIFICATIONS_STORAGE_KEY = 'esports_notifications';

// Invite a player to the team by User ID — instead of adding them to the team immediately (the old behavior),
// the system sends an InvitationNotification to the notification bell instead. The invitee must click "Accept"
// in the bell before they're considered part of the team.
// There's no real multi-user system yet, so this writes directly to the same localStorage that NotificationBell
// reads from (same as the demo). Team also doesn't have a real teamID in this scope yet, so the team name
// (team.name) is used in place of inviterTeamID for now.
export function sendTeamInvitation(inviterTeamName: string, inviteeUserID: string): void {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    const existing: AppNotification[] = raw ? JSON.parse(raw) : [];
    const invitation: InvitationNotification = {
      kind: 'invitation',
      notificationID: `invite-${inviteeUserID}-${Date.now()}`,
      title: `Invitation to join team "${inviterTeamName}"`,
      isRead: false,
      createdDate: new Date().toISOString(),
      inviterTeamID: inviterTeamName,
      inviteeUserID,
      actionStatus: 'pending',
    };
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([invitation, ...existing]));
    // Same as notifyApplicationDecision in Referee_types.ts — lets the bell refresh live within the same tab too
    window.dispatchEvent(new Event('esports-notifications-changed'));
  } catch {
    // Silently ignore for now — there's no UI yet to report an error when localStorage is full/disabled (same as notifyApplicationDecision)
  }
}