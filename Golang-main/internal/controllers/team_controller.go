package controllers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/SA/Golang-Backend-Example/internal/models"
	"github.com/SA/Golang-Backend-Example/internal/utils"
)

// TeamController implements Module 4: Team & Member Management.
type TeamController struct {
	DB *gorm.DB
}

func NewTeamController(db *gorm.DB) *TeamController {
	return &TeamController{DB: db}
}

func (tc *TeamController) List(c *gin.Context) {
	var teams []models.Team
	if err := tc.DB.Preload("Members").Find(&teams).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to list teams", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, teams)
}

func (tc *TeamController) Get(c *gin.Context) {
	var team models.Team
	if err := tc.DB.Preload("Members.Profile").Preload("Members.Portfolio").First(&team, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "team not found", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, team)
}

type createTeamRequest struct {
	TeamName        string `json:"team_name" binding:"required"`
	LogoURL         string `json:"logo_url"`
	MaxMember       int    `json:"max_member"`
	SocialURL       string `json:"social_url"`
	Game            string `json:"game"`
	Description     string `json:"description"`
	CaptainFullname string `json:"captain_fullname"` // display name for the auto-created captain roster row
}

// Create makes a new team with the caller as its Manager, then adds the
// caller as the team's first TeamMember (captain, starter).
func (tc *TeamController) Create(c *gin.Context) {
	var req createTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	profileID, _ := utils.ProfileIDFromContext(c)
	maxMember := req.MaxMember
	if maxMember == 0 {
		maxMember = 5
	}

	team := models.Team{
		TeamName:    req.TeamName,
		LogoURL:     req.LogoURL,
		MaxMember:   maxMember,
		SocialURL:   req.SocialURL,
		Game:        req.Game,
		Description: req.Description,
		ManagerID:   profileID,
	}

	err := tc.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Omit(clause.Associations).Create(&team).Error; err != nil {
			return err
		}
		captain := models.TeamMember{
			TeamID:    team.ID,
			ProfileID: profileID,
			Fullname:  req.CaptainFullname,
			Position:  "captain",
			Role:      "starter",
			Status:    "active",
		}
		return tx.Omit(clause.Associations).Create(&captain).Error
	})
	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to create team", err.Error())
		return
	}

	utils.JSONSuccess(c, http.StatusCreated, team)
}

func (tc *TeamController) Update(c *gin.Context) {
	var team models.Team
	if err := tc.DB.First(&team, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "team not found", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&team); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}
	if err := tc.DB.Omit(clause.Associations).Save(&team).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to update team", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, team)
}

func (tc *TeamController) Delete(c *gin.Context) {
	if err := tc.DB.Delete(&models.Team{}, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to delete team", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusNoContent, nil)
}

type addMemberRequest struct {
	ProfileID     string `json:"profile_id" binding:"required"`
	Fullname      string `json:"fullname"`
	GameUID       string `json:"game_uid"`
	Role          string `json:"role"` // starter | substitute
	Phone         string `json:"phone"`
	Position      string `json:"position"` // captain | member — defaults to "member"
	SocialContact string `json:"social_contact"`
	Avatar        string `json:"avatar"`
}

// AddMember adds a player to the roster. NotificationController.RespondInvitation
// performs the same insert when an invite is accepted.
func (tc *TeamController) AddMember(c *gin.Context) {
	var req addMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	teamID := c.Param("id")
	var team models.Team
	if err := tc.DB.Preload("Members").First(&team, "id = ?", teamID).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "team not found", err.Error())
		return
	}
	if len(team.Members) >= team.MaxMember {
		utils.JSONError(c, http.StatusConflict, "roster is full", "")
		return
	}

	position := req.Position
	if position == "" {
		position = "member"
	}

	member := models.TeamMember{
		TeamID:        teamID,
		ProfileID:     req.ProfileID,
		Fullname:      req.Fullname,
		GameUID:       req.GameUID,
		Role:          req.Role,
		Phone:         req.Phone,
		Position:      position,
		SocialContact: req.SocialContact,
		Avatar:        req.Avatar,
		Status:        "active",
	}
	if err := tc.DB.Omit(clause.Associations).Create(&member).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to add member", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusCreated, member)
}

