package models

import (
	"time"
)

// Tournament Entity
type Tournament struct {
	TournamentID   string           `json:"tournament_id"`
	TournamentName string           `json:"tournament_name"`
	StartDate      time.Time        `json:"start_date"`
	EndDate        time.Time        `json:"end_date"`
	BannerURL      string           `json:"banner_url"`
	Status         string           `json:"status"`
	Game           string           `json:"game"`
	Detail         TournamentDetail `json:"detail"`                 // 1 Composition
	Applications   []Application    `json:"applications,omitempty"` // 1..* Relationship
}

type TournamentDetail struct {
	TournamentID      string    `json:"tournament_id"`
	MaxTeam           int       `json:"max_team"`
	RegisterDeadline  time.Time `json:"register_deadline"`
	PrizePool         float64   `json:"prize_pool"`
	Description       string    `json:"description"`
	Format            string    `json:"format"`
	RequireAttachment bool      `json:"require_attachment"`
	Organizer         string    `json:"organizer"`
}

// Application Entity
type Application struct {
	AppID         string         `json:"app_id"`
	SubmittedDate time.Time      `json:"submitted_date"`
	Status        string         `json:"status"`
	ScreenerNote  string         `json:"screener_note"`
	ReviewDate    time.Time      `json:"review_date"`
	TournamentID  string         `json:"tournament_id"`
	RefereeID     *string        `json:"referee_id,omitempty"`     // 0..1 Relationship
	WhitelistTeam *WhitelistTeam `json:"whitelist_team,omitempty"` // 0..1 Relationship
}

// ReviewLog Entity
type ReviewLog struct {
	LogID        string      `json:"log_id"`
	AppID        string      `json:"app_id"`
	TournamentID string      `json:"tournament_id"`
	Action       string      `json:"action"`
	RefereeID    string      `json:"referee_id"`
	ReviewerName string      `json:"reviewer_name"`
	ReviewDate   time.Time   `json:"review_date"`
	ScreenerNote string      `json:"screener_note"`
	ReviewLogs   []ReviewLog `json:"review_logs,omitempty"` // 1..* Relationship
}

// Referee Entity
type Referee struct {
	RefereeID    string        `json:"referee_id"`
	Fullname     string        `json:"fullname"`
	TournamentID string        `json:"tournament_id"` // tournament: id
	Applications []Application `json:"applications,omitempty"`
	ReviewLogs   []ReviewLog   `json:"review_logs,omitempty"`
}

// WhitelistTeam Entity
type WhitelistTeam struct {
	WhitelistID  string    `json:"whitelist_id"`
	ApprovedDate time.Time `json:"approved_date"`
	IsActive     bool      `json:"is_active"`
	AppID        string    `json:"app_id"`
	TournamentID string    `json:"tournament_id"`
	TeamName     string    `json:"team_name"`
}
