package models

import "time"

// ─────────────────────────────────────────────────────────────────────────
// Module 8: Match Results System
// ─────────────────────────────────────────────────────────────────────────

// MatchResult: 1-1 with Match in practice (one result per match), but kept
// as its own table (rather than columns on Match) so a match can be
// resubmitted/corrected without losing history, matching the report.
type MatchResult struct {
	ID            string  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	MatchID       string  `gorm:"type:uuid;not null;index" json:"match_id"`
	WinnerTeamID  *string `gorm:"type:uuid" json:"winner_team_id"`
	ScoreTeam1    int     `json:"score_team1"`
	ScoreTeam2    int     `json:"score_team2"`
	SubmittedBy   string  `gorm:"size:150" json:"submitted_by"` // referee / organizer name
	ProofImageURL string  `json:"proof_image_url"`
}

// MatchParticipant is the join table behind the Team <-> MatchResult
// many-to-many relationship described in the report's shared-class section:
// "1 MatchResult can involve >=1 Team, and 1 Team can appear in many
// MatchResults" — participation/statistics per team per match live here.
type MatchParticipant struct {
	ID            string `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	MatchResultID string `gorm:"type:uuid;not null;index" json:"match_result_id"`
	TeamID        string `gorm:"type:uuid;not null;index" json:"team_id"`
}

// CheatingReport: Referee 1-N CheatingReport (a referee can file many reports).
type CheatingReport struct {
	ID          string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	IssueType   string    `gorm:"size:100" json:"issue_type"`
	Description string    `json:"description"`
	ReportDate  time.Time `json:"report_date"`
	RefereeID   string    `gorm:"type:uuid;not null;index" json:"referee_id"`
}

// CheatingReportTeam is the join table behind the Team <-> CheatingReport
// many-to-many relationship described in the report's shared-class section
// (a report can implicate >=1 team; a team can appear on many reports).
type CheatingReportTeam struct {
	ID               string `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CheatingReportID string `gorm:"type:uuid;not null;index" json:"cheating_report_id"`
	TeamID           string `gorm:"type:uuid;not null;index" json:"team_id"`
}
