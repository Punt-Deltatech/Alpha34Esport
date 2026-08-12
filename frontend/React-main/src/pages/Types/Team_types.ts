// types.ts

// Matches the Portfolio struct on the Go side — a member's attached file (resume/portfolio), max 1 file per person (0..1)
export interface Portfolio {
  fileID: string;
  fileName: string;
  fileType: string;
  fileSize: number; // bytes
  fileData?: string; // base64 data URL of the file content (kept client-side for preview/download)
}

export interface Member {
  userid: string; // was previously a number, changed to string to match userID (Go) and currentUserId
  name: string;
  role: 'starter' | 'Substitute'; // matches the union type in PersonalForm
  isOwner?: boolean;
  gameUID?: string;
  phone?: string;
  socialContact?: string;
  avatar?: string; // base64 data URL of the profile picture
  portfolio?: Portfolio; // composition 0..1 — optional
  status: string;
}

export interface Team {
  name: string;
  game: string;
  description: string;
  members: Member[];
  social: string;
  maxMembers?: number;
  logo?: string;
}

// Must match the key used by GetStarted.tsx / TournamentHub.tsx ('esports_team' literal)
export const TEAM_STORAGE_KEY = 'esports_team';

export type JoinTeamResult =
  | { ok: true }
  | { ok: false; reason: 'no-team' | 'already-member' | 'roster-full' };

// Called when clicking "Accept" on a team invitation in NotificationBell — there's no real multi-user/backend
// system yet, so the new member is written directly to the same localStorage used by GetStarted/MyTeam
// (same pattern as other demos in this project). There's no profile data for the invitee (name/game ID, etc.)
// in this scope yet, so a placeholder name is set for now, and the user can edit it later in "Edit Profile" in MyTeam.
export function joinTeamAsMember(userID: string): JoinTeamResult {
  try {
    const raw = localStorage.getItem(TEAM_STORAGE_KEY);
    if (!raw) return { ok: false, reason: 'no-team' };

    const team: Team = JSON.parse(raw);
    if (team.members.some((m) => m.userid === userID)) {
      return { ok: false, reason: 'already-member' };
    }
    if (team.members.length >= (team.maxMembers ?? 5)) {
      return { ok: false, reason: 'roster-full' };
    }

    const newMember: Member = {
      userid: userID,
      name: `player #${userID}`,
      role: 'Substitute', // default role — the captain can change it to starter later via the Role form
      isOwner: false,
      status: 'active',
    };
    team.members = [...team.members, newMember];
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));

    // The 'storage' event doesn't fire in the same tab that wrote the value — this custom event is needed
    // alongside it so the MyTeam page (if it happens to be open at the time) refreshes live to show the new
    // member immediately without a reload.
    window.dispatchEvent(new Event('esports-team-changed'));
    return { ok: true };
  } catch {
    return { ok: false, reason: 'no-team' };
  }
}