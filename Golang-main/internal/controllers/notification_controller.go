package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/SA/Golang-Backend-Example/internal/models"
	"github.com/SA/Golang-Backend-Example/internal/utils"
)

// NotificationController implements the Notification / InvitationNotification
// / GeneralNotification part of Module 4.
type NotificationController struct {
	DB *gorm.DB
}

func NewNotificationController(db *gorm.DB) *NotificationController {
	return &NotificationController{DB: db}
}

// ListMine returns the caller's notifications, newest first, merged with
// whichever subclass row (InvitationNotification or GeneralNotification)
// each one has — GORM has no polymorphic-join for table-per-hierarchy, so
// this batches the two lookups and stitches the result together manually.
func (nc *NotificationController) ListMine(c *gin.Context) {
	profileID, _ := utils.ProfileIDFromContext(c)
	var notifications []models.Notification
	if err := nc.DB.Where("profile_id = ?", profileID).Order("created_date desc").Find(&notifications).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to list notifications", err.Error())
		return
	}

	ids := make([]string, len(notifications))
	for i, n := range notifications {
		ids[i] = n.ID
	}

	invitesByID := map[string]models.InvitationNotification{}
	generalByID := map[string]models.GeneralNotification{}
	if len(ids) > 0 {
		var invites []models.InvitationNotification
		nc.DB.Where("notification_id IN ?", ids).Find(&invites)
		for _, inv := range invites {
			invitesByID[inv.NotificationID] = inv
		}

		var generals []models.GeneralNotification
		nc.DB.Where("notification_id IN ?", ids).Find(&generals)
		for _, g := range generals {
			generalByID[g.NotificationID] = g
		}
	}

	result := make([]gin.H, 0, len(notifications))
	for _, n := range notifications {
		item := gin.H{
			"id": n.ID, "profile_id": n.ProfileID, "title": n.Title,
			"is_read": n.IsRead, "created_date": n.CreatedDate, "type": n.Type,
		}
		if inv, ok := invitesByID[n.ID]; ok {
			item["inviter_team_id"] = inv.InviterTeamID
			item["action_status"] = inv.ActionStatus
		}
		if g, ok := generalByID[n.ID]; ok {
			item["message"] = g.Message
			item["category"] = g.Category
			item["reference_id"] = g.ReferenceID
		}
		result = append(result, item)
	}
	utils.JSONSuccess(c, http.StatusOK, result)
}

// MarkRead flips a notification's IsRead flag.
func (nc *NotificationController) MarkRead(c *gin.Context) {
	if err := nc.DB.Model(&models.Notification{}).Where("id = ?", c.Param("id")).Update("is_read", true).Error; err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to mark as read", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusOK, nil)
}

// Delete removes a notification (and its invitation/general subclass row, if any).
func (nc *NotificationController) Delete(c *gin.Context) {
	id := c.Param("id")
	err := nc.DB.Transaction(func(tx *gorm.DB) error {
		tx.Delete(&models.InvitationNotification{}, "notification_id = ?", id)
		tx.Delete(&models.GeneralNotification{}, "notification_id = ?", id)
		return tx.Delete(&models.Notification{}, "id = ?", id).Error
	})
	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to delete notification", err.Error())
		return
	}
	utils.JSONSuccess(c, http.StatusNoContent, nil)
}

type respondInvitationRequest struct {
	Accept bool `json:"accept"`
}

// RespondInvitation accepts or rejects a team invite. On accept, it adds the
// caller to the inviting team's roster (mirrors TeamController.AddMember).
func (nc *NotificationController) RespondInvitation(c *gin.Context) {
	var req respondInvitationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "invalid request body", err.Error())
		return
	}

	notificationID := c.Param("id")
	var invite models.InvitationNotification
	if err := nc.DB.First(&invite, "notification_id = ?", notificationID).Error; err != nil {
		utils.JSONError(c, http.StatusNotFound, "invitation not found", err.Error())
		return
	}

	invite.ActionStatus = "rejected"
	if req.Accept {
		invite.ActionStatus = "accepted"
	}

	profileID, _ := utils.ProfileIDFromContext(c)

	err := nc.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Omit(clause.Associations).Save(&invite).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.Notification{}).Where("id = ?", notificationID).Update("is_read", true).Error; err != nil {
			return err
		}
		if !req.Accept {
			return nil
		}

		member := models.TeamMember{
			TeamID:    invite.InviterTeamID,
			ProfileID: profileID,
			Position:  "member",
			Role:      "substitute",
			Status:    "active",
		}
		return tx.Omit(clause.Associations).Create(&member).Error
	})
	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to respond to invitation", err.Error())
		return
	}

	utils.JSONSuccess(c, http.StatusOK, invite)
}
