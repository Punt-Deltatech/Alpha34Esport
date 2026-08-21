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

// TournamentController implements Module 3: Tournament Management.
type TournamentController struct {
	DB *gorm.DB
}

func NewTournamentController(db *gorm.DB) *TournamentController {
	return &TournamentController{DB: db}
}

func (tc *TournamentController) List(c *gin.Context) {
	var tournaments []models.Tournament
	if err := tc.DB.Preload("Detail").Find(&tournaments).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to list tournaments", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, tournaments)
}

func (tc *TournamentController) Get(c *gin.Context) {
	var tournament models.Tournament
	if err := tc.DB.Preload("Detail").First(&tournament, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "tournament not found", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, tournament)
}

type createTournamentRequest struct {
	Name      string    `json:"tournament_name" binding:"required"`
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
	BannerURL string    `json:"banner_url"`
	Game      string    `json:"game"`
	Detail    struct {
		MaxTeam           int       `json:"max_team"`
		RegisterDeadline  time.Time `json:"register_deadline"`
		PrizePool         float64   `json:"prize_pool"`
		Description       string    `json:"description"`
		Format            string    `json:"format"`
		RequireAttachment bool      `json:"require_attachment"`
		Organizer         string    `json:"organizer"`
	} `json:"detail"`
}

// Create makes a Tournament + its 1-1 TournamentDetail together, owned by
// the calling Profile (Organizer/Admin).
func (tc *TournamentController) Create(c *gin.Context) {
	var req createTournamentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	organizerID, _ := utils.ProfileIDFromContext(c)
	tournament := models.Tournament{
		Name:        req.Name,
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		BannerURL:   req.BannerURL,
		Game:        req.Game,
		Status:      "Draft",
		OrganizerID: organizerID,
	}

	err := tc.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Omit(clause.Associations).Create(&tournament).Error; err != nil {
			return err
		}
		detail := models.TournamentDetail{
			TournamentID:      tournament.ID,
			MaxTeam:           req.Detail.MaxTeam,
			RegisterDeadline:  req.Detail.RegisterDeadline,
			PrizePool:         req.Detail.PrizePool,
			Description:       req.Detail.Description,
			Format:            req.Detail.Format,
			RequireAttachment: req.Detail.RequireAttachment,
			Organizer:         req.Detail.Organizer,
		}
		return tx.Create(&detail).Error
	})
	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to create tournament", err.Error())
		return
	}

	utils.JSONSuccess(c, http.StatusCreated, tournament)
}

// Update edits a Tournament's top-level fields and records a TournamentHistory entry.
func (tc *TournamentController) Update(c *gin.Context) {
	var tournament models.Tournament
	if err := tc.DB.First(&tournament, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "tournament not found", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&tournament); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}
	if err := tc.DB.Omit(clause.Associations).Save(&tournament).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to update tournament", err.Error())
		return
	}

	profileID, _ := utils.ProfileIDFromContext(c)
	tc.DB.Create(&models.TournamentHistory{
		TournamentID: tournament.ID,
		ChangedBy:    profileID,
		Description:  "tournament details updated",
		Timestamp:    time.Now(),
	})

	utils.JSONSuccess(c, http.StatusOK, tournament)
}

func (tc *TournamentController) Delete(c *gin.Context) {
	if err := tc.DB.Delete(&models.Tournament{}, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to delete tournament", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusNoContent, nil)
}

// History returns the edit trail for a tournament.
func (tc *TournamentController) History(c *gin.Context) {
	var history []models.TournamentHistory
	if err := tc.DB.Where("tournament_id = ?", c.Param("id")).Order("timestamp desc").Find(&history).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to load history", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, history)
}
