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