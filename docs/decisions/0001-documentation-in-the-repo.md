# 0001. Keep documentation in the repository

- Status: accepted
- Date: 2026-10-19

## Context

Ambar is small today but is designed to grow into several surfaces (web, extension, desktop, mobile) and, later, a public API. Documentation written outside the repository drifts from the code, cannot be reviewed in pull requests and is invisible to the coding agents that work on the codebase.

## Decision

Documentation is Markdown under `docs/`, versioned with the code and reviewed in the same pull requests. Pages are organized by Diátaxis type. Decisions are recorded as MADR files in `docs/decisions/`. The API contract is an OpenAPI document in the API package, not prose.

Personal notes stay in `docs/local/`, which is ignored by Git.

## Consequences

- A change in behavior and its documentation ship together; reviewers can reject one without the other.
- The same files can be published later with a static site generator (Astro Starlight renders Markdown folders and OpenAPI files) without a migration.
- Agents and humans read the same source. `AGENTS.md` stays short and links into `docs/`.
- There is no WYSIWYG editor and no comments on pages; discussion happens in pull requests.

## Options considered

- Hosted wiki or docs SaaS (Notion, GitBook, ReadMe): easy editing, but a second source of truth, a paid tier for a public site and no review workflow.
- Generated-only docs (from code comments): good for reference, useless for how-tos and explanations.
