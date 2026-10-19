package oauth

import (
	"context"
	"net/http"

	"golang.org/x/oauth2/endpoints"
)

// GoogleEndpoints: Google's OpenID Connect endpoints (accounts.google.com/.well-known/openid-configuration).
var GoogleEndpoints = Endpoints{
	AuthURL:  endpoints.Google.AuthURL,
	TokenURL: endpoints.Google.TokenURL,
	APIURL:   "https://openidconnect.googleapis.com/v1/userinfo",
}

// Google signs in with a Google Account. The userinfo endpoint answers with the access token we got
// straight from Google's token endpoint over TLS, so there is no ID token to parse or verify.
func Google(clientID, clientSecret, redirectURL string, ep Endpoints) *Provider {
	return newProvider("google", clientID, clientSecret, redirectURL, ep, []string{"openid", "email"}, func(ctx context.Context, client *http.Client) (Identity, error) {
		var info struct {
			Sub           string `json:"sub"`
			Email         string `json:"email"`
			EmailVerified bool   `json:"email_verified"`
		}

		if err := getJSON(ctx, client, ep.APIURL, nil, &info); err != nil {
			return Identity{}, err
		}

		if info.Email == "" || !info.EmailVerified {
			return Identity{}, ErrNoVerifiedEmail
		}

		// sub, never the email: it stays the same when the person changes their address.
		return Identity{Subject: info.Sub, Email: info.Email}, nil
	})
}
