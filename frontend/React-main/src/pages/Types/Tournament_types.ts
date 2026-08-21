// Backed by the real Go backend now (see ../../services/tournamentService.ts) — mapTournament
// (below) translates the backend's shape (types/api.ts, status enum Draft/Upcoming/
// RegistrationOpen/Ongoing/Completed/Cancelled) into this file's existing UI shape/status strings.
import type { Tournament as ApiTournament } from '../../types/api';

// Application status (Application.status in the class diagram) — 'none' means never applied, not a real Application status.
// 'pending' is set immediately after clicking "Confirm Application" while waiting for the Referee/organizer to review
// (equivalent to a WhitelistTeam that hasn't been approved yet).
export type ApplicationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface TournamentUIState {
  registeredTeamCount: number; // number of teams that applied and have been approved (excludes teams still pending)
  applicationStatus: ApplicationStatus; // this user's team's application status for this tournament
}

// In-depth tournament details — split out from Tournament per the class diagram.
// Composition relationship (Tournament ♦── TournamentDetail "1"):
// Every Tournament always has exactly one attached TournamentDetail and owns its lifecycle.
export interface TournamentDetail {
  tournamentID: string;
  maxTeam: number;
  registerDeadline: string; // ISO datetime string
  prizePool: number;
  description: string;
  format: string; // competition format, e.g. 'Single Elimination', 'Swiss', 'Round Robin'
  organizer: string; // tournament organizer
  requireAttachment: boolean;
}

export interface Tournament {
  tournamentID: string;
  tournamentName: string;
  game: string; // game name, shown as a chip in the top-right corner of the card, e.g. 'Valorant', 'CS2'
  startDate: string; // ISO datetime string
  endDate: string; // ISO datetime string
  bannerUrl: string;
  status: string; // e.g. 'open' | 'closed' | 'ongoing' | 'completed'
  detail: TournamentDetail; // composition: always exists as a paired 1:1
}

function mapStatus(status: ApiTournament['status']): string {
  switch (status) {
    case 'RegistrationOpen':
      return 'open';
    case 'Ongoing':
      return 'ongoing';
    case 'Completed':
      return 'completed';
    case 'Cancelled':
      return 'closed';
    default: // Draft, Upcoming — not open for sign-up yet
      return 'closed';
  }
}

export function mapTournament(t: ApiTournament): Tournament {
  return {
    tournamentID: t.id,
    tournamentName: t.tournament_name,
    game: t.game,
    startDate: t.start_date,
    endDate: t.end_date,
    bannerUrl: t.banner_url,
    status: mapStatus(t.status),
    detail: {
      tournamentID: t.id,
      maxTeam: t.detail?.max_team ?? 0,
      registerDeadline: t.detail?.register_deadline ?? '',
      prizePool: t.detail?.prize_pool ?? 0,
      description: t.detail?.description ?? '',
      format: t.detail?.format ?? '',
      organizer: t.detail?.organizer ?? '',
      requireAttachment: t.detail?.require_attachment ?? false,
    },
  };
}