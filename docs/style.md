# Writing style

These rules apply to everything under `docs/`, to `AGENTS.md` and to descriptions inside `openapi.yaml`. They follow the [Google developer documentation style guide](https://developers.google.com/style) where it does not say otherwise.

## Voice

- English only, like the rest of the repository.
- Second person ("you"), active voice, present tense.
- Say what the system does, not what it "will" or "should" do. If it does not exist yet, say so explicitly or leave it out.
- One idea per paragraph. Prefer a short list to a long sentence.
- Plain words: "use", not "utilize"; "start", not "spin up".

## Structure

- Pick one Diátaxis type per page and stay in it. A how-to has numbered steps and no history; an explanation has no steps.
- Sentence case for titles and headings ("Add an endpoint", not "Add An Endpoint").
- Start each page with one sentence that says what it is for.
- Reference pages are tables first, prose second. Keep them exhaustive and in sync with the code in the same pull request.

## Names and formatting

- Brand name is `Ambar`, plain ASCII.
- Code, file paths, env vars, error codes and log fields in backticks: `apps/api/routes.go`, `DATABASE_URL`, `invalid-code`, `http.route`.
- Product terms as the product uses them: OCR is **readings**, a saved item is a **moment**.
- Link to the source of truth instead of copying it: the OpenAPI file for endpoints, `plans.ts` for limits, `platforms.ts` for platforms.

## Decisions (ADRs)

- File name `NNNN-short-title.md` in `docs/decisions/`, numbered in order.
- Sections: Context, Decision, Consequences, Options considered. Keep each under a screen.
- Status is one of `proposed`, `accepted`, `superseded by NNNN`. Never edit an accepted decision's meaning; write a new one that supersedes it.
