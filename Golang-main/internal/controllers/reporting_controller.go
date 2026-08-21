package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/SA/Golang-Backend-Example/internal/models"
	"github.com/SA/Golang-Backend-Example/internal/utils"
)

// ReportingController implements Module 11: Reporting System — aggregate
// queries for admin dashboards.
type ReportingController struct {
	DB *gorm.DB
}

func NewReportingController(db *gorm.DB) *ReportingController {
	return &ReportingController{DB: db}
}

type dashboardStats struct {
	TotalTournaments     int64            `json:"total_tournaments"`
	TotalTeams           int64            `json:"total_teams"`
	TotalProfiles        int64            `json:"total_profiles"`
	OpenTickets          int64            `json:"open_tickets"`
	ApplicationsByStatus map[string]int64 `json:"applications_by_status"`
}

// Dashboard returns headline counts for the admin dashboard (Admin/Organizer only).
func (rc *ReportingController) Dashboard(c *gin.Context) {
	var stats dashboardStats
	rc.DB.Model(&models.Tournament{}).Count(&stats.TotalTournaments)
	rc.DB.Model(&models.Team{}).Count(&stats.TotalTeams)
	rc.DB.Model(&models.Profile{}).Count(&stats.TotalProfiles)
	rc.DB.Model(&models.Ticket{}).Where("status IN ?", []string{"Pending", "InReview"}).Count(&stats.OpenTickets)

	stats.ApplicationsByStatus = map[string]int64{}
	rows, err := rc.DB.Model(&models.Application{}).Select("status, count(*) as count").Group("status").Rows()
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var status string
			var count int64
			if scanErr := rows.Scan(&status, &count); scanErr == nil {
				stats.ApplicationsByStatus[status] = count
			}
		}
	}

	utils.JSONSuccess(c, http.StatusOK, stats)
}

// FinancialSummaryFor returns (lazily creating if needed) the financial
// roll-up for a tournament, plus its expense/income line items. Nested
// under /tournaments/:id/financial-summary, so the tournament ID param is "id".
func (rc *ReportingController) FinancialSummaryFor(c *gin.Context) {
	tournamentID := c.Param("id")
	var summary models.FinancialSummary
	if err := rc.DB.Where("tournament_id = ?", tournamentID).First(&summary).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			utils.JSONError(c, http.StatusInternalServerError, "failed to load financial summary", err.Error())
			return
		}
		summary = models.FinancialSummary{TournamentID: tournamentID}
		if err := rc.DB.Create(&summary).Error; err != nil {
			utils.JSONError(c, http.StatusInternalServerError, "failed to create financial summary", err.Error())
			return
		}
	}

	var expenses []models.ExpenseItem
	var income []models.IncomeItem
	rc.DB.Where("financial_summary_id = ?", summary.ID).Find(&expenses)
	rc.DB.Where("financial_summary_id = ?", summary.ID).Find(&income)

	utils.JSONSuccess(c, http.StatusOK, gin.H{
		"summary":  summary,
		"expenses": expenses,
		"income":   income,
	})
}
