package config

import (
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/SA/Golang-Backend-Example/internal/models"
)

// ConnectDatabase opens a connection to the Supabase-managed PostgreSQL
// database (via its standard connection string) and runs migrations for
// every model across all 12 modules.
func ConnectDatabase(cfg *Config) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// pgcrypto provides gen_random_uuid(), used as the default for every
	// UUID primary key in internal/models. Supabase projects have it
	// enabled by default; this keeps a plain local Postgres working too.
	if err := db.Exec(`CREATE EXTENSION IF NOT EXISTS pgcrypto`).Error; err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(
		// Module 1+2: Auth / RBAC — Profile is NOT the source of truth for
		// identity (Supabase's auth.users is); this only migrates the
		// public.profiles table's own columns.
		&models.Profile{}, &models.Role{}, &models.Permission{}, &models.Session{}, &models.AuditLog{},
		// Module 3: Tournament Management
		&models.Tournament{}, &models.TournamentDetail{}, &models.TournamentHistory{},
		// Module 4: Team & Member Management
		&models.Team{}, &models.TeamMember{}, &models.Portfolio{},
		&models.Notification{}, &models.InvitationNotification{}, &models.GeneralNotification{},
		// Module 5: Registration & Screening
		&models.Application{}, &models.Referee{}, &models.WhitelistTeam{}, &models.ReviewLog{},
		// Module 6+7: Scheduling / Coordination
		&models.Match{}, &models.Schedule{},
		// Module 8: Match Results
		&models.MatchResult{}, &models.MatchParticipant{}, &models.CheatingReport{}, &models.CheatingReportTeam{},
		// Module 9: Prize Management
		&models.Account{}, &models.PrizePlace{}, &models.Payout{}, &models.PayoutLog{}, &models.PaymentEvidence{},
		// Module 10: PR & Announcement
		&models.Banner{}, &models.News{},
		// Module 11: Reporting
		&models.FinancialSummary{}, &models.ExpenseItem{}, &models.IncomeItem{}, &models.Document{}, &models.AccessRequest{}, &models.AccessLog{},
		// Module 12: Ticketing / Complaint
		&models.Ticket{},
	); err != nil {
		return nil, err
	}

	if err := SeedDatabase(db); err != nil {
		return nil, err
	}

	return db, nil
}
