package models

import "time"

// Team Entity
type Team struct {
	TeamID      string       `json:"team_id"`
	TeamName    string       `json:"team_name"`
	LogoURL     string       `json:"logo_url"`
	MaxMember   int          `json:"max_member"`
	SocialURL   string       `json:"social_url"`
	Game        string       `json:"game"`
	Description string       `json:"description"`
	Members     []TeamMember `json:"members,omitempty"` // 1..* Relationship
}

// TeamMember Entity
type TeamMember struct {
	UserID        string         `json:"user_id"`
	Fullname      string         `json:"fullname"`
	GameUID       string         `json:"game_uid"`
	Role          string         `json:"role"`
	Phone         string         `json:"phone"`
	SocialContact string         `json:"social_contact"`
	Position      string         `json:"position"`
	Avatar        string         `json:"avatar"`
	Status        string         `json:"status"`
	Portfolio     *Portfolio     `json:"portfolio,omitempty"`     // 0..1 Composition
	Notifications []Notification `json:"notifications,omitempty"` // 1..* Relationship
}

// Portfolio Entity
type Portfolio struct {
	FileID   string  `json:"file_id"`
	FileName string  `json:"file_name"`
	FileType string  `json:"file_type"`
	FileSize float64 `json:"file_size"`
}

// Base Notification Entity
type Notification struct {
	NotificationID string    `json:"notification_id"`
	Title          string    `json:"title"`
	IsRead         bool      `json:"is_read"`
	CreatedDate    time.Time `json:"created_date"`
}

// InvitationNotification (สืบทอดจาก Notification)
type InvitationNotification struct {
	Notification         // Embedded Struct (Generalization)
	InviterTeamID string `json:"inviter_team_id"`
	ActionStatus  string `json:"action_status"`
}

// GeneralNotification (สืบทอดจาก Notification)
type GeneralNotification struct {
	Notification        // Embedded Struct (Generalization)
	Message      string `json:"message"`
	Category     string `json:"category"`
	ReferenceID  string `json:"reference_id"`
}
