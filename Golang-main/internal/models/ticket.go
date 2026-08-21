package models

import "time"

// ─────────────────────────────────────────────────────────────────────────
// Module 12: Ticketing / Complaint System
//
// This corresponds to the "Report" class embedded in the RBAC subsystem of
// the team report (page 14-15) — renamed Ticket here to avoid clashing with
// Module 11's Reporting System naming.
// ─────────────────────────────────────────────────────────────────────────

// Ticket: a Profile (Reporter) files a complaint/issue, optionally assigned
// to a Profile (Admin) for resolution.
type Ticket struct {
	ID           string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ReporterID   string     `gorm:"type:uuid;not null;index" json:"reporter_id"`
	Reporter     Profile    `gorm:"foreignKey:ReporterID" json:"reporter,omitempty"`
	TargetType   string     `gorm:"size:30" json:"target_type"` // User | Team | Match | Tournament | Other
	TargetID     string     `gorm:"type:uuid" json:"target_id"`
	Category     string     `gorm:"size:50" json:"category"` // cheating, harassment, fraud, technical
	Subject      string     `gorm:"size:200" json:"subject"`
	Description  string     `json:"description"`
	Status       string     `gorm:"size:30;default:'Pending'" json:"status"`  // Pending, InReview, Resolved, Rejected
	Priority     string     `gorm:"size:20;default:'Normal'" json:"priority"` // Low, Normal, High, Urgent
	AssignedToID *string    `gorm:"type:uuid" json:"assigned_to_id"`
	AssignedTo   *Profile   `gorm:"foreignKey:AssignedToID" json:"assigned_to,omitempty"`
	Resolution   string     `json:"resolution"`
	ResolvedAt   *time.Time `json:"resolved_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}
