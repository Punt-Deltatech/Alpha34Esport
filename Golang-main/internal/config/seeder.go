package config

import (
	"log"
	"time"

	"github.com/SA/Golang-Backend-Example/internal/models"
	"github.com/SA/Golang-Backend-Example/internal/utils"
	"gorm.io/gorm"
)

// SeedDatabase populates the database with initial data.
func SeedDatabase(db *gorm.DB) error {
	log.Println("Starting database seed...")

	// Seed Genders
	if err := seedGenders(db); err != nil {
		return err
	}

	// Seed Users
	if err := seedUsers(db); err != nil {
		return err
	}

	log.Println("Database seed completed successfully")
	return nil
}

// seedGenders creates initial gender records.
func seedGenders(db *gorm.DB) error {
	genders := []models.Gender{
		{Model: gorm.Model{ID: 1}, Gender: "ชาย"},       // Male
		{Model: gorm.Model{ID: 2}, Gender: "หญิง"},      // Female
		{Model: gorm.Model{ID: 3}, Gender: "อื่น ๆ"},    // Other
	}

	for _, gender := range genders {
		// Check if gender already exists
		var existing models.Gender
		if err := db.Where("id = ?", gender.ID).First(&existing).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				if err := db.Create(&gender).Error; err != nil {
					log.Printf("failed to seed gender: %v", err)
					return err
				}
				log.Printf("created gender: %s", gender.Gender)
			} else {
				return err
			}
		}
	}

	return nil
}

// seedUsers creates initial user records.
func seedUsers(db *gorm.DB) error {
	genderMaleID := uint(1)
	genderFemaleID := uint(2)

	birthDate1 := time.Date(1990, 5, 15, 0, 0, 0, 0, time.UTC)
	birthDate2 := time.Date(1995, 8, 20, 0, 0, 0, 0, time.UTC)

	hashedPassword1, err := utils.HashPassword("password123")
	if err != nil {
		return err
	}

	hashedPassword2, err := utils.HashPassword("securepass456")
	if err != nil {
		return err
	}

	users := []models.User{
		{
			FirstName: "สมชาย",
			LastName:  "สมจริง",
			Email:     "somchai@example.com",
			Password:  hashedPassword1,
			Age:       34,
			BirthDay:  &birthDate1,
			GenderID:  &genderMaleID,
		},
		{
			FirstName: "สมหญิง",
			LastName:  "สวยงาม",
			Email:     "somying@example.com",
			Password:  hashedPassword2,
			Age:       29,
			BirthDay:  &birthDate2,
			GenderID:  &genderFemaleID,
		},
	}

	for _, user := range users {
		// Check if user already exists by email
		var existing models.User
		if err := db.Where("email = ?", user.Email).First(&existing).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				if err := db.Create(&user).Error; err != nil {
					log.Printf("failed to seed user: %v", err)
					return err
				}
				log.Printf("created user: %s %s (%s)", user.FirstName, user.LastName, user.Email)
			} else {
				return err
			}
		}
	}

	return nil
}
