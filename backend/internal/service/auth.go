package service

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInactiveUser       = errors.New("user account is inactive")
)

type AuthService struct {
	db        *pgxpool.Pool
	jwtSecret []byte
	tokenTTL  time.Duration
}

type LoginResult struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type User struct {
	ID    int64  `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}

type JWTClaims struct {
	UserID int64  `json:"user_id"`
	Role   string `json:"role"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func NewAuthService(db *pgxpool.Pool, jwtSecret string, ttlHours int) *AuthService {
	return &AuthService{
		db:        db,
		jwtSecret: []byte(jwtSecret),
		tokenTTL:  time.Duration(ttlHours) * time.Hour,
	}
}

func (s *AuthService) Login(ctx context.Context, email, password string) (LoginResult, error) {
	const q = `
	SELECT id, email, name, role, password_hash, is_active
	FROM users
	WHERE LOWER(email) = LOWER($1)
	LIMIT 1`

	var user User
	var passwordHash string
	var isActive bool

	err := s.db.QueryRow(ctx, q, email).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.Role,
		&passwordHash,
		&isActive,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return LoginResult{}, ErrInvalidCredentials
		}
		return LoginResult{}, fmt.Errorf("query user: %w", err)
	}

	if !isActive {
		return LoginResult{}, ErrInactiveUser
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)); err != nil {
		return LoginResult{}, ErrInvalidCredentials
	}

	now := time.Now()
	claims := JWTClaims{
		UserID: user.ID,
		Role:   user.Role,
		Name:   user.Name,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatInt(user.ID, 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.tokenTTL)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return LoginResult{}, fmt.Errorf("sign token: %w", err)
	}

	return LoginResult{Token: signedToken, User: user}, nil
}
