// types.ts
//
// UI-facing Team/Member shapes used by MyTeam.tsx, CreateTeamForm.tsx, EditTeamForm.tsx,
// AddMemberForm.tsx and PersonalForm.tsx. Historically these were read/written straight to
// localStorage (single-team-per-browser demo). Now backed by the real Go backend
// (see ../../services/teamService.ts) — the mapper functions below translate between the
// backend's shape (types/api.ts, snake_case) and this file's existing camelCase UI shape,
// so none of the presentational components above had to change.

import { resolveFileUrl } from '../../lib/apiClient';
import type { Team as ApiTeam, TeamMember as ApiTeamMember } from '../../types/api';

export interface Portfolio {
  fileID: string;
  fileName: string;
  fileType: string;
  fileSize: number; // bytes
  fileData?: string; // absolute URL to the uploaded file (resolved via resolveFileUrl), used for preview/download
}

export interface Member {
  userid: string; // Profile.id (Supabase auth uid) — the person's identity, used for isSelf/ownership checks
  rosterId: string; // TeamMember.id — the roster row itself, needed for member-scoped API calls (update/remove)
  name: string;
  role: 'starter' | 'Substitute';
  isOwner?: boolean;
  gameUID?: string;
  phone?: string;
  socialContact?: string;
  avatar?: string;
  portfolio?: Portfolio;
  status: string;
}

export interface Team {
  id: string;
  name: string;
  game: string;
  description: string;
  members: Member[];
  social: string;
  maxMembers?: number;
  logo?: string;
}

export function mapApiMemberToMember(m: ApiTeamMember): Member {
  return {
    userid: m.profile_id,
    rosterId: m.id,
    name: m.fullname || m.profile?.name || '',
    role: m.role === 'substitute' ? 'Substitute' : 'starter',
    isOwner: m.position === 'captain',
    gameUID: m.game_uid,
    phone: m.phone,
    socialContact: m.social_contact,
    avatar: m.avatar,
    portfolio: m.portfolio
      ? {
          fileID: m.portfolio.id,
          fileName: m.portfolio.file_name,
          fileType: m.portfolio.file_type,
          fileSize: m.portfolio.file_size,
          fileData: resolveFileUrl(m.portfolio.file_path),
        }
      : undefined,
    status: m.status,
  };
}

export function mapApiTeamToTeam(t: ApiTeam): Team {
  return {
    id: t.id,
    name: t.team_name,
    game: t.game,
    description: t.description,
    social: t.social_url,
    maxMembers: t.max_member,
    logo: t.logo_url,
    members: (t.members ?? []).map(mapApiMemberToMember),
  };
}
