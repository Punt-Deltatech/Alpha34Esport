package controllers

import (
	"net/http"

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
	TeamName    string `json:"team_name" binding:"required"`
	LogoURL     string `json:"logo_url"`
	MaxMember   int    `json:"max_member"`
	SocialURL   string `json:"social_url"`
	Game        string `json:"game"`
	Description string `json:"description"`
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
	Role     *string `json:"role"`
	Position *string `json:"position"`
	Status   *string `json:"status"`
}

// UpdateMember changes a roster entry's role/position/status — e.g. the
// captain promoting/demoting starter <-> substitute, or member <-> captain.
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

	if req.Role != nil {
		member.Role = *req.Role
	}
	if req.Position != nil {
		member.Position = *req.Position
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
