package models

import "time"

// ─────────────────────────────────────────────────────────────────────────
// Module 4: Team & Member Management   (+ reused by Module 7: Coordination,
// which only needs Team / TeamMember / Schedule — no separate model)
// ─────────────────────────────────────────────────────────────────────────

// Team belongs to a Profile (Manager), 1 to N.
// Team 1-1 Account (financial account, owned by the Prize Management module — see prize.go).
// Team 1-N TeamMember (players), through no junction table — TeamMember carries the FK directly.
// Team 1-N Schedule (see scheduling.go).
type Team struct {
	ID          string       `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TeamName    string       `gorm:"size:150;not null" json:"team_name"`
	LogoURL     string       `json:"logo_url"`
	MaxMember   int          `gorm:"default:5" json:"max_member"`
	SocialURL   string       `json:"social_url"`
	Game        string       `gorm:"size:100" json:"game"`
	Description string       `json:"description"`
	ManagerID   string       `gorm:"type:uuid;not null;index" json:"manager_id"` // Team belongs to Profile (Manager)
	Manager     Profile      `gorm:"foreignKey:ManagerID" json:"manager,omitempty"`
	AccountID   *string      `gorm:"type:uuid" json:"account_id"` // 1-1 with Account (Prize Management module)
	Account     *Account     `gorm:"foreignKey:AccountID" json:"account,omitempty"`
	Members     []TeamMember `gorm:"foreignKey:TeamID" json:"members,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

// TeamMember: generalization of Profile in the UML diagram (User is the parent
// class, TeamMember the subclass). GORM/Go has no real inheritance, so this
// is modeled as an FK-only extension: TeamMember references the Profile it
// extends and only stores the team-specific fields the report lists as new
// on the subclass. It does NOT duplicate Profile's name/email/etc.
type TeamMember struct {
	ID            string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TeamID        string     `gorm:"type:uuid;not null;index" json:"team_id"`
	ProfileID     string     `gorm:"type:uuid;not null;index" json:"profile_id"` // extends Profile
	Profile       Profile    `gorm:"foreignKey:ProfileID" json:"profile,omitempty"`
	Fullname      string     `gorm:"size:150" json:"fullname"`
	GameUID       string     `gorm:"size:100" json:"game_uid"`
	Role          string     `gorm:"size:20" json:"role"` // starter | substitute
	Phone         string     `gorm:"size:30" json:"phone"`
	Position      string     `gorm:"size:20" json:"position"` // captain | member
	SocialContact string     `json:"social_contact"`
	Avatar        string     `json:"avatar"`
	Status        string     `gorm:"size:20;default:'active'" json:"status"` // Active | Pending
	PortfolioID   *string    `gorm:"type:uuid" json:"portfolio_id"`          // 0..1 composition
	Portfolio     *Portfolio `gorm:"foreignKey:PortfolioID" json:"portfolio,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// Portfolio: 0..1 composition on TeamMember (a player's attached résumé/proof file).
// File bytes live on the Go server's local disk; this row only stores the path.
type Portfolio struct {
	ID       string  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	FileName string  `gorm:"size:255" json:"file_name"`
	FileType string  `gorm:"size:20" json:"file_type"`
	FileSize float64 `json:"file_size"`
	FilePath string  `json:"file_path"` // e.g. "/uploads/portfolios/<id>.pdf", served by the Go backend
}

// Notification is the base class. InvitationNotification and
// GeneralNotification are its generalizations (subclasses). GORM has no
// table-per-hierarchy inheritance, so each subclass is a 1-1 extension
// table keyed by NotificationID, and Notification.Type discriminates
// which extension table (if any) holds the extra fields.
type Notification struct {
	ID          string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProfileID   string    `gorm:"type:uuid;not null;index" json:"profile_id"` // recipient
	Title       string    `gorm:"size:200" json:"title"`
	IsRead      bool      `gorm:"default:false" json:"is_read"`
	CreatedDate time.Time `json:"created_date"`
	Type        string    `gorm:"size:20;not null" json:"type"` // "invitation" | "general"
}

// InvitationNotification (subclass of Notification): team-invite specific fields.
type InvitationNotification struct {
	NotificationID string `gorm:"type:uuid;primaryKey" json:"notification_id"`
	InviterTeamID  string `gorm:"type:uuid;not null" json:"inviter_team_id"`
	ActionStatus   string `gorm:"size:20;default:'pending'" json:"action_status"` // pending | accepted | rejected
}

// GeneralNotification (subclass of Notification): system/tournament-update fields.
type GeneralNotification struct {
	NotificationID string `gorm:"type:uuid;primaryKey" json:"notification_id"`
	Message        string `json:"message"`
	Category       string `gorm:"size:50" json:"category"` // e.g. system announcement, tournament update
	ReferenceID    string `gorm:"type:uuid" json:"reference_id"`
}
