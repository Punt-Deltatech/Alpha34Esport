package models

import "time"

// ─────────────────────────────────────────────────────────────────────────
// Module 10: PR & Announcement
// ─────────────────────────────────────────────────────────────────────────

// Banner: homepage promotional banner/carousel entry.
type Banner struct {
	ID           string `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Title        string `gorm:"size:200" json:"title"`
	ImageURL     string `json:"image_url"`
	TargetLink   string `json:"target_link"`
	DisplayOrder int    `json:"display_order"`
	IsActive     bool   `gorm:"default:true" json:"is_active"`
}

// News: a Profile (organizer/manager) authors many News posts.
type News struct {
	ID          string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ManagerID   string     `gorm:"type:uuid;not null;index" json:"manager_id"` // Profile FK, author
	Manager     Profile    `gorm:"foreignKey:ManagerID" json:"manager,omitempty"`
	Title       string     `gorm:"size:200" json:"title"`
	Content     string     `json:"content"`
	Category    string     `gorm:"size:50" json:"category"` // tournament news, prizes, rules, ...
	IsPinned    bool       `gorm:"default:false" json:"is_pinned"`
	PublishedAt *time.Time `json:"published_at"`
}
