package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID    string `json:"user_id"`
	TokenType string `json:"token_type"`
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

func GenerateTokenPair(userID string, secret string) (*TokenPair, error) {
	accessToken, err := generateToken(userID, "access", 15*time.Minute, secret)
	if err != nil {
		return nil, err
	}

	refreshToken, err := generateToken(userID, "refresh", 7*24*time.Hour, secret)
	if err != nil {
		return nil, err
	}

	return &TokenPair{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

func GenerateToken(userID string, secret string) (string, error) {
	return generateToken(userID, "access", 15*time.Minute, secret)
}

func generateToken(userID, tokenType string, expiry time.Duration, secret string) (string, error) {
	claims := Claims{
		UserID:    userID,
		TokenType: tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ValidateToken(tokenStr string, secret string) (string, error) {
	return validateToken(tokenStr, "access", secret)
}

func ValidateRefreshToken(tokenStr string, secret string) (string, error) {
	return validateToken(tokenStr, "refresh", secret)
}

func validateToken(tokenStr, expectedType, secret string) (string, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return "", err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return "", fmt.Errorf("invalid token")
	}
	if claims.TokenType != expectedType {
		return "", fmt.Errorf("invalid token type")
	}
	return claims.UserID, nil
}
