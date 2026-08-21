package models

import "time"

// ─────────────────────────────────────────────────────────────────────────
// Module 3: Tournament Management
// ─────────────────────────────────────────────────────────────────────────

// Tournament belongs to a Profile (Organizer/Admin), 1 to N.
// Tournament 1-1 TournamentDetail (composition).
// Tournament 1-N Application (see registration.go).
type Tournament struct {
	ID          string            `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name        string            `gorm:"size:200;not null" json:"tournament_name"`
	StartDate   time.Time         `json:"start_date"`
	EndDate     time.Time         `json:"end_date"`
	BannerURL   string            `json:"banner_url"`
	Status      string            `gorm:"size:30;default:'Draft'" json:"status"` // Draft, Upcoming, RegistrationOpen, Ongoing, Completed, Cancelled
	Game        string            `gorm:"size:100" json:"game"`
	OrganizerID string            `gorm:"type:uuid;not null;index" json:"organizer_id"` // Tournament belongs to Profile (Organizer/Admin)
	Organizer   Profile           `gorm:"foreignKey:OrganizerID" json:"organizer,omitempty"`
	Detail      *TournamentDetail `gorm:"foreignKey:TournamentID" json:"detail,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

// TournamentDetail: PK is also the FK to Tournament (strict 1-1 composition).
type TournamentDetail struct {
	TournamentID      string    `gorm:"type:uuid;primaryKey" json:"tournament_id"`
	MaxTeam           int       `json:"max_team"`
	RegisterDeadline  time.Time `json:"register_deadline"`
	PrizePool         float64   `json:"prize_pool"`
	Description       string    `json:"description"`
	Format            string    `gorm:"size:50" json:"format"` // Single Elimination, Double Elimination, Round Robin, ...
	RequireAttachment bool      `json:"require_attachment"`
	Organizer         string    `gorm:"size:150" json:"organizer"` // free-text org name — intentionally NOT a Profile FK, per report
}

// TournamentHistory: audit trail of edits to a Tournament.
type TournamentHistory struct {
	ID           string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TournamentID string    `gorm:"type:uuid;not null;index" json:"tournament_id"`
	ChangedBy    string    `gorm:"size:150" json:"changed_by"` // free-text actor name — intentionally NOT a Profile FK, per report
	Description  string    `json:"description"`
	Timestamp    time.Time `json:"timestamp"`
}
