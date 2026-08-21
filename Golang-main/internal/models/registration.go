package models

import "time"

// ─────────────────────────────────────────────────────────────────────────
// Module 5: Registration & Screening
// ─────────────────────────────────────────────────────────────────────────

// Application links Tournament and Team (the "Registration" junction the
// original brief asked for). Tournament 1-N Application.
type Application struct {
	ID              string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TournamentID    string     `gorm:"type:uuid;not null;index" json:"tournament_id"`
	Tournament      Tournament `gorm:"foreignKey:TournamentID" json:"tournament,omitempty"`
	TeamID          string     `gorm:"type:uuid;not null;index" json:"team_id"`
	Team            Team       `gorm:"foreignKey:TeamID" json:"team,omitempty"`
	SubmittedDate   time.Time  `json:"submitted_date"`
	Status          string     `gorm:"size:30;default:'Pending'" json:"status"`
	ScreenerNote    string     `json:"screener_note"`
	ReviewDate      *time.Time `json:"review_date"`
	RefereeID       *string    `gorm:"type:uuid" json:"referee_id"` // 0..1
	Referee         *Referee   `gorm:"foreignKey:RefereeID" json:"referee,omitempty"`
	DocumentURL     string     `json:"document_url"`                       // required when TournamentDetail.RequireAttachment = true; local-disk path
	WhitelistTeamID *string    `gorm:"type:uuid" json:"whitelist_team_id"` // 0..1, set once approved
}

// Referee: generalization of Profile (same FK-only extension pattern as
// TeamMember). This is the SHARED class the report's cover note refers to
// (also described, slightly differently, in the Match Results subsystem) —
// this is the single canonical definition; Match Results only references it.
type Referee struct {
	ID            string  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProfileID     string  `gorm:"type:uuid;not null;index" json:"profile_id"` // extends Profile
	Profile       Profile `gorm:"foreignKey:ProfileID" json:"profile,omitempty"`
	Fullname      string  `gorm:"size:150" json:"fullname"`
	TournamentID  string  `gorm:"type:uuid;index" json:"tournament_id"` // tournament this referee is assigned to
	LicenseNumber string  `gorm:"size:100" json:"license_number"`
	Level         string  `gorm:"size:50" json:"level"`
}

// WhitelistTeam: a team that has been approved to compete in a tournament.
type WhitelistTeam struct {
	ID            string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ApprovedDate  time.Time `json:"approved_date"`
	IsActive      bool      `gorm:"default:true" json:"is_active"`
	ApplicationID string    `gorm:"type:uuid;not null;index" json:"application_id"`
	TournamentID  string    `gorm:"type:uuid;not null;index" json:"tournament_id"`
	TeamName      string    `gorm:"size:150" json:"team_name"`
}

// ReviewLog: append-only history of screening decisions on an Application.
type ReviewLog struct {
	ID            string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ApplicationID string    `gorm:"type:uuid;not null;index" json:"application_id"`
	TournamentID  string    `gorm:"type:uuid;not null;index" json:"tournament_id"`
	Action        string    `gorm:"size:30" json:"action"` // Approved | Rejected
	RefereeID     string    `gorm:"type:uuid;index" json:"referee_id"`
	ReviewerName  string    `gorm:"size:150" json:"reviewer_name"`
	ReviewDate    time.Time `json:"review_date"`
	ScreenerNote  string    `json:"screener_note"`
}
