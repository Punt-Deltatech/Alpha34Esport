package dto

// RegisterRequest contains the fields needed to create a new user.
type RegisterRequest struct {
	FirstName string `json:"first_name" validate:"required,min=2,max=100"`
	LastName  string `json:"last_name" validate:"required,min=2,max=100"`
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required,min=8,max=72"`
	Age       int    `json:"age" validate:"omitempty,min=0,max=150"`
	GenderID  *uint  `json:"gender_id" validate:"omitempty"`
}

// LoginRequest contains the fields needed for user login.
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// AuthResponse contains the JWT token and user profile returned after auth.
type AuthResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}
