package controllers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/SA/Golang-Backend-Example/internal/models"
	"github.com/SA/Golang-Backend-Example/internal/utils"
)

// PrizeController implements Module 9: Prize Management (Payout side —
// Account and PrizePlace CRUD is generic, see routes.go).
type PrizeController struct {
	DB *gorm.DB
}

func NewPrizeController(db *gorm.DB) *PrizeController {
	return &PrizeController{DB: db}
}

func (pc *PrizeController) ListPayouts(c *gin.Context) {
	var payouts []models.Payout
	q := pc.DB
	if teamID := c.Query("team_id"); teamID != "" {
		q = q.Where("team_id = ?", teamID)
	}
	if err := q.Find(&payouts).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to list payouts", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, payouts)
}

type createPayoutRequest struct {
	PrizePlaceID string  `json:"prize_place_id" binding:"required"`
	TeamID       *string `json:"team_id"`
	Amount       float64 `json:"amount" binding:"required"`
}

// CreatePayout records a pending payout for a prize place, optionally
// already tied to the winning team.
func (pc *PrizeController) CreatePayout(c *gin.Context) {
	var req createPayoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}
	payout := models.Payout{
		PrizePlaceID: req.PrizePlaceID,
		TeamID:       req.TeamID,
		Amount:       req.Amount,
		Status:       "Pending",
	}
	if err := pc.DB.Create(&payout).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to create payout", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusCreated, payout)
}

type updatePayoutStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=Pending Processing Paid Failed"`
}

// UpdateStatus transitions a Payout's status and appends a PayoutLog entry;
// marking a payout "Paid" stamps ReleaseDate.
func (pc *PrizeController) UpdateStatus(c *gin.Context) {
	var req updatePayoutStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	var payout models.Payout
	if err := pc.DB.First(&payout, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "payout not found", err.Error())
		return
	}

	payout.Status = req.Status
	if req.Status == "Paid" {
		now := time.Now()
		payout.ReleaseDate = &now
	}

	err := pc.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&payout).Error; err != nil {
			return err
		}
		return tx.Create(&models.PayoutLog{
			PayoutID:  payout.ID,
			Timestamp: time.Now(),
			Detail:    "status changed to " + req.Status,
		}).Error
	})
	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to update payout", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, payout)
}

type attachEvidenceRequest struct {
	FileURL  string `json:"file_url" binding:"required"`
	FileType string `json:"file_type"`
}

// AttachEvidence records proof-of-transfer for a Payout — the file itself is
// uploaded separately via POST /api/v1/uploads (see FileController).
func (pc *PrizeController) AttachEvidence(c *gin.Context) {
	var req attachEvidenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	profileID, _ := utils.ProfileIDFromContext(c)
	evidence := models.PaymentEvidence{
		PayoutID:     c.Param("id"),
		FileURL:      req.FileURL,
		FileType:     req.FileType,
		UploadedAt:   time.Now(),
		UploadedByID: profileID,
	}
	if err := pc.DB.Create(&evidence).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to attach evidence", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusCreated, evidence)
}
