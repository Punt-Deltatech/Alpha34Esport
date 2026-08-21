package models

import "time"

// ─────────────────────────────────────────────────────────────────────────
// Module 9: Prize Management
// ─────────────────────────────────────────────────────────────────────────

// Account: Team 1-1 Account, referenced from team.go via Team.AccountID.
// "1 team has exactly one financial/payout account."
type Account struct {
	ID            string `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AccountType   string `gorm:"size:50" json:"account_type"`
	AccountNumber string `gorm:"size:50" json:"account_number"`
	Responsible   string `gorm:"size:150" json:"responsible"`
	Phone         string `gorm:"size:30" json:"phone"`
}

// PrizePlace: Tournament 1-N PrizePlace (e.g. 1st place, 2nd place, MVP).
type PrizePlace struct {
	ID                string  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TournamentID      string  `gorm:"type:uuid;not null;index" json:"tournament_id"`
	PlaceName         string  `gorm:"size:100" json:"place_name"`
	Amount            float64 `json:"amount"`
	EligibilityStatus string  `gorm:"size:30" json:"eligibility_status"`
}

// Payout: a Prize optionally references a winning Team (nullable — a place
// can exist before a winner is decided).
type Payout struct {
	ID           string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	PrizePlaceID string     `gorm:"type:uuid;not null;index" json:"prize_place_id"`
	TeamID       *string    `gorm:"type:uuid" json:"team_id"`
	Amount       float64    `json:"amount"`
	Status       string     `gorm:"size:30;default:'Pending'" json:"status"`
	ReleaseDate  *time.Time `json:"release_date"`
}

// PayoutLog: append-only audit trail for Payout status changes.
type PayoutLog struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	PayoutID  string    `gorm:"type:uuid;not null;index" json:"payout_id"`
	Timestamp time.Time `json:"timestamp"`
	Detail    string    `json:"detail"`
}

// PaymentEvidence: proof-of-transfer file attached to a Payout. File bytes
// live on the Go server's local disk; this row stores the served URL/path.
type PaymentEvidence struct {
	ID           string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	PayoutID     string    `gorm:"type:uuid;not null;index" json:"payout_id"`
	FileURL      string    `json:"file_url"`
	FileType     string    `gorm:"size:20" json:"file_type"`
	UploadedAt   time.Time `json:"uploaded_at"`
	UploadedByID string    `gorm:"type:uuid" json:"uploaded_by_id"` // Profile FK
}
