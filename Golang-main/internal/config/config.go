package config

import (
	"fmt"
	"os"
)

// Config holds application settings loaded from environment variables.
//
// The backend never talks to Supabase Auth's REST API directly — it only
// needs (1) the project's Postgres connection string, to reach the same
// database Supabase manages, and (2) the project's JWT secret, to verify
// access tokens the frontend already obtained from the Supabase JS client.
type Config struct {
	DatabaseURL       string // Supabase dashboard: Project Settings -> Database -> Connection string (URI)
	SupabaseJWTSecret string // Supabase dashboard: Project Settings -> API -> JWT Secret
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
		SupabaseJWTSecret: os.Getenv("SUPABASE_JWT_SECRET"),
		ServerPort:        port,
		UploadDir:         uploadDir,
	}

	if cfg.DatabaseURL == "" || cfg.SupabaseJWTSecret == "" {
		return nil, fmt.Errorf("missing required environment variables: DATABASE_URL and SUPABASE_JWT_SECRET must be set")
	}

	return cfg, nil
}
