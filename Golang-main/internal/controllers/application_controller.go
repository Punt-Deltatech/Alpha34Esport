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
	DocumentURL  string `json:"document_url"` // path returned by POST /api/v1/uploads, if the tournament requires an attachment
}

// Submit creates an Application for a Team to enter a Tournament.
func (ac *ApplicationController) Submit(c *gin.Context) {
	var req submitApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	var detail models.TournamentDetail
	if err := ac.DB.First(&detail, "tournament_id = ?", req.TournamentID).Error; err == nil {
		if detail.RequireAttachment && req.DocumentURL == "" {
			utils.JSONError(c, http.StatusBadRequest, "document attachment required", "this tournament requires an attachment")
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

// ListByTournament lists every application submitted to a tournament (for screeners).
// Nested under /tournaments/:id/applications, so the tournament ID param is "id".
func (ac *ApplicationController) ListByTournament(c *gin.Context) {
	var applications []models.Application
	if err := ac.DB.Preload("Team").Where("tournament_id = ?", c.Param("id")).Find(&applications).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to list applications", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, applications)
}

func (ac *ApplicationController) Get(c *gin.Context) {
	var application models.Application
	if err := ac.DB.Preload("Team").Preload("Tournament").First(&application, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "application not found", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, application)
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

		if req.Action == "Approved" {
			var team models.Team
			if err := tx.First(&team, "id = ?", application.TeamID).Error; err != nil {
				return err
			}
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
