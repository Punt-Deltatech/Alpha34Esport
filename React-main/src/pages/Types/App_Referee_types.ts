// Application status (Application.status in the class diagram)
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface PortfolioFile {
  fileName: string;
  fileSize: number;
  fileData: string; // base64 data URL or a downloadable file URL
}

// Same shape as Member / Team in '../Team/Team_types' — declared separately here to avoid coupling this type
// directly to the Team module (the Referee page only needs to see a snapshot of the team at application time, not the live team).
// If the real Member shape in Team_types.ts changes, sync it here too.
export interface ApplicantMember {
  id: string;
  name: string;
  avatar?: string;
  isOwner: boolean;
  gameUID?: string;
  role: string;
  portfolio?: PortfolioFile;
}

export interface ApplicantTeam {
  name: string;
  logo?: string; // base64 data URL of the team logo at application time — synced with Team.logo in Team_types.ts
  members: ApplicantMember[];
}

// Application, per the class diagram: Referee "0..1"───"*" Application "*"───"1" Tournament
// Represents one team's application to one tournament.
// Once approved, the real system will create a corresponding WhitelistTeam (Application "1"───"0..1" WhitelistTeam)
// — creating the WhitelistTeam is not in scope for this page yet; it only sets status/reviewDate for now.
export interface Application {
  appID: string;
  tournamentID: string;
  tournamentName: string; // denormalized for grouping/display without joining Tournament every time
  game: string;
  requireAttachment: boolean; // comes from this tournament's TournamentDetail — used to check before allowing approval
  team: ApplicantTeam; // snapshot of the roster + each member's portfolio at application time
  submittedDate: string; // ISO datetime
  status: ApplicationStatus;
  screenerNote: string;
  reviewDate: string | null; // ISO datetime — set when the referee approves/rejects
}

// Referee, per the class diagram: refereeID, fullname, tournament: id
// One referee is bound to a single tournament (tournamentID) — used to restrict them to only viewing/reviewing
// applications for their own tournament.
export interface Referee {
  refereeID: string;
  fullname: string;
  tournamentID: string;
}

// ---------- Review history (new class: ReviewLog) ----------
// Records every time a referee actually clicks approve/reject (after passing through the confirm dialog).
// Also stores a snapshot of the Application at review time, so the reviewed application's details can still be
// viewed even if the real Application's status is changed later (e.g. approved, then changed to rejected).
// Relationship: Referee "1"───"*" ReviewLog "*"───"1" Application (each review = 1 log; one application can have multiple logs)
export type ReviewAction = Extract<ApplicationStatus, 'approved' | 'rejected'>;

export interface ReviewLog {
  logID: string;
  appID: string;
  tournamentID: string;
  tournamentName: string;
  game: string;
  teamName: string;
  action: ReviewAction;
  note: string;
  refereeID: string; // Referee.refereeID of whoever clicked approve/reject
  reviewerName: string; // Referee.fullname — denormalized for display without a join
  reviewDate: string; // ISO datetime when confirmed in the confirm dialog
  applicationSnapshot: Application; // copy of the application at review time, for later viewing
}

// ---------- localStorage keys (no real backend yet, using localStorage instead for now) ----------

// All applications across all tournaments — MyTeam appends to this, RefereeReview reads/updates status
export const APPLICATIONS_STORAGE_KEY = 'esports_applications';

// Must match STORAGE_KEY in NotificationBell.tsx so notifications actually show up in the bell
const NOTIFICATIONS_STORAGE_KEY = 'esports_notifications';

// Review history for all applications across all tournaments — RefereeReview appends after confirm, ReviewLog.tsx reads and displays it
export const REVIEW_LOGS_STORAGE_KEY = 'esports_review_logs';

// Read the list of applications from localStorage; if none exist yet, seed with the fallback (e.g. MOCK_APPLICATIONS) and write it back
export function loadApplicationsFromStorage(fallback: Application[]): Application[] {
  try {
    const raw = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Application[];
  } catch {
    // JSON is corrupted or localStorage is unavailable — use the fallback instead
  }
  localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(fallback));
  return fallback;
}

export function saveApplicationsToStorage(applications: Application[]): void {
  try {
    localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(applications));
  } catch {
    // Silently ignore for now — there's no UI yet to report an error when localStorage is full/disabled
  }
}

// Mock tournaments for MyTeam to choose from when submitting an application (no real Tournament API in scope yet)
// tournamentID matches what's used in MOCK_APPLICATIONS in RefereeReview.tsx
export const MOCK_TOURNAMENTS_FOR_APPLY: {
  tournamentID: string;
  tournamentName: string;
  game: string;
  requireAttachment: boolean;
}[] = [
  { tournamentID: 't1', tournamentName: 'VCT Champions 2026', game: 'Valorant', requireAttachment: false },
  { tournamentID: 't2', tournamentName: 'ESL Pro League Season 29', game: 'CS2', requireAttachment: true },
  { tournamentID: 't3', tournamentName: 'ROV Season 99', game: 'RoV', requireAttachment: false },
];

// Send a notification to the team after the referee clicks approve/reject.
// Writes directly to the same localStorage key as NotificationBell (not importing the AppNotification type from
// Team_types to avoid cross-folder path issues — the object shape below must match the 'general' notification in Team_types.ts)
export function notifyApplicationDecision(
  application: Pick<Application, 'appID' | 'tournamentName'>,
  teamName: string,
  status: Extract<ApplicationStatus, 'approved' | 'rejected'>,
  note: string
): void {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const notification = {
      kind: 'general',
      notificationID: `app-${application.appID}-${Date.now()}`,
      title: status === 'approved' ? 'Application Approved' : 'Application Rejected',
      isRead: false,
      createdDate: new Date().toISOString(),
      message:
        status === 'approved'
          ? `Team "${teamName}" has been approved to join ${application.tournamentName}`
          : `Team "${teamName}" was rejected from ${application.tournamentName}${note.trim() ? `: ${note.trim()}` : ''}`,
      category: 'system', // use 'system' to be sure it matches the union in Team_types — change this if a dedicated application category already exists
      referenceID: application.appID,
    };
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([notification, ...existing]));
    // The browser's 'storage' event only fires across tabs, not in the same tab that wrote the value.
    // This custom event is needed alongside it so NotificationBell (mounted once in Layout) refreshes live
    // immediately after approve/reject.
    window.dispatchEvent(new Event('esports-notifications-changed'));
  } catch {
    // Silently ignore for now — a failed notification shouldn't block the referee's approve/reject flow
  }
}

// Read the full review history from localStorage (none yet = empty array; unlike applications, this isn't
// seeded with mock data, since logs should only ever come from real approve/reject actions)
export function loadReviewLogsFromStorage(): ReviewLog[] {
  try {
    const raw = localStorage.getItem(REVIEW_LOGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ReviewLog[];
  } catch {
    // JSON is corrupted or localStorage is unavailable — treat as no history yet
  }
  return [];
}

export function saveReviewLogsToStorage(logs: ReviewLog[]): void {
  try {
    localStorage.setItem(REVIEW_LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // Silently ignore for now — same as saveApplicationsToStorage
  }
}

// Called from RefereeReview.tsx immediately after the referee confirms in the ConfirmDialog
// (not when Approve/Reject is first clicked). Adds the new log to the top of the list (most recent first).
export function addReviewLog(entry: Omit<ReviewLog, 'logID'>): ReviewLog {
  const log: ReviewLog = {
    ...entry,
    logID: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
  const existing = loadReviewLogsFromStorage();
  saveReviewLogsToStorage([log, ...existing]);
  return log;
}