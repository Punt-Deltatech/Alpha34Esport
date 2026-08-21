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

// TicketController implements Module 12: Ticketing / Complaint System.
type TicketController struct {
	DB *gorm.DB
}

func NewTicketController(db *gorm.DB) *TicketController {
	return &TicketController{DB: db}
}

type createTicketRequest struct {
	TargetType  string `json:"target_type" binding:"required"` // User | Team | Match | Tournament | Other
	TargetID    string `json:"target_id"`
	Category    string `json:"category" binding:"required"`
	Subject     string `json:"subject" binding:"required"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
}

// Create files a new ticket/complaint as the caller.
func (tc *TicketController) Create(c *gin.Context) {
	var req createTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	priority := req.Priority
	if priority == "" {
		priority = "Normal"
	}

	reporterID, _ := utils.ProfileIDFromContext(c)
	ticket := models.Ticket{
		ReporterID:  reporterID,
		TargetType:  req.TargetType,
		TargetID:    req.TargetID,
		Category:    req.Category,
		Subject:     req.Subject,
		Description: req.Description,
		Status:      "Pending",
		Priority:    priority,
	}
	if err := tc.DB.Omit(clause.Associations).Create(&ticket).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to create ticket", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusCreated, ticket)
}

// ListMine returns the caller's own filed tickets.
func (tc *TicketController) ListMine(c *gin.Context) {
	reporterID, _ := utils.ProfileIDFromContext(c)
	var tickets []models.Ticket
	if err := tc.DB.Where("reporter_id = ?", reporterID).Order("created_at desc").Find(&tickets).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to list tickets", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, tickets)
}

// List returns every ticket, optionally filtered by ?status= (Admin only).
func (tc *TicketController) List(c *gin.Context) {
	var tickets []models.Ticket
	q := tc.DB.Order("created_at desc")
	if status := c.Query("status"); status != "" {
		q = q.Where("status = ?", status)
	}
	if err := q.Find(&tickets).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to list tickets", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, tickets)
}

func (tc *TicketController) Get(c *gin.Context) {
	var ticket models.Ticket
	if err := tc.DB.First(&ticket, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "ticket not found", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, ticket)
}

type assignTicketRequest struct {
	AssignedToID string `json:"assigned_to_id" binding:"required"`
}

// Assign hands a ticket to an admin for handling.
func (tc *TicketController) Assign(c *gin.Context) {
	var req assignTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	var ticket models.Ticket
	if err := tc.DB.First(&ticket, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "ticket not found", err.Error())
		return
	}
	ticket.AssignedToID = &req.AssignedToID
	ticket.Status = "InReview"
	if err := tc.DB.Omit(clause.Associations).Save(&ticket).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to assign ticket", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, ticket)
}

type resolveTicketRequest struct {
	Status     string `json:"status" binding:"required,oneof=Resolved Rejected"`
	Resolution string `json:"resolution"`
}

// Resolve closes out a ticket with a resolution note.
func (tc *TicketController) Resolve(c *gin.Context) {
	var req resolveTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	var ticket models.Ticket
	if err := tc.DB.First(&ticket, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "ticket not found", err.Error())
		return
	}

	now := time.Now()
	ticket.Status = req.Status
	ticket.Resolution = req.Resolution
	ticket.ResolvedAt = &now
	if err := tc.DB.Omit(clause.Associations).Save(&ticket).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to resolve ticket", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, ticket)
}
