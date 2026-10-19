# Set up Google and GitHub sign-in

Use this page to turn on "Continue with Google" and "Continue with GitHub" for an environment. A provider is on when both its variables are set ([environment](../reference/environment.md)); the design is in decision [0005](../decisions/0005-sign-in-with-google-and-github.md).

Redirect URIs must match exactly, including scheme, host and port:

| Provider | Development | Production |
| --- | --- | --- |
| Google | `http://localhost:8080/v1/auth/oauth/google/callback` | `https://api.ambar.page/v1/auth/oauth/google/callback` |
| GitHub | `http://localhost:8080/v1/auth/oauth/github/callback` | `https://api.ambar.page/v1/auth/oauth/github/callback` |

## Google

1. In the Google Cloud console, open **Google Auth Platform** and configure the consent screen (app name Ambar, support email, the `ambar.page` domain).
2. Under **Clients**, create a client of type **Web application**.
3. Add the redirect URIs from the table for the environments this client serves.
4. Copy the client ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

Ambar asks for `openid email` only.

## GitHub

1. In GitHub, open **Settings → Developer settings → OAuth Apps → New OAuth App**. Create one app per environment: an OAuth app has a single callback URL.
2. Homepage URL: the landing (`https://ambar.page`, or `http://localhost:4321` in development).
3. Authorization callback URL: the GitHub row of the table for that environment.
4. Generate a client secret. Copy the client ID and secret into `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

Ambar asks for `user:email` only, to read the primary verified address.

## Finish

1. Set `API_URL` to the API's public base URL, exactly as in the redirect URIs (`http://localhost:8080` in development).
2. Restart the API. Its log prints `sign-in provider on` with the `redirect_uri` for each provider.
3. Open `<API_URL>/v1/auth/oauth/github` (or `google`) in a browser, accept, and check that you land on the app signed in.

If you land on `/login?error=oauth-failed`, the log line `auth.oauth_failed` names the provider's error code; `redirect_uri_mismatch` and `incorrect_client_credentials` mean the values above don't match the provider's settings.
