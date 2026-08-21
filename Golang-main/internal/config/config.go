package config

import (
	"fmt"
	"os"
)

// Config holds application settings loaded from environment variables.
//
// The backend never talks to Supabase Auth's REST API to sign users in — it
// only needs (1) the project's Postgres connection string, to reach the
// same database Supabase manages, and (2) enough to verify access tokens
// the frontend already obtained from the Supabase JS client. Verifying a
// token needs EITHER SupabaseURL (for projects using the modern ES256 "JWT
// Signing Keys", verified against the project's JWKS endpoint) OR
// SupabaseJWTSecret (for projects still on the legacy HS256 shared secret)
// — which one a given token needs is read from the token itself, so both
// can be set at once for portability across projects.
type Config struct {
	DatabaseURL       string // Supabase dashboard: Project Settings -> Database -> Connection string (URI)
	SupabaseURL       string // Supabase dashboard: Project Settings -> API -> Project URL (needed for ES256 JWKS verification)
	SupabaseJWTSecret string // Supabase dashboard: Project Settings -> API -> JWT Secret (legacy HS256 projects only)
	ServerPort        string
	UploadDir         string // local disk folder for Portfolio / DocumentURL / ProofImageURL / PaymentEvidence files
}

// LoadConfig reads environment variables and returns a typed configuration.
func LoadConfig() (*Config, error) {
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}

	cfg := &Config{
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		SupabaseURL:       os.Getenv("SUPABASE_URL"),
		SupabaseJWTSecret: os.Getenv("SUPABASE_JWT_SECRET"),
		ServerPort:        port,
		UploadDir:         uploadDir,
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("missing required environment variable: DATABASE_URL must be set")
	}
	if cfg.SupabaseURL == "" && cfg.SupabaseJWTSecret == "" {
		return nil, fmt.Errorf("missing required environment variables: set SUPABASE_URL (ES256 projects) and/or SUPABASE_JWT_SECRET (legacy HS256 projects)")
	}

	return cfg, nil
}
