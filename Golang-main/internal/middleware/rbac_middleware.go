package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/SA/Golang-Backend-Example/internal/models"
	"github.com/SA/Golang-Backend-Example/internal/utils"
)

// RequireRole restricts a route to Profiles whose Role.RoleName is one of
// the given names (Module 2: RBAC System). Must run after
// SupabaseAuthMiddleware, which is what populates the Profile ID this
// middleware looks up.
func RequireRole(db *gorm.DB, roleNames ...string) gin.HandlerFunc {
	allowed := make(map[string]bool, len(roleNames))
	for _, r := range roleNames {
		allowed[r] = true
	}

	return func(c *gin.Context) {
		profileID, ok := utils.ProfileIDFromContext(c)
		if !ok {
			utils.JSONError(c, http.StatusUnauthorized, "not authenticated", "")
			c.Abort()
			return
		}

		var profile models.Profile
		if err := db.Preload("Role").First(&profile, "id = ?", profileID).Error; err != nil {
			utils.JSONError(c, http.StatusUnauthorized, "profile not found", err.Error())
			c.Abort()
			return
		}

		if profile.Role == nil || !allowed[profile.Role.RoleName] {
			utils.JSONError(c, http.StatusForbidden, "insufficient permissions", "")
			c.Abort()
			return
		}

		c.Next()
	}
}
