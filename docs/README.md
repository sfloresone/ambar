# Ambar docs

Internal documentation for Ambar, kept next to the code so it changes in the same pull request as the behavior it describes. It follows [Diátaxis](https://diataxis.fr): four kinds of pages, each with one job.

| Folder | Job | Read it when you want to… |
| --- | --- | --- |
| `tutorials/` | Learning | Build something end to end for the first time |
| `how-to/` | Tasks | Get a specific thing done (run, deploy, add an endpoint) |
| `reference/` | Facts | Look up an endpoint, an error code, a log field or a variable |
| `explanation/` | Understanding | Learn why the system is shaped the way it is |
| `decisions/` | History | See which options were weighed and which one won ([MADR](https://adr.github.io/madr/)) |

Sources of truth:

- The API contract is [`apps/api/openapi.yaml`](../apps/api/openapi.yaml) (OpenAPI 3.1). `reference/api.md` only points at it; never describe an endpoint by hand elsewhere.
- Errors are listed in [`reference/errors.md`](reference/errors.md), log fields in [`reference/logs.md`](reference/logs.md), environment variables in [`reference/environment.md`](reference/environment.md).
- Agent instructions live in [`AGENTS.md`](../AGENTS.md) at the root. It stays short and links here for depth.

Personal, unpublished notes go in `docs/local/`, which Git ignores.

Writing rules are in [`style.md`](style.md). The same Markdown is meant to be published later (an Astro Starlight site under `apps/docs` can render these folders and the OpenAPI file without rewriting them), so write every page as if a stranger will read it.
