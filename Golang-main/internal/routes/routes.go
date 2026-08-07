package routes

import (
    "github.com/gin-gonic/gin"

    "github.com/SA/Golang-Backend-Example/internal/controllers"
    "github.com/SA/Golang-Backend-Example/internal/middleware"
)

// SetupRouter registers application routes and middleware.
func SetupRouter(authHandler *controllers.AuthController, userHandler *controllers.UserController) *gin.Engine {
    router := gin.New()
    router.Use(gin.Logger())
    router.Use(middleware.CORSMiddleware())

    // Public Routes
    api := router.Group("/api/v1")
    auth := api.Group("/auth")
    auth.POST("/register", authHandler.Register)
    auth.POST("/login", authHandler.Login)

    // Private Routes
    users := api.Group("/users")
    users.Use(middleware.JWTAuthMiddleware())
    users.GET("/profile", userHandler.GetProfile)
    users.PUT("/profile", userHandler.UpdateProfile)
    users.DELETE("/profile", userHandler.DeleteUser)
    users.GET("", userHandler.GetAllUsers)
    users.GET("/:id", userHandler.GetUserByID)

    return router
}
