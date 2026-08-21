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

// ProfileController implements Module 1 (Authentication) + Module 2 (RBAC)
// profile endpoints. Sign-up/login/OAuth/password-reset all happen on the
// frontend via the Supabase JS client — this controller only ever deals
// with the Profile row SupabaseAuthMiddleware guarantees already exists by
// the time a handler runs.
type ProfileController struct {
	DB *gorm.DB
}

func NewProfileController(db *gorm.DB) *ProfileController {
	return &ProfileController{DB: db}
}

// GetMe returns the caller's own profile.
func (pc *ProfileController) GetMe(c *gin.Context) {
	profileID, _ := utils.ProfileIDFromContext(c)
	var profile models.Profile
	if err := pc.DB.Preload("Role").First(&profile, "id = ?", profileID).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "profile not found", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, profile)
}

type updateProfileRequest struct {
	Name            *string `json:"name"`
	Gender          *string `json:"gender"`
	PhoneNumber     *string `json:"phone_number"`
	ProfileImageURL *string `json:"profile_image_url"`
}

// UpdateMe lets the caller edit their own display fields only — never
// role/status, which are admin-only (see AssignRole/SetStatus below).
func (pc *ProfileController) UpdateMe(c *gin.Context) {
	var req updateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	profileID, _ := utils.ProfileIDFromContext(c)
	var profile models.Profile
	if err := pc.DB.First(&profile, "id = ?", profileID).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "profile not found", err.Error())
		return
	}

	if req.Name != nil {
		profile.Name = *req.Name
	}
	if req.Gender != nil {
		profile.Gender = *req.Gender
	}
	if req.PhoneNumber != nil {
		profile.PhoneNumber = *req.PhoneNumber
	}
	if req.ProfileImageURL != nil {
		profile.ProfileImageURL = *req.ProfileImageURL
	}

	if err := pc.DB.Omit(clause.Associations).Save(&profile).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to update profile", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, profile)
}

// List returns every profile (Admin only, gated via RequireRole in routes.go).
func (pc *ProfileController) List(c *gin.Context) {
	var profiles []models.Profile
	if err := pc.DB.Preload("Role").Find(&profiles).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to list profiles", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, profiles)
}

// Get returns a single profile by ID (Admin only).
func (pc *ProfileController) Get(c *gin.Context) {
	var profile models.Profile
	if err := pc.DB.Preload("Role").First(&profile, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "profile not found", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, profile)
}

type assignRoleRequest struct {
	RoleID string `json:"role_id" binding:"required"`
}

// AssignRole sets a profile's RBAC role (Admin only).
func (pc *ProfileController) AssignRole(c *gin.Context) {
	var req assignRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	var profile models.Profile
	if err := pc.DB.First(&profile, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "profile not found", err.Error())
		return
	}

	profile.RoleID = &req.RoleID
	if err := pc.DB.Omit(clause.Associations).Save(&profile).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to assign role", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, profile)
}

type setStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=active suspended"`
}

// SetStatus suspends or reactivates a profile (Admin only), and writes an AuditLog entry.
func (pc *ProfileController) SetStatus(c *gin.Context) {
	var req setStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	var profile models.Profile
	if err := pc.DB.First(&profile, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "profile not found", err.Error())
		return
	}

	profile.Status = req.Status
	if err := pc.DB.Omit(clause.Associations).Save(&profile).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to update status", err.Error())
		return
	}

	pc.DB.Create(&models.AuditLog{
		ActorName:         profile.Name,
		ActionType:        "profile_status_changed",
		TargetDescription: profile.ID + " -> " + req.Status,
		Timestamp:         time.Now(),
	})

	utils.JSONSuccess(c, http.StatusOK, profile)
}
