# Errors

Every error response is an [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem document with `Content-Type: application/problem+json` (decision [0002](../decisions/0002-errors-as-problem-details.md)). The shape is `Problem` in [`openapi.yaml`](../../apps/api/openapi.yaml).

| Member | Always | Meaning |
| --- | --- | --- |
| `type` | yes | `https://docs.ambar.page/errors/<code>` |
| `title` | yes | Short human name of the code, same for every occurrence |
| `status` | yes | HTTP status, repeated from the response |
| `detail` | yes | End-user sentence. Safe to show as-is. Never internal text |
| `code` | yes | Stable identifier, see below. Clients switch on this |
| `requestId` | yes | Same value as the `X-Request-Id` header |
| `attemptsLeft` | `invalid-code` | Wrong codes the user can still try |
| `retryAfterMs` | `rate-limited` | Milliseconds until the next email is allowed |

## Codes

| `code` | Status | When |
| --- | --- | --- |
| `invalid-email` | 400 | The email field is missing or malformed |
| `invalid-code` | 400 | The code does not match. Carries `attemptsLeft` |
| `too-many-attempts` | 400 | The code is dead after too many wrong tries; ask for a new one |
| `expired-code` | 400 | The code or link token is expired or already used |
| `bad-request` | 400, 415 | The body is not `application/json` (415) or cannot be decoded (400) |
| `provider-unavailable` | 404 | The sign-in provider is unknown or not configured on this server |
| `unauthorized` | 401 | No valid session cookie or token |
| `forbidden` | 403 | Browser request from an origin that is not allowed |
| `rate-limited` | 429 | Too many emails for this address (carries `retryAfterMs`) or too many requests from this client |
| `network` | 503 | The sign-in email could not be sent. Also sets `Retry-After` |
| `internal` | 500 | Unexpected server error. The log line with the same `requestId` has the cause |

## Provider sign-in redirects

Google and GitHub sign-in happen in browser navigations, so their failures are not problem documents: the callback redirects to `<APP_URL>/login?error=<code>`.

| `error` | When |
| --- | --- |
| `oauth-cancelled` | The person declined at the provider (`access_denied`) |
| `oauth-state` | The attempt is missing, expired (10 minutes) or does not match: an old tab, another browser, or a forged request |
| `oauth-email` | The provider has no verified email for the account (GitHub: unverified primary email) |
| `oauth-failed` | Anything else: the provider is down, the code was rejected, or our client configuration is wrong. Logged as `auth.oauth_failed` |

Rules for new codes:

- kebab-case, named after the condition, not the HTTP status.
- Add the row here, the enum value in `openapi.yaml`, the Go case in `authError` (or the relevant handler) and, if clients act on it, the value in `AuthErrorCode` (`@ambar/core`).
- `detail` is copy for end users. Keep it short and actionable.
