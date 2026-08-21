package utils

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"sync"

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

// --- JWKS (ES256 / "JWT Signing Keys") support -----------------------------
//
// Newer Supabase projects (including a fresh `supabase start` local stack)
// sign access tokens with an ES256 key pair instead of the legacy HS256
// shared secret, and publish the public half at
// {SUPABASE_URL}/auth/v1/.well-known/jwks.json. Verified this against a real
// local instance — its tokens come back with `"alg":"ES256"` in the header,
// not HS256, so both schemes are supported below and selected per-token by
// its actual signing method.

type jwk struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
}

type jwksResponse struct {
	Keys []jwk `json:"keys"`
}

var (
	jwksCacheMu sync.Mutex
	jwksCache   = map[string]*ecdsa.PublicKey{} // "<supabaseURL>#<kid>" -> public key
)

func fetchJWK(supabaseURL, kid string) (*ecdsa.PublicKey, error) {
	cacheKey := supabaseURL + "#" + kid
	jwksCacheMu.Lock()
	if key, ok := jwksCache[cacheKey]; ok {
		jwksCacheMu.Unlock()
		return key, nil
	}
	jwksCacheMu.Unlock()

	resp, err := http.Get(supabaseURL + "/auth/v1/.well-known/jwks.json")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var parsed jwksResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}

	jwksCacheMu.Lock()
	defer jwksCacheMu.Unlock()
	var found *ecdsa.PublicKey
	for _, k := range parsed.Keys {
		if k.Kty != "EC" || k.Crv != "P-256" {
			continue // only P-256/ES256 keys are supported — matches what Supabase issues today
		}
		xBytes, err := base64.RawURLEncoding.DecodeString(k.X)
		if err != nil {
			continue
		}
		yBytes, err := base64.RawURLEncoding.DecodeString(k.Y)
		if err != nil {
			continue
		}
		pub := &ecdsa.PublicKey{
			Curve: elliptic.P256(),
			X:     new(big.Int).SetBytes(xBytes),
			Y:     new(big.Int).SetBytes(yBytes),
		}
		jwksCache[supabaseURL+"#"+k.Kid] = pub
		if k.Kid == kid {
			found = pub
		}
	}
	if found == nil {
		return nil, fmt.Errorf("no matching JWK found for kid %q", kid)
	}
	return found, nil
}

// VerifySupabaseJWT validates a Supabase-issued access token. Supports both
// the modern ES256 "JWT Signing Keys" scheme (verified against the
// project's JWKS endpoint, needs SUPABASE_URL) and the legacy HS256
// shared-secret scheme (Project Settings -> API -> JWT Secret, needs
// SUPABASE_JWT_SECRET) — which one a given token uses is read from its own
// header, so a single deployment can verify either without configuration.
func VerifySupabaseJWT(tokenString, supabaseURL, hs256Secret string) (*SupabaseClaims, error) {
	claims := &SupabaseClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		switch token.Method.(type) {
		case *jwt.SigningMethodECDSA:
			kid, _ := token.Header["kid"].(string)
			if kid == "" || supabaseURL == "" {
				return nil, errors.New("ES256 token requires a kid header and SUPABASE_URL to verify")
			}
			return fetchJWK(supabaseURL, kid)
		case *jwt.SigningMethodHMAC:
			if hs256Secret == "" {
				return nil, errors.New("HS256 token requires SUPABASE_JWT_SECRET to verify")
			}
			return []byte(hs256Secret), nil
		default:
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
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
