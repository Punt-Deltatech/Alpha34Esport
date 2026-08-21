// UI-facing WhitelistTeam shape used by WhiteListTeam.tsx. Backed by the real Go backend now
// (see ../../services/applicationService.ts) — mapWhitelistTeam translates the backend's shape
// (types/api.ts) into this file's existing UI shape.

import type { WhitelistTeam as ApiWhitelistTeam } from '../../types/api';

// Matches the WhitelistTeam struct in the class diagram — Application "1"───"0..1" WhitelistTeam
export interface WhitelistTeam {
  whitelistID: string;
  appID: string;
  tournamentID: string;
  teamName: string;
  approvedDate: string;
  isActive: boolean;
}

export function mapWhitelistTeam(w: ApiWhitelistTeam): WhitelistTeam {
  return {
    whitelistID: w.id,
    appID: w.application_id,
    tournamentID: w.tournament_id,
    teamName: w.team_name,
    approvedDate: w.approved_date,
    isActive: w.is_active,
  };
}
