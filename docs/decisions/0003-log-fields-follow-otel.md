# 0003. Log fields use OpenTelemetry names

- Status: accepted
- Date: 2026-10-19

## Context

The API writes one structured log line per request with `log/slog`. The field names were ad hoc (`method`, `route`, `status`, `ip`). Log backends and dashboards understand the [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/http/http-spans/) out of the box; anything else needs a mapping.

The project is small. A tracing SDK, exporters and a collector would be more code than the API itself.

## Decision

Keep `slog` and the existing `requestLogger` middleware. Rename the fields to the OpenTelemetry attribute names (`http.request.method`, `http.route`, `http.response.status_code`, `client.address`, plus `duration_ms`) and give domain events a stable `event` attribute (`auth.code_requested`, `auth.signed_in`, …). Return the request ID to the client in `X-Request-Id`.

No new package, no new folder, no SDK. The catalog is `docs/reference/logs.md`.

## Consequences

- Logs can be shipped as they are to Loki, Grafana, Datadog or an OTel Collector and the standard dashboards work.
- When traffic justifies tracing, `otelhttp` wraps the router and `otelslog` replaces the handler in `newLogger`; no log call changes. That step is deliberately not taken now.
- Developers must use the catalog names; the request-log test enforces the ones on the request line.

## Options considered

- Full OpenTelemetry now (SDK + OTLP exporter + collector): correct end state, premature for a service with no traffic.
- Keep ad hoc names: free today, a rename plus dashboard rework later.
