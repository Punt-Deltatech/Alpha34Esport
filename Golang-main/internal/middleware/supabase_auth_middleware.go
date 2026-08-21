package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/SA/Golang-Backend-Example/internal/models"
	"github.com/SA/Golang-Backend-Example/internal/utils"
)

// SupabaseAuthMiddleware verifies the Supabase-issued JWT the frontend sends
// (the Supabase JS client attaches it as "Authorization: Bearer <token>"
// automatically once a user is signed in). It never issues or checks a
// password itself — Supabase Auth already did that on the frontend.
//
// On success it guarantees a matching Profile row exists — creating one
// lazily on first sight, in case the `on_auth_user_created` Postgres
// trigger hasn't been set up on this Supabase project yet — and stores the
// Profile ID in the Gin context for downstream handlers.
func SupabaseAuthMiddleware(db *gorm.DB, supabaseURL, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			utils.JSONError(c, http.StatusUnauthorized, "authorization header missing", "provide Authorization: Bearer <supabase access token>")
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := utils.VerifySupabaseJWT(tokenString, supabaseURL, jwtSecret)
		if err != nil {
			utils.JSONError(c, http.StatusUnauthorized, "invalid token", err.Error())
			c.Abort()
			return
		}

		profileID := claims.Subject
		if profileID == "" {
			utils.JSONError(c, http.StatusUnauthorized, "token missing subject", "")
			c.Abort()
			return
		}

		var profile models.Profile
		if err := db.First(&profile, "id = ?", profileID).Error; err != nil {
			profile = models.Profile{
				ID:     profileID,
				Name:   claims.Email,
				Status: "active",
			}
			if err := db.Create(&profile).Error; err != nil {
				utils.JSONError(c, http.StatusInternalServerError, "failed to provision profile", err.Error())
				c.Abort()
				return
			}
		}

		if profile.Status == "suspended" {
			utils.JSONError(c, http.StatusForbidden, "account suspended", "")
			c.Abort()
			return
		}

		now := time.Now()
		db.Model(&models.Profile{}).Where("id = ?", profileID).Update("last_login_at", &now)

		c.Set(utils.ContextProfileIDKey, profileID)
		c.Next()
	}
}
