package models

import "time"

// ─────────────────────────────────────────────────────────────────────────
// Module 6: Scheduling System   (+ reused by Module 7: Coordination —
// per decision, Coordination has no separate messaging model; it only
// needs Team / TeamMember (team.go) and Schedule (below))
// ─────────────────────────────────────────────────────────────────────────

// Match: Tournament 1-N Match. TeamA/TeamB/Winner are nullable because a
// match can be scheduled before both slots (e.g. bracket byes) or results
// (Winner) are known — matches the original brief's explicit requirement.
type Match struct {
	ID            string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TournamentID  string    `gorm:"type:uuid;not null;index" json:"tournament_id"`
	RoundNumber   int       `json:"round_number"`
	ScheduledTime time.Time `json:"scheduled_time"`
	MatchStatus   string    `gorm:"size:30;default:'Scheduled'" json:"match_status"` // Scheduled, Ongoing, Finished, Cancelled
	ServerInfo    string    `json:"server_info"`                                     // custom lobby / server details
	TeamAID       *string   `gorm:"type:uuid" json:"team_a_id"`
	TeamBID       *string   `gorm:"type:uuid" json:"team_b_id"`
	WinnerID      *string   `gorm:"type:uuid" json:"winner_id"`
}

// Schedule: Team 1-N Schedule.
type Schedule struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TeamID    string    `gorm:"type:uuid;not null;index" json:"team_id"`
	MatchDate time.Time `json:"match_date"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
	Status    string    `gorm:"size:30" json:"status"`
}
