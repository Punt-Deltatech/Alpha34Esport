package utils

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// ContextProfileIDKey is the Gin context key SupabaseAuthMiddleware stores
// the authenticated Profile ID under.
const ContextProfileIDKey = "profile_id"

// SupabaseClaims mirrors the subset of fields Supabase puts in its access
// token JWT that this backend cares about. "sub" (RegisteredClaims.Subject)
// is the Supabase auth.users.id, which is also this app's Profile.ID.
type SupabaseClaims struct {
	Email string `json:"email"`
	Role  string `json:"role"` // Supabase's own "authenticated"/"anon" role — NOT this app's RBAC Role
	jwt.RegisteredClaims
}

// VerifySupabaseJWT validates a Supabase-issued access token against the
// project's JWT secret (Project Settings -> API -> JWT Secret in the
// Supabase dashboard) and returns its claims.
func VerifySupabaseJWT(tokenString, secret string) (*SupabaseClaims, error) {
	claims := &SupabaseClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

// ProfileIDFromContext reads the authenticated Profile ID set by
// SupabaseAuthMiddleware.
func ProfileIDFromContext(c *gin.Context) (string, bool) {
	raw, ok := c.Get(ContextProfileIDKey)
	if !ok {
		return "", false
	}
	id, ok := raw.(string)
	return id, ok
}
