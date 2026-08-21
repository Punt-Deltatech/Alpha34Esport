package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/SA/Golang-Backend-Example/internal/utils"
)

// CRUD provides generic List/Get/Create/Update/Delete handlers for any GORM
// model with a string ("uuid") primary key. Modules with no special
// business logic (Role, Permission, Referee, WhitelistTeam, Schedule,
// CheatingReport, Account, PrizePlace, Banner, ...) register these
// directly in routes.go; modules that need extra behavior (Team,
// Application, MatchResult, ...) get their own controller file instead.
//
// Every write is Omit(clause.Associations) so that binding a nested
// association object (e.g. {"role": {...}} on a Profile-shaped payload)
// never accidentally upserts the related row — only scalar columns and FK
// ID fields are ever written by these generic handlers.
type CRUD[T any] struct {
	DB *gorm.DB
}

func NewCRUD[T any](db *gorm.DB) *CRUD[T] {
	return &CRUD[T]{DB: db}
}

func (r *CRUD[T]) List(c *gin.Context) {
	var items []T
	if err := r.DB.Find(&items).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to list records", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, items)
}

func (r *CRUD[T]) Get(c *gin.Context) {
	var item T
	if err := r.DB.First(&item, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "record not found", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, item)
}

func (r *CRUD[T]) Create(c *gin.Context) {
	var item T
	if err := c.ShouldBindJSON(&item); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}
	if err := r.DB.Omit(clause.Associations).Create(&item).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to create record", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusCreated, item)
}

// Update loads the existing row first, then unmarshals the request body on
// top of it — JSON fields the client omits keep their existing value
// (a partial-update-friendly pattern), rather than getting zeroed out.
func (r *CRUD[T]) Update(c *gin.Context) {
	var item T
	if err := r.DB.First(&item, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "record not found", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&item); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}
	if err := r.DB.Omit(clause.Associations).Save(&item).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to update record", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, item)
}

func (r *CRUD[T]) Delete(c *gin.Context) {
	var item T
	if err := r.DB.First(&item, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "record not found", err.Error())
		return
	}
	if err := r.DB.Delete(&item).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to delete record", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusNoContent, nil)
}
