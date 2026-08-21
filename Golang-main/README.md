# Esport Tournament Management — Go Backend

REST API backend for the Team13 Esport Tournament Management System, built
with Go, Gin, GORM, and a Supabase-managed PostgreSQL database. Covers all
12 modules of the system (Auth/RBAC, Tournament Management, Team & Member
Management, Registration & Screening, Scheduling, Coordination, Match
Results, Prize Management, PR & Announcement, Reporting, Ticketing).

## Architecture

- **Auth**: Supabase Auth (email/password, OAuth) — handled entirely on the
  frontend via the Supabase JS client. This backend never sees a password;
  it only verifies the Supabase-issued JWT on every request
  (`internal/middleware/supabase_auth_middleware.go`) and trusts the
  token's `sub` claim as the `Profile.ID`.
- **Database**: Supabase's managed PostgreSQL, reached via a normal GORM +
  `gorm.io/driver/postgres` connection using the project's connection
  string. `Profile` is the `public` schema counterpart of Supabase's
  `auth.users` — same UUID, holds only app-specific fields (role, display
  name, status, ...).
- **RBAC**: `internal/middleware/rbac_middleware.go`'s `RequireRole(db, "Admin", ...)`
  gates sensitive routes by the caller's `Profile.Role.RoleName`.
- **Layers**: Route -> Middleware -> Controller -> GORM, same
  Route/Controller flow as before. Straightforward resources (Role,
  Permission, Referee, WhitelistTeam, Schedule, CheatingReport, Account,
  PrizePlace, Banner) are served by a generic `CRUD[T]` controller
  (`internal/controllers/generic_controller.go`) instead of writing nearly
  identical List/Get/Create/Update/Delete handlers 20+ times; modules with
  real workflow logic (Team, Application review, MatchResult submission +
  bracket progression, Payout, Ticket, ...) get their own controller.
- **File uploads**: Portfolio / Application.DocumentURL /
  MatchResult.ProofImageURL / PaymentEvidence all go through one shared
  local-disk endpoint (`POST /api/v1/uploads`), served back at `/uploads/...`.

## Project Structure

- `cmd/server/` — application entry point
- `internal/config/` — env config, Supabase Postgres connection + AutoMigrate, RBAC role seeding
- `internal/models/` — GORM models, one file per module (see table below)
- `internal/middleware/` — Supabase JWT verification, RBAC role guard, CORS
- `internal/controllers/` — HTTP handlers (generic CRUD + per-module business logic)
- `internal/routes/` — route registration, grouped by module
- `internal/utils/` — Supabase JWT verification, response helpers

## Models by module

| Module | File | Models |
|---|---|---|
| 1+2. Auth / RBAC | `profile.go` | `Profile`, `Role`, `Permission`, `Session`, `AuditLog` |
| 3. Tournament Management | `tournament.go` | `Tournament`, `TournamentDetail`, `TournamentHistory` |
| 4. Team & Member Management | `team.go` | `Team`, `TeamMember`, `Portfolio`, `Notification` (+ subclasses) |
| 5. Registration & Screening | `registration.go` | `Application`, `Referee`, `WhitelistTeam`, `ReviewLog` |
| 6+7. Scheduling / Coordination | `scheduling.go` | `Match`, `Schedule` |
| 8. Match Results | `match_result.go` | `MatchResult`, `MatchParticipant`, `CheatingReport`, `CheatingReportTeam` |
| 9. Prize Management | `prize.go` | `Account`, `PrizePlace`, `Payout`, `PayoutLog`, `PaymentEvidence` |
| 10. PR & Announcement | `announcement.go` | `Banner`, `News` |
| 11. Reporting | `reporting.go` | `FinancialSummary`, `ExpenseItem`, `IncomeItem`, `Document`, `AccessRequest`, `AccessLog` |
| 12. Ticketing / Complaint | `ticket.go` | `Ticket` |

## Setup

1. Start Supabase — either:
   - **Local (dev):** from the repo root, `npx supabase start` (see `../supabase/`). Prints the local `API URL`, `DB URL`, and `JWT secret` you need for step 2.
   - **Cloud:** create/use a project at supabase.com and grab the same values from Project Settings -> Database / API.
2. Copy `.env` and fill in:
   - `DATABASE_URL` — the `DB URL` from `supabase start` (local) or Project Settings -> Database -> Connection string (cloud)
   - `SUPABASE_JWT_SECRET` — the `JWT secret` from `supabase start` (local) or Project Settings -> API -> JWT Secret (cloud)
3. Download dependencies:

```bash
go mod tidy
```

4. Run the server (this also runs `AutoMigrate` for every model and seeds the default RBAC roles):

```bash
go run ./cmd/server
```

5. API is served at `http://localhost:8080/api/v1`, protected by
   `Authorization: Bearer <supabase access token>` (the token the Supabase
   JS client hands you on the frontend after sign-in).

## Endpoint groups

| Prefix | Module |
|---|---|
| `/me`, `/profiles`, `/roles`, `/permissions` | 1+2. Auth / RBAC |
| `/tournaments` | 3. Tournament Management |
| `/teams`, `/schedules`, `/notifications` | 4. Team & Member Mgmt (+7. Coordination) |
| `/applications`, `/referees`, `/whitelist-teams` | 5. Registration & Screening |
| `/matches`, `/match-results`, `/cheating-reports` | 6. Scheduling / 8. Match Results |
| `/accounts`, `/prize-places`, `/payouts` | 9. Prize Management |
| `/banners`, `/news` | 10. PR & Announcement |
| `/reporting/dashboard` | 11. Reporting |
| `/tickets` | 12. Ticketing / Complaint |
| `/uploads` | shared file upload (Portfolio, DocumentURL, ProofImageURL, PaymentEvidence) |

See `internal/routes/routes.go` for the exact method/path/role-guard for every endpoint.
