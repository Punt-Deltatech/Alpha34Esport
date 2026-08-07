import type { Application } from './App_Referee_types';

// Matches the WhitelistTeam struct in the class diagram — Application "1"───"0..1" WhitelistTeam
// Only created when the referee clicks approve (see addToWhitelist, called from RefereeReview.tsx)
export interface WhitelistTeam {
  whitelistID: string;
  appID: string; // FK back to the source Application (1:0..1 relationship per the diagram)
  tournamentID: string; // denormalized to filter by tournament without joining Application every time
  teamName: string; // denormalized for direct display on TournamentDetail
  approvedDate: string; // ISO datetime
  isActive: boolean; // false = later revoked (referee changed their mind/banned/withdrew), but history is kept, not deleted
}

export const WHITELIST_STORAGE_KEY = 'esports_whitelist';

export function loadWhitelistFromStorage(): WhitelistTeam[] {
  try {
    const raw = localStorage.getItem(WHITELIST_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WhitelistTeam[]) : [];
  } catch {
    return [];
  }
}

function saveWhitelistToStorage(list: WhitelistTeam[]): void {
  try {
    localStorage.setItem(WHITELIST_STORAGE_KEY, JSON.stringify(list));
    // The browser's 'storage' event doesn't fire in the same tab that wrote the value — this custom event is
    // needed alongside it so WhitelistTeam.tsx (if the Tournament detail page happens to be open) refreshes
    // live immediately after approve/reject.
    window.dispatchEvent(new Event('esports-whitelist-changed'));
  } catch {
    // Silently ignore for now — same pattern as elsewhere in this project, no UI to report an error when localStorage is full/disabled
  }
}

// Called when the referee clicks approve in RefereeReview.tsx.
// If a record for this appID already exists (previously approved, then rejected, now approved again), just
// flip isActive back on instead of creating a duplicate — the original approvedDate can't be kept as-is; it
// must be updated to the latest approval date for accuracy.
export function addToWhitelist(application: Pick<Application, 'appID' | 'tournamentID' | 'team'>): WhitelistTeam {
  const list = loadWhitelistFromStorage();
  const existing = list.find((w) => w.appID === application.appID);

  const entry: WhitelistTeam = existing
    ? { ...existing, isActive: true, approvedDate: new Date().toISOString() }
    : {
        whitelistID: `WL-${application.appID}`,
        appID: application.appID,
        tournamentID: application.tournamentID,
        teamName: application.team.name,
        approvedDate: new Date().toISOString(),
        isActive: true,
      };

  saveWhitelistToStorage(existing ? list.map((w) => (w.appID === application.appID ? entry : w)) : [entry, ...list]);
  return entry;
}

// Called when the referee rejects an application that was previously approved (changed their mind later) —
// deactivates it instead of deleting, preserving history.
export function deactivateWhitelistEntry(appID: string): void {
  const list = loadWhitelistFromStorage();
  if (!list.some((w) => w.appID === appID)) return; // never approved before, nothing to deactivate
  saveWhitelistToStorage(list.map((w) => (w.appID === appID ? { ...w, isActive: false } : w)));
}

// Used by WhitelistTeam.tsx and anywhere that needs to count registeredTeamCount from the real whitelist instead of mock data
export function getWhitelistedTeamsForTournament(tournamentID: string): WhitelistTeam[] {
  return loadWhitelistFromStorage().filter((w) => w.tournamentID === tournamentID && w.isActive);
}