// RemoveMember removes a player from the roster.
func (tc *TeamController) RemoveMember(c *gin.Context) {
	if err := tc.DB.Delete(&models.TeamMember{}, "id = ? AND team_id = ?", c.Param("memberId"), c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to remove member", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusNoContent, nil)
}

type updateMemberRequest struct {
	Fullname      *string `json:"fullname"`
	GameUID       *string `json:"game_uid"`
	Role          *string `json:"role"`
	Phone         *string `json:"phone"`
	Position      *string `json:"position"`
	SocialContact *string `json:"social_contact"`
	Avatar        *string `json:"avatar"` // base64 data URL or plain URL — stored as-is, no separate upload needed
	Status        *string `json:"status"`
}

// UpdateMember edits a roster entry: either the member's own profile fields
// (fullname/game_uid/phone/social_contact/avatar — self-service) or, when
// the captain calls it, role/position/status.
func (tc *TeamController) UpdateMember(c *gin.Context) {
	var req updateMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	var member models.TeamMember
	if err := tc.DB.First(&member, "id = ? AND team_id = ?", c.Param("memberId"), c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "member not found", err.Error())
		return
	}

	if req.Fullname != nil {
		member.Fullname = *req.Fullname
	}
	if req.GameUID != nil {
		member.GameUID = *req.GameUID
	}
	if req.Role != nil {
		member.Role = *req.Role
	}
	if req.Phone != nil {
		member.Phone = *req.Phone
	}
	if req.Position != nil {
		member.Position = *req.Position
	}
	if req.SocialContact != nil {
		member.SocialContact = *req.SocialContact
	}
	if req.Avatar != nil {
		member.Avatar = *req.Avatar
	}
	if req.Status != nil {
		member.Status = *req.Status
	}

	if err := tc.DB.Omit(clause.Associations).Save(&member).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to update member", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, member)
}

type setMemberPortfolioRequest struct {
	FileName string  `json:"file_name" binding:"required"`
	FileType string  `json:"file_type"`
	FileSize float64 `json:"file_size"`
	FilePath string  `json:"file_path" binding:"required"` // returned by POST /api/v1/uploads
}

// SetMemberPortfolio creates the Portfolio row for an already-uploaded file
// (see FileController.Upload) and attaches it to a roster entry (0..1
// composition, TeamMember.PortfolioID).
func (tc *TeamController) SetMemberPortfolio(c *gin.Context) {
	var req setMemberPortfolioRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	var member models.TeamMember
	if err := tc.DB.First(&member, "id = ? AND team_id = ?", c.Param("memberId"), c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "member not found", err.Error())
		return
	}

	portfolio := models.Portfolio{
		FileName: req.FileName,
		FileType: req.FileType,
		FileSize: req.FileSize,
		FilePath: req.FilePath,
	}

	err := tc.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&portfolio).Error; err != nil {
			return err
		}
		member.PortfolioID = &portfolio.ID
		return tx.Omit(clause.Associations).Save(&member).Error
	})
	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to attach portfolio", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusCreated, portfolio)
}

type inviteMemberRequest struct {
	ProfileID string `json:"profile_id" binding:"required"`
}

// InviteMember sends a team-invite Notification to a Profile; they must
// accept it via NotificationController.RespondInvitation before a
// TeamMember row is created — direct roster changes without consent go
// through AddMember instead.
func (tc *TeamController) InviteMember(c *gin.Context) {
	var req inviteMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	teamID := c.Param("id")
	var team models.Team
	if err := tc.DB.First(&team, "id = ?", teamID).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "team not found", err.Error())
		return
	}

	notification := models.Notification{
		ProfileID:   req.ProfileID,
		Title:       fmt.Sprintf("Invitation to join team %q", team.TeamName),
		IsRead:      false,
		CreatedDate: time.Now(),
		Type:        "invitation",
	}

	err := tc.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&notification).Error; err != nil {
			return err
		}
		return tx.Create(&models.InvitationNotification{
			NotificationID: notification.ID,
			InviterTeamID:  teamID,
			ActionStatus:   "pending",
		}).Error
	})
	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to send invitation", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusCreated, notification)
}
