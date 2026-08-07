package models

import (
	"time"

	"gorm.io/gorm"
)

// User represents a user account in the system. It embeds gorm.Model
// to include ID, CreatedAt, UpdatedAt and DeletedAt fields.
type User struct {
	gorm.Model
	FirstName string    `gorm:"size:100;not null" json:"first_name"`
	LastName  string    `gorm:"size:100;not null" json:"last_name"`
	Email     string    `gorm:"size:100;uniqueIndex;not null" json:"email"`
	Password  string    `gorm:"size:255;not null" json:"-"`
	Age       int       `gorm:"default:0" json:"age"`
	BirthDay  *time.Time `json:"birth_day"`
	GenderID  *uint     `json:"gender_id"`
	Gender    *Gender   `gorm:"foreignKey:GenderID" json:"gender"`
}
