package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"math/big"
)

// newCode is 6 uniformly random digits.
func newCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%06d", n.Int64()), nil
}

// newToken is 256 random bits, URL-safe: link tokens and session tokens.
func newToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}

	return base64.RawURLEncoding.EncodeToString(b), nil
}

// hashToken: tokens are random enough that a plain SHA-256 is safe to store and look up.
func hashToken(token string) []byte {
	sum := sha256.Sum256([]byte(token))

	return sum[:]
}

// hashCode: a 6-digit code is guessable offline, so it is keyed with the server secret (a leaked database
// alone is not enough) and salted with its challenge (same code, different hash).
func hashCode(secret, salt []byte, code string) []byte {
	mac := hmac.New(sha256.New, secret)
	mac.Write(salt)
	mac.Write([]byte(code))

	return mac.Sum(nil)
}

func equalHash(a, b []byte) bool {
	return subtle.ConstantTimeCompare(a, b) == 1
}
