package routes

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/SA/Golang-Backend-Example/internal/config"
	"github.com/SA/Golang-Backend-Example/internal/controllers"
	"github.com/SA/Golang-Backend-Example/internal/middleware"
	"github.com/SA/Golang-Backend-Example/internal/models"
)

// SetupRouter wires every module's routes behind Supabase JWT auth.
// Sensitive admin-ish actions are additionally gated by RequireRole; every
// other authenticated route is open to any signed-in Profile — fine-grained
// per-module authorization is left as a deliberate follow-up, not part of
// this boilerplate.
func SetupRouter(db *gorm.DB, cfg *config.Config) *gin.Engine {
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(gin.Logger())
	router.Use(middleware.CORSMiddleware())
	router.Static("/uploads", cfg.UploadDir)

	// ---- controllers with module-specific business logic ----
	profileCtrl := controllers.NewProfileController(db)
	teamCtrl := controllers.NewTeamController(db)
	notificationCtrl := controllers.NewNotificationController(db)
	tournamentCtrl := controllers.NewTournamentController(db)
	applicationCtrl := controllers.NewApplicationController(db)
	matchCtrl := controllers.NewMatchController(db)
	matchResultCtrl := controllers.NewMatchResultController(db)
	prizeCtrl := controllers.NewPrizeController(db)
	newsCtrl := controllers.NewNewsController(db)
	reportingCtrl := controllers.NewReportingController(db)
	ticketCtrl := controllers.NewTicketController(db)
	fileCtrl := controllers.NewFileController(cfg.UploadDir)

	// ---- generic CRUD for straightforward resources ----
	roleCRUD := controllers.NewCRUD[models.Role](db)
	permissionCRUD := controllers.NewCRUD[models.Permission](db)
	refereeCRUD := controllers.NewCRUD[models.Referee](db)
	whitelistCRUD := controllers.NewCRUD[models.WhitelistTeam](db)
	scheduleCRUD := controllers.NewCRUD[models.Schedule](db)
	cheatingReportCRUD := controllers.NewCRUD[models.CheatingReport](db)
	accountCRUD := controllers.NewCRUD[models.Account](db)
	prizePlaceCRUD := controllers.NewCRUD[models.PrizePlace](db)
	bannerCRUD := controllers.NewCRUD[models.Banner](db)

	api := router.Group("/api/v1")
	api.Use(middleware.SupabaseAuthMiddleware(db, cfg.SupabaseURL, cfg.SupabaseJWTSecret))

	requireRole := func(names ...string) gin.HandlerFunc { return middleware.RequireRole(db, names...) }

	// ── Module 1 (Auth) + Module 2 (RBAC) ──────────────────────────────
	api.GET("/me", profileCtrl.GetMe)
	api.PUT("/me", profileCtrl.UpdateMe)
	api.GET("/profiles", requireRole("Admin"), profileCtrl.List)
	api.GET("/profiles/:id", requireRole("Admin"), profileCtrl.Get)
	api.PUT("/profiles/:id/role", requireRole("Admin"), profileCtrl.AssignRole)
	api.PUT("/profiles/:id/status", requireRole("Admin"), profileCtrl.SetStatus)

	roles := api.Group("/roles", requireRole("Admin"))
	{
		roles.GET("", roleCRUD.List)
		roles.GET("/:id", roleCRUD.Get)
		roles.POST("", roleCRUD.Create)
		roles.PUT("/:id", roleCRUD.Update)
		roles.DELETE("/:id", roleCRUD.Delete)
	}
	permissions := api.Group("/permissions", requireRole("Admin"))
	{
		permissions.GET("", permissionCRUD.List)
		permissions.POST("", permissionCRUD.Create)
		permissions.PUT("/:id", permissionCRUD.Update)
		permissions.DELETE("/:id", permissionCRUD.Delete)
	}

	// ── Module 3: Tournament Management ────────────────────────────────
	tournaments := api.Group("/tournaments")
	{
		tournaments.GET("", tournamentCtrl.List)
		tournaments.GET("/:id", tournamentCtrl.Get)
		tournaments.POST("", requireRole("Admin", "Organizer"), tournamentCtrl.Create)
		tournaments.PUT("/:id", requireRole("Admin", "Organizer"), tournamentCtrl.Update)
		tournaments.DELETE("/:id", requireRole("Admin", "Organizer"), tournamentCtrl.Delete)
		tournaments.GET("/:id/history", tournamentCtrl.History)
		// nested reads/actions from other modules — all use the same ":id" param name
		tournaments.GET("/:id/applications", requireRole("Admin", "Organizer", "Referee"), applicationCtrl.ListByTournament)
		tournaments.GET("/:id/review-logs", requireRole("Admin", "Organizer", "Referee"), applicationCtrl.ListReviewLogsForTournament)
		tournaments.GET("/:id/whitelist-teams", applicationCtrl.ListWhitelistForTournament)
		tournaments.GET("/:id/matches", matchCtrl.ListByTournament)
		tournaments.POST("/:id/matches/generate-bracket", requireRole("Admin", "Organizer"), matchCtrl.GenerateBracket)
		tournaments.GET("/:id/financial-summary", requireRole("Admin", "Organizer"), reportingCtrl.FinancialSummaryFor)
	}

	// ── Module 4: Team & Member Management (Module 7: Coordination reuses these) ──
	teams := api.Group("/teams")
	{
		teams.GET("", teamCtrl.List)
		teams.GET("/:id", teamCtrl.Get)
		teams.POST("", teamCtrl.Create)
		teams.PUT("/:id", teamCtrl.Update)
		teams.DELETE("/:id", teamCtrl.Delete)
		teams.POST("/:id/invite", teamCtrl.InviteMember)
		teams.POST("/:id/members", teamCtrl.AddMember)
		teams.PUT("/:id/members/:memberId", teamCtrl.UpdateMember)
		teams.DELETE("/:id/members/:memberId", teamCtrl.RemoveMember)
		teams.POST("/:id/members/:memberId/portfolio", teamCtrl.SetMemberPortfolio)
		teams.GET("/:id/applications", applicationCtrl.ListByTeam)
	}
	schedules := api.Group("/schedules")
	{
		schedules.GET("", scheduleCRUD.List)
		schedules.POST("", scheduleCRUD.Create)
		schedules.PUT("/:id", scheduleCRUD.Update)
		schedules.DELETE("/:id", scheduleCRUD.Delete)
	}
	notifications := api.Group("/notifications")
	{
		notifications.GET("", notificationCtrl.ListMine)
		notifications.PUT("/:id/read", notificationCtrl.MarkRead)
		notifications.POST("/:id/respond", notificationCtrl.RespondInvitation)
		notifications.DELETE("/:id", notificationCtrl.Delete)
	}

	// ── Module 5: Registration & Screening ─────────────────────────────
	applications := api.Group("/applications")
	{
		applications.POST("", applicationCtrl.Submit)
		applications.GET("/:id", applicationCtrl.Get)
		applications.PUT("/:id/review", requireRole("Admin", "Organizer", "Referee"), applicationCtrl.Review)
	}
	referees := api.Group("/referees")
	{
		referees.GET("", refereeCRUD.List)
		referees.GET("/:id", refereeCRUD.Get)
		referees.POST("", requireRole("Admin", "Organizer"), refereeCRUD.Create)
		referees.PUT("/:id", requireRole("Admin", "Organizer"), refereeCRUD.Update)
		referees.DELETE("/:id", requireRole("Admin", "Organizer"), refereeCRUD.Delete)
	}
	api.GET("/whitelist-teams", whitelistCRUD.List)

	// ── Module 6/8: Scheduling / Match Results ─────────────────────────
	matches := api.Group("/matches")
	{
		matches.GET("/:id", matchCtrl.Get)
		matches.POST("", requireRole("Admin", "Organizer"), matchCtrl.Create)
	}
	api.POST("/match-results", requireRole("Admin", "Organizer", "Referee"), matchResultCtrl.Submit)
	api.GET("/match-results/:matchId", matchResultCtrl.Get)
	api.POST("/cheating-reports", requireRole("Admin", "Referee"), matchResultCtrl.SubmitCheatingReport)
	cheatingReports := api.Group("/cheating-reports", requireRole("Admin", "Organizer", "Referee"))
	{
		cheatingReports.GET("", cheatingReportCRUD.List)
		cheatingReports.GET("/:id", cheatingReportCRUD.Get)
	}

	// ── Module 9: Prize Management ─────────────────────────────────────
	accounts := api.Group("/accounts", requireRole("Admin", "Organizer"))
	{
		accounts.GET("", accountCRUD.List)
		accounts.POST("", accountCRUD.Create)
		accounts.PUT("/:id", accountCRUD.Update)
	}
	api.GET("/prize-places", prizePlaceCRUD.List)
	prizePlaces := api.Group("/prize-places", requireRole("Admin", "Organizer"))
	{
		prizePlaces.POST("", prizePlaceCRUD.Create)
		prizePlaces.PUT("/:id", prizePlaceCRUD.Update)
		prizePlaces.DELETE("/:id", prizePlaceCRUD.Delete)
	}
	payouts := api.Group("/payouts")
	{
		payouts.GET("", prizeCtrl.ListPayouts)
		payouts.POST("", requireRole("Admin", "Organizer"), prizeCtrl.CreatePayout)
		payouts.PUT("/:id/status", requireRole("Admin", "Organizer"), prizeCtrl.UpdateStatus)
		payouts.POST("/:id/evidence", prizeCtrl.AttachEvidence)
	}

	// ── Module 10: PR & Announcement ───────────────────────────────────
	banners := api.Group("/banners")
	{
		banners.GET("", bannerCRUD.List)
		banners.POST("", requireRole("Admin", "Organizer"), bannerCRUD.Create)
		banners.PUT("/:id", requireRole("Admin", "Organizer"), bannerCRUD.Update)
		banners.DELETE("/:id", requireRole("Admin", "Organizer"), bannerCRUD.Delete)
	}
	news := api.Group("/news")
	{
		news.GET("", newsCtrl.List)
		news.POST("", requireRole("Admin", "Organizer"), newsCtrl.Create)
		news.PUT("/:id", requireRole("Admin", "Organizer"), newsCtrl.Update)
		news.DELETE("/:id", requireRole("Admin", "Organizer"), newsCtrl.Delete)
	}

	// ── Module 11: Reporting ────────────────────────────────────────────
	api.GET("/reporting/dashboard", requireRole("Admin", "Organizer"), reportingCtrl.Dashboard)

	// ── Module 12: Ticketing / Complaint ────────────────────────────────
	tickets := api.Group("/tickets")
	{
		tickets.POST("", ticketCtrl.Create)
		tickets.GET("", ticketCtrl.ListMine)
		tickets.GET("/all", requireRole("Admin"), ticketCtrl.List)
		tickets.GET("/:id", ticketCtrl.Get)
		tickets.PUT("/:id/assign", requireRole("Admin"), ticketCtrl.Assign)
		tickets.PUT("/:id/resolve", requireRole("Admin"), ticketCtrl.Resolve)
	}

	// Shared local-disk upload used by Portfolio / DocumentURL / ProofImageURL / PaymentEvidence
	api.POST("/uploads", fileCtrl.Upload)

	return router
}
