// UI-facing Application/Referee/ReviewLog shapes used by RefereeReview.tsx and RefereeLog.tsx.
// Backed by the real Go backend now (see ../../services/applicationService.ts) — the mapper
// functions below translate the backend's shape (types/api.ts) into this file's existing UI
// shape, so the presentational components (ApplicationCard, ApplicantDetailPanel, LogCard, ...)
// didn't have to change.

import { resolveFileUrl } from '../../lib/apiClient';
import type {
  Application as ApiApplication,
  ReviewLog as ApiReviewLog,
  TeamMember as ApiTeamMember,
} from '../../types/api';

// Application status (Application.status in the class diagram)
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface PortfolioFile {
  fileName: string;
  fileSize: number;
  fileData: string; // absolute URL to the uploaded file (resolved via resolveFileUrl)
}

// Same shape as Member / Team in '../Team/Team_types' — declared separately here to avoid coupling this type
// directly to the Team module (the Referee page only needs to see a snapshot of the team at application time, not the live team).
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
  logo?: string;
  members: ApplicantMember[];
}

// Application, per the class diagram: Referee "0..1"───"*" Application "*"───"1" Tournament
export interface Application {
  appID: string;
  tournamentID: string;
  tournamentName: string;
  game: string;
  requireAttachment: boolean;
  team: ApplicantTeam;
  submittedDate: string;
  status: ApplicationStatus;
  screenerNote: string;
  reviewDate: string | null;
}

// Referee, per the class diagram: refereeID, fullname, tournament: id
export interface Referee {
  refereeID: string;
  fullname: string;
  tournamentID: string;
}

// ---------- Review history (ReviewLog) ----------
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
  refereeID: string;
  reviewerName: string;
  reviewDate: string;
  // The backend only stores IDs + the decision on ReviewLog itself, not a true point-in-time
  // snapshot — this is the *current* application/team data for that appID, not what it looked
  // like at review time. Good enough for a course-project demo; a real snapshot would need a
  // JSON column added to the Go ReviewLog model.
  applicationSnapshot: Application;
}

function mapApplicantMember(m: ApiTeamMember): ApplicantMember {
  return {
    id: m.profile_id,
    name: m.fullname || m.profile?.name || '',
    avatar: m.avatar,
    isOwner: m.position === 'captain',
    gameUID: m.game_uid,
    role: m.role,
    portfolio: m.portfolio
      ? {
          fileName: m.portfolio.file_name,
          fileSize: m.portfolio.file_size,
          fileData: resolveFileUrl(m.portfolio.file_path),
        }
      : undefined,
  };
}

export function mapApplication(a: ApiApplication): Application {
  return {
    appID: a.id,
    tournamentID: a.tournament_id,
    tournamentName: a.tournament?.tournament_name ?? '',
    game: a.tournament?.game ?? '',
    requireAttachment: a.tournament?.detail?.require_attachment ?? false,
    team: {
      name: a.team?.team_name ?? '',
      logo: a.team?.logo_url,
      members: (a.team?.members ?? []).map(mapApplicantMember),
    },
    submittedDate: a.submitted_date,
    status: (a.status.toLowerCase() as ApplicationStatus) || 'pending',
    screenerNote: a.screener_note,
    reviewDate: a.review_date,
  };
}

// applicationsByID: already-mapped Applications for the same tournament, keyed by appID —
// used to fill in the denormalized display fields the backend's ReviewLog doesn't carry itself.
export function mapReviewLog(log: ApiReviewLog, applicationsByID: Map<string, Application>): ReviewLog {
  const app = applicationsByID.get(log.application_id);
  return {
    logID: log.id,
    appID: log.application_id,
    tournamentID: log.tournament_id,
    tournamentName: app?.tournamentName ?? '',
    game: app?.game ?? '',
    teamName: app?.team.name ?? '',
    action: log.action === 'Approved' ? 'approved' : 'rejected',
    note: log.screener_note,
    refereeID: log.referee_id,
    reviewerName: log.reviewer_name,
    reviewDate: log.review_date,
    applicationSnapshot: app ?? {
      appID: log.application_id,
      tournamentID: log.tournament_id,
      tournamentName: '',
      game: '',
      requireAttachment: false,
      team: { name: '', members: [] },
      submittedDate: log.review_date,
      status: log.action === 'Approved' ? 'approved' : 'rejected',
      screenerNote: log.screener_note,
      reviewDate: log.review_date,
    },
  };
}
