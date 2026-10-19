// Package oauth is sign-in through Google and GitHub with golang.org/x/oauth2: the authorization code
// flow with PKCE, run by the API so the client secret never leaves it. A Provider builds the consent URL,
// exchanges the code and reads who signed in. Sessions and accounts are the auth package's job.
package oauth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"golang.org/x/oauth2"
)

// budget covers the code exchange and the identity requests. No retries: a code works only once.
const budget = 10 * time.Second

var (
	// ErrNoVerifiedEmail: the provider has no verified email for this person, so we can't know who they are.
	ErrNoVerifiedEmail = errors.New("no verified email at the provider")
	// ErrConfig: the provider rejected our client id, secret or redirect URI. Ours to fix, not the user's.
	ErrConfig = errors.New("provider rejected our configuration")
)

// Identity is who signed in: the provider's stable id for them (never the email, which can change) and a
// verified email.
type Identity struct {
	Provider string
	Subject  string
	Email    string
}

// Endpoints are where a provider lives. Tests point them at a fake server.
type Endpoints struct {
	AuthURL  string
	TokenURL string
	// APIURL is where the identity is read: Google's userinfo endpoint, GitHub's REST API root.
	APIURL string
}

type Provider struct {
	Name     string
	config   oauth2.Config
	identity func(ctx context.Context, client *http.Client) (Identity, error)
}

func newProvider(name, clientID, clientSecret, redirectURL string, ep Endpoints, scopes []string, identity func(ctx context.Context, client *http.Client) (Identity, error)) *Provider {
	return &Provider{
		Name: name,
		config: oauth2.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			// Sent in both the authorize and the token request; it must match the registered callback exactly.
			RedirectURL: redirectURL,
			Scopes:      scopes,
			// Both providers take the credentials as form parameters; explicit, so a failure isn't retried
			// with the other style (the code is single-use).
			Endpoint: oauth2.Endpoint{AuthURL: ep.AuthURL, TokenURL: ep.TokenURL, AuthStyle: oauth2.AuthStyleInParams},
		},
		identity: identity,
	}
}

// AuthURL is the provider's consent page for this attempt: state ties the answer to this browser, the
// verifier's S256 challenge (PKCE) ties the code to this server.
func (p *Provider) AuthURL(state, verifier string) string {
	return p.config.AuthCodeURL(state, oauth2.S256ChallengeOption(verifier))
}

// Identify exchanges the code (with the PKCE verifier) and reads who signed in.
func (p *Provider) Identify(ctx context.Context, code, verifier string) (Identity, error) {
	ctx, cancel := context.WithTimeout(ctx, budget)
	defer cancel()

	// x/oauth2 uses this client for the exchange; Client(ctx, token) below reuses it for API calls.
	ctx = context.WithValue(ctx, oauth2.HTTPClient, &http.Client{Timeout: budget})

	token, err := p.config.Exchange(ctx, code, oauth2.VerifierOption(verifier))
	if err != nil {
		return Identity{}, exchangeError(err)
	}

	identity, err := p.identity(ctx, p.config.Client(ctx, token))
	if err != nil {
		return Identity{}, err
	}

	identity.Provider = p.Name

	return identity, nil
}

// exchangeError maps the token endpoint's RFC 6749 error codes (GitHub sends them with a 200).
func exchangeError(err error) error {
	var retrieve *oauth2.RetrieveError
	if !errors.As(err, &retrieve) {
		return fmt.Errorf("token exchange: %w", err)
	}

	switch retrieve.ErrorCode {
	case "unverified_user_email":
		return ErrNoVerifiedEmail
	case "incorrect_client_credentials", "invalid_client", "redirect_uri_mismatch":
		return fmt.Errorf("token exchange %s: %w", retrieve.ErrorCode, ErrConfig)
	}

	// Only the code: the description and body are the provider's text.
	status := 0
	if retrieve.Response != nil {
		status = retrieve.Response.StatusCode
	}

	return fmt.Errorf("token exchange: %q (HTTP %d)", retrieve.ErrorCode, status)
}

// AuthorizeError maps the error a provider sends back to the callback instead of a code. nil means the
// person declined (access_denied), which is not a failure.
func AuthorizeError(code string) error {
	switch code {
	case "access_denied":
		return nil
	case "redirect_uri_mismatch", "application_suspended", "unauthorized_client", "invalid_client":
		return fmt.Errorf("authorize %s: %w", code, ErrConfig)
	}

	return fmt.Errorf("authorize: %s", code)
}

// getJSON reads a small JSON document with the token-carrying client.
func getJSON(ctx context.Context, client *http.Client, url string, headers map[string]string, v any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}

	for k, value := range headers {
		req.Header.Set(k, value)
	}

	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("GET %s: HTTP %d", req.URL.Path, res.StatusCode)
	}

	return json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(v)
}
