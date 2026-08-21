package config

import (
	"log"

	"gorm.io/gorm"

	"github.com/SA/Golang-Backend-Example/internal/models"
)

// defaultRoles are the RBAC roles named in the original spec (Admin,
// Organizer, Team Manager, Player) plus Referee, needed by the
// Registration & Screening and Match Results modules.
var defaultRoles = []string{"Admin", "Organizer", "TeamManager", "Player", "Referee"}

// SeedDatabase ensures the fixed set of RBAC roles exists. Everything else
// (profiles, teams, tournaments, ...) is real user-generated data created
// through Supabase Auth sign-up / the API, so it is intentionally not seeded.
func SeedDatabase(db *gorm.DB) error {
	for _, name := range defaultRoles {
		var existing models.Role
		err := db.Where("role_name = ?", name).First(&existing).Error
		if err == nil {
			continue
		}
		if err != gorm.ErrRecordNotFound {
			return err
		}
		if err := db.Create(&models.Role{RoleName: name}).Error; err != nil {
			log.Printf("failed to seed role %s: %v", name, err)
			return err
		}
		log.Printf("created role: %s", name)
	}
	return nil
}
