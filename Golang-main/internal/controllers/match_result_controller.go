package controllers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/SA/Golang-Backend-Example/internal/models"
	"github.com/SA/Golang-Backend-Example/internal/utils"
)

// MatchResultController implements Module 8: Match Results System.
type MatchResultController struct {
	DB *gorm.DB
}

func NewMatchResultController(db *gorm.DB) *MatchResultController {
	return &MatchResultController{DB: db}
}

type submitResultRequest struct {
	MatchID       string `json:"match_id" binding:"required"`
	WinnerTeamID  string `json:"winner_team_id" binding:"required"`
	ScoreTeam1    int    `json:"score_team1"`
	ScoreTeam2    int    `json:"score_team2"`
	SubmittedBy   string `json:"submitted_by"`
	ProofImageURL string `json:"proof_image_url"`
}

// Submit records a MatchResult, marks the Match finished with its winner,
// records both teams' participation via MatchParticipant, and performs a
// simplified automatic bracket progression: if a next-round Match exists
// for this tournament with an open team slot, the winner is placed into it.
func (mrc *MatchResultController) Submit(c *gin.Context) {
	var req submitResultRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	var match models.Match
	if err := mrc.DB.First(&match, "id = ?", req.MatchID).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "match not found", err.Error())
		return
	}

	result := models.MatchResult{
		MatchID:       req.MatchID,
		WinnerTeamID:  &req.WinnerTeamID,
		ScoreTeam1:    req.ScoreTeam1,
		ScoreTeam2:    req.ScoreTeam2,
		SubmittedBy:   req.SubmittedBy,
		ProofImageURL: req.ProofImageURL,
	}

	err := mrc.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&result).Error; err != nil {
			return err
		}

		match.WinnerID = &req.WinnerTeamID
		match.MatchStatus = "Finished"
		if err := tx.Save(&match).Error; err != nil {
			return err
		}

		for _, teamID := range []*string{match.TeamAID, match.TeamBID} {
			if teamID == nil {
				continue
			}
			if err := tx.Create(&models.MatchParticipant{MatchResultID: result.ID, TeamID: *teamID}).Error; err != nil {
				return err
			}
		}

		// Simplified single-elimination progression: find the next round's
		// first Match still missing a team slot and place the winner there.
		var nextMatch models.Match
		err := tx.Where("tournament_id = ? AND round_number = ? AND (team_a_id IS NULL OR team_b_id IS NULL)",
			match.TournamentID, match.RoundNumber+1).
			Order("id").
			First(&nextMatch).Error
		switch err {
		case nil:
			if nextMatch.TeamAID == nil {
				nextMatch.TeamAID = &req.WinnerTeamID
			} else {
				nextMatch.TeamBID = &req.WinnerTeamID
			}
			return tx.Save(&nextMatch).Error
		case gorm.ErrRecordNotFound:
			return nil // final round — nothing to progress into
		default:
			return err
		}
	})
	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to submit result", err.Error())
		return
	}

	utils.JSONSuccess(c, http.StatusCreated, result)
}

func (mrc *MatchResultController) Get(c *gin.Context) {
	var result models.MatchResult
	if err := mrc.DB.First(&result, "match_id = ?", c.Param("matchId")).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "result not found", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, result)
}

type submitCheatingReportRequest struct {
	IssueType   string   `json:"issue_type" binding:"required"`
	Description string   `json:"description"`
	TeamIDs     []string `json:"team_ids" binding:"required"`
}

// SubmitCheatingReport lets a Referee file a report implicating one or more teams.
func (mrc *MatchResultController) SubmitCheatingReport(c *gin.Context) {
	var req submitCheatingReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	profileID, _ := utils.ProfileIDFromContext(c)
	var referee models.Referee
	if err := mrc.DB.Where("profile_id = ?", profileID).First(&referee).Error; err != nil {
		utils.JSONError(c, http.StatusForbidden, "not registered as a referee", err.Error())
		return
	}

	report := models.CheatingReport{
		IssueType:   req.IssueType,
		Description: req.Description,
		ReportDate:  time.Now(),
		RefereeID:   referee.ID,
	}

	err := mrc.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&report).Error; err != nil {
			return err
		}
		for _, teamID := range req.TeamIDs {
			if err := tx.Create(&models.CheatingReportTeam{CheatingReportID: report.ID, TeamID: teamID}).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to submit report", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusCreated, report)
}
