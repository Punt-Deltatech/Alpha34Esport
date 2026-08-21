package controllers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/SA/Golang-Backend-Example/internal/models"
	"github.com/SA/Golang-Backend-Example/internal/utils"
)

// ApplicationController implements Module 5: Registration & Screening.
type ApplicationController struct {
	DB *gorm.DB
}

func NewApplicationController(db *gorm.DB) *ApplicationController {
	return &ApplicationController{DB: db}
}

type submitApplicationRequest struct {
	TournamentID string `json:"tournament_id" binding:"required"`
	TeamID       string `json:"team_id" binding:"required"`
	DocumentURL  string `json:"document_url"` // optional extra attachment, path returned by POST /api/v1/uploads
}

// Submit creates an Application for a Team to enter a Tournament. When the
// tournament requires an attachment, every current roster member must
// already have a Portfolio attached (see TeamController.SetMemberPortfolio)
// — the frontend enforces this client-side too, this is the server-side backstop.
func (ac *ApplicationController) Submit(c *gin.Context) {
	var req submitApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	var detail models.TournamentDetail
	if err := ac.DB.First(&detail, "tournament_id = ?", req.TournamentID).Error; err == nil && detail.RequireAttachment {
		var total, withPortfolio int64
		ac.DB.Model(&models.TeamMember{}).Where("team_id = ?", req.TeamID).Count(&total)
		ac.DB.Model(&models.TeamMember{}).Where("team_id = ? AND portfolio_id IS NOT NULL", req.TeamID).Count(&withPortfolio)
		if total == 0 || withPortfolio < total {
			utils.JSONError(c, http.StatusBadRequest, "portfolio required", "this tournament requires every team member to attach a portfolio before applying")
			return
		}
	}

	application := models.Application{
		TournamentID:  req.TournamentID,
		TeamID:        req.TeamID,
		SubmittedDate: time.Now(),
		Status:        "Pending",
		DocumentURL:   req.DocumentURL,
	}
	if err := ac.DB.Omit(clause.Associations).Create(&application).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to submit application", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusCreated, application)
}

// ListByTournament lists every application submitted to a tournament (for
// screeners), with each team's full roster (profile + portfolio) preloaded
// so the frontend can render the applicant detail panel in one round trip.
// Nested under /tournaments/:id/applications, so the tournament ID param is "id".
func (ac *ApplicationController) ListByTournament(c *gin.Context) {
	var applications []models.Application
	if err := ac.DB.
		Preload("Team").
		Preload("Team.Members").
		Preload("Team.Members.Profile").
		Preload("Team.Members.Portfolio").
		Where("tournament_id = ?", c.Param("id")).
		Find(&applications).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to list applications", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, applications)
}

// ListByTeam lists every application a team has ever submitted, across all
// tournaments — used by the team's own captain/roster to see their status,
// as opposed to ListByTournament (screener-only, sees everyone's applications
// for one tournament). Nested under /teams/:id/applications.
func (ac *ApplicationController) ListByTeam(c *gin.Context) {
	var applications []models.Application
	if err := ac.DB.Preload("Tournament").Where("team_id = ?", c.Param("id")).Find(&applications).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to list applications", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, applications)
}

func (ac *ApplicationController) Get(c *gin.Context) {
	var application models.Application
	if err := ac.DB.
		Preload("Team").
		Preload("Team.Members").
		Preload("Team.Members.Profile").
		Preload("Team.Members.Portfolio").
		Preload("Tournament").
		First(&application, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "application not found", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, application)
}

// ListReviewLogsForTournament returns the full screening history for a
// tournament, most recent first. Nested under /tournaments/:id/review-logs.
func (ac *ApplicationController) ListReviewLogsForTournament(c *gin.Context) {
	var logs []models.ReviewLog
	if err := ac.DB.Where("tournament_id = ?", c.Param("id")).Order("review_date desc").Find(&logs).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to list review logs", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, logs)
}

// ListWhitelistForTournament returns the currently-active approved teams
// for a tournament. Nested under /tournaments/:id/whitelist-teams.
func (ac *ApplicationController) ListWhitelistForTournament(c *gin.Context) {
	var whitelist []models.WhitelistTeam
	if err := ac.DB.Where("tournament_id = ? AND is_active = ?", c.Param("id"), true).Find(&whitelist).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to list whitelist", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, whitelist)
}

type reviewApplicationRequest struct {
	Action       string `json:"action" binding:"required,oneof=Approved Rejected"`
	ScreenerNote string `json:"screener_note"`
}

// Review is the screening decision endpoint (Referee/Organizer/Admin only,
// gated via RequireRole in routes.go). Approving an application creates the
// WhitelistTeam row that grants the team its competing slot; either
// decision writes a ReviewLog entry, matching the report's workflow.
func (ac *ApplicationController) Review(c *gin.Context) {
	var req reviewApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	var application models.Application
	if err := ac.DB.First(&application, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "application not found", err.Error())
		return
	}

	refereeID, _ := utils.ProfileIDFromContext(c)
	now := time.Now()

	err := ac.DB.Transaction(func(tx *gorm.DB) error {
		application.Status = req.Action
		application.ScreenerNote = req.ScreenerNote
		application.ReviewDate = &now

		var team models.Team
		if err := tx.First(&team, "id = ?", application.TeamID).Error; err != nil {
			return err
		}

		if req.Action == "Approved" {
			whitelist := models.WhitelistTeam{
				ApprovedDate:  now,
				IsActive:      true,
				ApplicationID: application.ID,
				TournamentID:  application.TournamentID,
				TeamName:      team.TeamName,
			}
			if err := tx.Create(&whitelist).Error; err != nil {
				return err
			}
			application.WhitelistTeamID = &whitelist.ID
		}

		if err := tx.Omit(clause.Associations).Save(&application).Error; err != nil {
			return err
		}

		// Let the team's manager know the decision — mirrors GeneralNotification in the report.
		title := "Application Rejected"
		message := "Your team was rejected from this tournament."
		if req.Action == "Approved" {
			title = "Application Approved"
			message = "Your team has been approved to compete in this tournament."
		}
		notification := models.Notification{
			ProfileID:   team.ManagerID,
			Title:       title,
			IsRead:      false,
			CreatedDate: now,
			Type:        "general",
		}
		if err := tx.Create(&notification).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.GeneralNotification{
			NotificationID: notification.ID,
			Message:        message,
			Category:       "application_decision",
			ReferenceID:    application.ID,
		}).Error; err != nil {
			return err
		}

		return tx.Create(&models.ReviewLog{
			ApplicationID: application.ID,
			TournamentID:  application.TournamentID,
			Action:        req.Action,
			RefereeID:     refereeID,
			ReviewDate:    now,
			ScreenerNote:  req.ScreenerNote,
		}).Error
	})
	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to review application", err.Error())
		return
	}

	utils.JSONSuccess(c, http.StatusOK, application)
}
