package models

import "time"

// ─────────────────────────────────────────────────────────────────────────
// Module 11: Reporting System
// ─────────────────────────────────────────────────────────────────────────

// FinancialSummary: Tournament 1-1 FinancialSummary (roll-up of income/expense).
type FinancialSummary struct {
	ID           string  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TournamentID string  `gorm:"type:uuid;not null;index" json:"tournament_id"`
	Income       float64 `json:"income"`
	Expenses     float64 `json:"expenses"`
	Profit       float64 `json:"profit"`
}

// ExpenseItem: FinancialSummary 1-N ExpenseItem.
type ExpenseItem struct {
	ID                 string  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	FinancialSummaryID string  `gorm:"type:uuid;not null;index" json:"financial_summary_id"`
	Category           string  `gorm:"size:100" json:"category"`
	Amount             float64 `json:"amount"`
}

// IncomeItem: FinancialSummary 1-N IncomeItem.
type IncomeItem struct {
	ID                 string  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	FinancialSummaryID string  `gorm:"type:uuid;not null;index" json:"financial_summary_id"`
	Category           string  `gorm:"size:100" json:"category"`
	Amount             float64 `json:"amount"`
}

// Document: a generated report file (PDF/Excel export of dashboard stats).
type Document struct {
	ID          string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Format      string    `gorm:"size:20" json:"format"` // PDF, Excel
	GeneratedAt time.Time `json:"generated_at"`
	FileURL     string    `json:"file_url"`
}

// AccessRequest: a Profile requesting a generated report.
type AccessRequest struct {
	ID            string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	RequestedByID string    `gorm:"type:uuid;not null;index" json:"requested_by_id"` // Profile FK
	RequestedAt   time.Time `json:"requested_at"`
	ReportType    string    `gorm:"size:100" json:"report_type"`
}

// AccessLog: audit trail of who opened/downloaded which report, when.
type AccessLog struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProfileID string    `gorm:"type:uuid;not null;index" json:"profile_id"`
	Action    string    `gorm:"size:50" json:"action"` // opened, downloaded
	Timestamp time.Time `json:"timestamp"`
	Detail    string    `json:"detail"`
}
