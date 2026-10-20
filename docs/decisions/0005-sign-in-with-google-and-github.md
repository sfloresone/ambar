# 0005. Sign in with Google and GitHub

- Status: accepted
- Date: 2026-10-20

## Context

Email codes ([0004](0004-passwordless-auth-and-sessions.md)) work everywhere but cost an inbox round trip. Many people would rather use the Google or GitHub account they are already signed in to. The secret that proves Ambar to those providers must never reach a browser or an app bundle.

## Decision

- The API runs the OAuth 2.0 authorization code flow with PKCE (S256) through `golang.org/x/oauth2`, the Go team's client, with its `endpoints.Google` and `endpoints.GitHub`. The provider redirects to the API's callback (`API_URL/v1/auth/oauth/<provider>/callback`); the API exchanges the code with its secret and redirects the browser to the app.
- The attempt (provider, `state`, PKCE verifier, `returnTo`) lives in a 10-minute httpOnly cookie (`__Host-oauth` in production, `SameSite=Lax`). `state` binds the answer to the browser that started it (CSRF and login CSRF); the verifier binds the code to our server. No table for attempts.
- Who signed in: Google's `sub` and verified email from the OpenID Connect userinfo endpoint; GitHub's numeric `id` and its primary verified email (`user:email`). The access token comes straight from the provider's token endpoint over TLS, so there is no ID token to parse and no JWT library.
- Same users and sessions as email sign-in. `user_identities` maps `(provider, subject)` to a user. A new identity joins the account with the same email when the provider says it is verified; an unverified email is refused. Provider tokens are not stored.
- One budget of 10 seconds for the exchange and the identity calls, without retries: an authorization code works once.
- The callback answers by redirecting back where the flow started (`returnTo`, allowed origins only): `?oauth=created|signed-in`, or `?error=<code>` (`oauth-cancelled`, `oauth-email`, `oauth-failed`); people never see JSON. Without a valid attempt there is no trusted `returnTo`, so `oauth-state` goes to `APP_URL/login`. A page that holds work in progress (the landing with a dropped moment) gets the person back to finish it.
- `GET /v1/auth/providers` lists the configured providers, so clients only show buttons that work.
- Settings manages them as sign-in methods: one account per provider (`UNIQUE (user_id, provider)`), connected through the same flow with `intent=link` (the callback links to the signed-in account; `oauth-taken` if it opens another one) and disconnected with `DELETE /v1/auth/identities/{provider}`. Email codes always work, so disconnecting never locks anyone out.
- Web first. Native apps will use the same tables and service with a loopback or custom-scheme redirect (RFC 8252).

## Consequences

- Two more ways in, no new session model; sign-out and revocation work the same.
- Each environment needs its own GitHub OAuth app (one callback URL per app); a Google web client can list both redirect URIs.
- Trusting the provider's verified email to join accounts means a provider that verified an address wrongly could open that account. Google and GitHub verify ownership; other providers are not added without this review.
- A provider is on only when its client id and secret are set, so development and CI run without them.

## Options considered

- Exchange in the browser (SPA flow with PKCE and no secret): GitHub requires the secret for OAuth apps, and tokens would sit in JS-readable memory.
- Verify Google's ID token with a JWT library (`coreos/go-oidc`): correct, but more code and a dependency for a token we receive directly from Google over TLS.
- Never join accounts by email: avoids trusting the provider, but leaves people with two accounts for one address.
- Store attempts in Postgres: survives cookie loss, but adds a table and cleanup for a 10-minute value the browser can carry.
