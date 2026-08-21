// Shared request/response types for the Go backend (Golang-main). Field
// names/casing mirror the `json:"..."` tags on the Go structs exactly
// (internal/models/*.go) so services/*.ts never has to translate shapes.

// ── Module 1+2: Auth / RBAC ────────────────────────────────────────────
export interface Role {
  id: string;
  role_name: string;
}

export interface Profile {
  id: string;
  role_id: string | null;
  role?: Role | null;
  name: string;
  gender: string;
  phone_number: string;
  profile_image_url: string;
  status: 'active' | 'suspended';
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Module 3: Tournament Management ────────────────────────────────────
export interface TournamentDetail {
  tournament_id: string;
  max_team: number;
  register_deadline: string;
  prize_pool: number;
  description: string;
  format: string;
  require_attachment: boolean;
  organizer: string;
}

export interface Tournament {
  id: string;
  tournament_name: string;
  start_date: string;
  end_date: string;
  banner_url: string;
  status: 'Draft' | 'Upcoming' | 'RegistrationOpen' | 'Ongoing' | 'Completed' | 'Cancelled';
  game: string;
  organizer_id: string;
  detail?: TournamentDetail | null;
  created_at: string;
  updated_at: string;
}

export interface TournamentHistory {
  id: string;
  tournament_id: string;
  changed_by: string;
  description: string;
  timestamp: string;
}

// ── Module 4: Team & Member Management ─────────────────────────────────
export interface Portfolio {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  profile_id: string;
  profile?: Profile;
  fullname: string;
  game_uid: string;
  role: 'starter' | 'substitute' | '';
  phone: string;
  position: 'captain' | 'member' | '';
  social_contact: string;
  avatar: string;
  status: string;
  portfolio_id: string | null;
  portfolio?: Portfolio | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  team_name: string;
  logo_url: string;
  max_member: number;
  social_url: string;
  game: string;
  description: string;
  manager_id: string;
  account_id: string | null;
  members?: TeamMember[];
  created_at: string;
  updated_at: string;
}

// Merged shape returned by GET /notifications — the base Notification row
// plus whichever subclass fields it has (see NotificationController.ListMine
// on the Go side, which stitches these together manually).
export interface AppNotification {
  id: string;
  profile_id: string;
  title: string;
  is_read: boolean;
  created_date: string;
  type: 'invitation' | 'general';
  // present when type === 'invitation'
  inviter_team_id?: string;
  action_status?: 'pending' | 'accepted' | 'rejected';
  // present when type === 'general'
  message?: string;
  category?: string;
  reference_id?: string;
}

export interface InvitationNotification {
  notification_id: string;
  inviter_team_id: string;
  action_status: 'pending' | 'accepted' | 'rejected';
}

// ── Module 5: Registration & Screening ─────────────────────────────────
export interface Referee {
  id: string;
  profile_id: string;
  profile?: Profile;
  fullname: string;
  tournament_id: string;
  license_number: string;
  level: string;
}

export interface Application {
  id: string;
  tournament_id: string;
  tournament?: Tournament;
  team_id: string;
  team?: Team;
  submitted_date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  screener_note: string;
  review_date: string | null;
  referee_id: string | null;
  referee?: Referee | null;
  document_url: string;
  whitelist_team_id: string | null;
}

export interface WhitelistTeam {
  id: string;
  approved_date: string;
  is_active: boolean;
  application_id: string;
  tournament_id: string;
  team_name: string;
}

export interface ReviewLog {
  id: string;
  application_id: string;
  tournament_id: string;
  action: 'Approved' | 'Rejected';
  referee_id: string;
  reviewer_name: string;
  review_date: string;
  screener_note: string;
}

// ── Module 6/7/8: Scheduling / Coordination / Match Results ────────────
export interface Schedule {
  id: string;
  team_id: string;
  match_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  round_number: number;
  scheduled_time: string;
  match_status: string;
  server_info: string;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_id: string | null;
}

export interface MatchResult {
  id: string;
  match_id: string;
  winner_team_id: string | null;
  score_team1: number;
  score_team2: number;
  submitted_by: string;
  proof_image_url: string;
}

export interface CheatingReport {
  id: string;
  issue_type: string;
  description: string;
  report_date: string;
  referee_id: string;
}

// ── Module 9: Prize Management ─────────────────────────────────────────
export interface Account {
  id: string;
  account_type: string;
  account_number: string;
  responsible: string;
  phone: string;
}

export interface PrizePlace {
  id: string;
  tournament_id: string;
  place_name: string;
  amount: number;
  eligibility_status: string;
}

export interface Payout {
  id: string;
  prize_place_id: string;
  team_id: string | null;
  amount: number;
  status: 'Pending' | 'Processing' | 'Paid' | 'Failed';
  release_date: string | null;
}

// ── Module 10: PR & Announcement ───────────────────────────────────────
export interface Banner {
  id: string;
  title: string;
  image_url: string;
  target_link: string;
  display_order: number;
  is_active: boolean;
}

export interface News {
  id: string;
  manager_id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  published_at: string | null;
}

// ── Module 11: Reporting ───────────────────────────────────────────────
export interface DashboardStats {
  total_tournaments: number;
  total_teams: number;
  total_profiles: number;
  open_tickets: number;
  applications_by_status: Record<string, number>;
}

export interface FinancialSummary {
  id: string;
  tournament_id: string;
  income: number;
  expenses: number;
  profit: number;
}

// ── Module 12: Ticketing / Complaint ───────────────────────────────────
export interface Ticket {
  id: string;
  reporter_id: string;
  target_type: 'User' | 'Team' | 'Match' | 'Tournament' | 'Other';
  target_id: string;
  category: string;
  subject: string;
  description: string;
  status: 'Pending' | 'InReview' | 'Resolved' | 'Rejected';
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  assigned_to_id: string | null;
  resolution: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

// Envelope every successful Go backend response is wrapped in
// (see internal/utils/response.go — JSONSuccess).
export interface ApiSuccess<T> {
  success: true;
  data: T;
}
