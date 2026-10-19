package oauth

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	"golang.org/x/oauth2/endpoints"
)

var GitHubEndpoints = Endpoints{
	AuthURL:  endpoints.GitHub.AuthURL,
	TokenURL: endpoints.GitHub.TokenURL,
	APIURL:   "https://api.github.com",
}

var githubHeaders = map[string]string{
	"Accept":               "application/vnd.github+json",
	"X-GitHub-Api-Version": "2026-03-10",
}

// GitHub signs in with a GitHub account (an OAuth app). user:email lets us read the private addresses;
// only the primary one, and only if GitHub has verified it.
func GitHub(clientID, clientSecret, redirectURL string, ep Endpoints) *Provider {
	return newProvider("github", clientID, clientSecret, redirectURL, ep, []string{"user:email"}, func(ctx context.Context, client *http.Client) (Identity, error) {
		var user struct {
			ID int64 `json:"id"`
		}

		if err := getJSON(ctx, client, ep.APIURL+"/user", githubHeaders, &user); err != nil {
			return Identity{}, err
		}

		if user.ID == 0 {
			return Identity{}, errors.New("GET /user: no id")
		}

		var emails []struct {
			Email    string `json:"email"`
			Primary  bool   `json:"primary"`
			Verified bool   `json:"verified"`
		}

		if err := getJSON(ctx, client, ep.APIURL+"/user/emails", githubHeaders, &emails); err != nil {
			return Identity{}, err
		}

		for _, e := range emails {
			if e.Primary && e.Verified {
				// The numeric id, never the login or email: both can change.
				return Identity{Subject: strconv.FormatInt(user.ID, 10), Email: e.Email}, nil
			}
		}

		return Identity{}, ErrNoVerifiedEmail
	})
}
