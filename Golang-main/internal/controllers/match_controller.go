package controllers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/SA/Golang-Backend-Example/internal/models"
	"github.com/SA/Golang-Backend-Example/internal/utils"
)

// MatchController implements Module 6: Scheduling System (match making /
// bracket generation).
type MatchController struct {
	DB *gorm.DB
}

func NewMatchController(db *gorm.DB) *MatchController {
	return &MatchController{DB: db}
}

// ListByTournament is nested under /tournaments/:id/matches, so the
// tournament ID param is "id".
func (mc *MatchController) ListByTournament(c *gin.Context) {
	var matches []models.Match
	if err := mc.DB.Where("tournament_id = ?", c.Param("id")).Order("round_number").Find(&matches).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to list matches", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, matches)
}

func (mc *MatchController) Get(c *gin.Context) {
	var match models.Match
	if err := mc.DB.First(&match, "id = ?", c.Param("id")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "match not found", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, match)
}

type createMatchRequest struct {
	TournamentID  string    `json:"tournament_id" binding:"required"`
	RoundNumber   int       `json:"round_number"`
	ScheduledTime time.Time `json:"scheduled_time"`
	ServerInfo    string    `json:"server_info"`
	TeamAID       *string   `json:"team_a_id"`
	TeamBID       *string   `json:"team_b_id"`
}

func (mc *MatchController) Create(c *gin.Context) {
	var req createMatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}
	match := models.Match{
		TournamentID:  req.TournamentID,
		RoundNumber:   req.RoundNumber,
		ScheduledTime: req.ScheduledTime,
		MatchStatus:   "Scheduled",
		ServerInfo:    req.ServerInfo,
		TeamAID:       req.TeamAID,
		TeamBID:       req.TeamBID,
	}
	if err := mc.DB.Create(&match).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to create match", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusCreated, match)
}

// GenerateBracket builds round 1 of a single-elimination bracket from every
// team currently on the tournament's whitelist, pairing them in whitelist
// order. Intentionally simple (no seeding) — nested under
// /tournaments/:id/matches/generate-bracket, so the tournament ID param is "id".
func (mc *MatchController) GenerateBracket(c *gin.Context) {
	tournamentID := c.Param("id")

	var whitelist []models.WhitelistTeam
	if err := mc.DB.Where("tournament_id = ? AND is_active = ?", tournamentID, true).Find(&whitelist).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to load whitelisted teams", err.Error())
		return
	}
	if len(whitelist) < 2 {
		utils.JSONError(c, http.StatusConflict, "not enough whitelisted teams", "need at least 2 teams to generate a bracket")
		return
	}

	// WhitelistTeam only stores TeamName, so resolve back to Team IDs.
	var teamIDs []string
	for _, w := range whitelist {
		var team models.Team
		if err := mc.DB.Select("id").Where("team_name = ?", w.TeamName).First(&team).Error; err == nil {
			teamIDs = append(teamIDs, team.ID)
		}
	}

	var matches []models.Match
	for i := 0; i+1 < len(teamIDs); i += 2 {
		a, b := teamIDs[i], teamIDs[i+1]
		matches = append(matches, models.Match{
			TournamentID: tournamentID,
			RoundNumber:  1,
			MatchStatus:  "Scheduled",
			TeamAID:      &a,
			TeamBID:      &b,
		})
	}
	if len(teamIDs)%2 == 1 {
		// odd team out gets a bye straight into round 1 as TeamA with no opponent yet
		bye := teamIDs[len(teamIDs)-1]
		matches = append(matches, models.Match{
			TournamentID: tournamentID,
			RoundNumber:  1,
			MatchStatus:  "Scheduled",
			TeamAID:      &bye,
		})
	}

	if err := mc.DB.Create(&matches).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to create bracket", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusCreated, matches)
}
