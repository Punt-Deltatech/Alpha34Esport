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

// NewsController implements the News half of Module 10: PR & Announcement.
// (Banner is straightforward enough to use the generic CRUD[models.Banner]
// directly — see routes.go.)
type NewsController struct {
	DB *gorm.DB
}

func NewNewsController(db *gorm.DB) *NewsController {
	return &NewsController{DB: db}
}

func (nc *NewsController) List(c *gin.Context) {
	var news []models.News
	if err := nc.DB.Order("is_pinned desc, published_at desc").Find(&news).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to list news", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, news)
}

type createNewsRequest struct {
	Title    string `json:"title" binding:"required"`
	Content  string `json:"content"`
	Category string `json:"category"`
	IsPinned bool   `json:"is_pinned"`
}

// Create authors a News post as the calling Profile (Organizer/Admin, per routes.go).
func (nc *NewsController) Create(c *gin.Context) {
	var req createNewsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	managerID, _ := utils.ProfileIDFromContext(c)
	now := time.Now()
	news := models.News{
		ManagerID:   managerID,
		Title:       req.Title,
		Content:     req.Content,
		Category:    req.Category,
		IsPinned:    req.IsPinned,
		PublishedAt: &now,
	}
	if err := nc.DB.Omit(clause.Associations).Create(&news).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to create news", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusCreated, news)
}

func (nc *NewsController) Update(c *gin.Context) {
	var news models.News
	if err := nc.DB.First(&news, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "news not found", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&news); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}
	if err := nc.DB.Omit(clause.Associations).Save(&news).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to update news", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, news)
}

func (nc *NewsController) Delete(c *gin.Context) {
	if err := nc.DB.Delete(&models.News{}, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to delete news", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusNoContent, nil)
}
