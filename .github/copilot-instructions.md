## AI Agent Instructions for notify-msteams-action

Purpose: GitHub Composite + TypeScript Action that posts Adaptive Card style notifications to Microsoft Teams via an incoming webhook. Keep changes tightly scoped; preserve action inputs and runtime contract.

### Core Architecture

- Entry point: `src/main.ts` (compiled to `lib/main.js`, then bundled to `dist/index.js` using `@vercel/ncc`). The workflow runner invokes `dist/index.js` per `action.yml`.
- Core flow: read required inputs (GitHub token, Teams webhook, message title/text, optional colour, link) -> derive repository and run metadata from environment variables -> fetch commit & author via Octokit -> build Adaptive Card JSON (`buildMessageCard` in `src/messagecard.ts`) -> POST to Teams via `axios`.
- Markdown escaping: single helper `escapeMarkdown` in `src/markdownhelper.ts` using `html-entities` to avoid Teams rendering / injection issues. Always escape any user / dynamic text destined for the adaptive card body or title.

### Action Contract (Do NOT silently break)

Inputs (see `action.yml`): github-token, teams-webhook-url, message-title, message-text, message-colour (optional, default handled in code), link (optional). Runtime: `node16` (legacy). If upgrading runtime (e.g. node20) also adjust build & test workflows and confirm no ESM interoperability regressions.
Output: none (side-effect only: HTTP POST). Maintain JSON structure: top-level `{ type: 'message', attachments: [ { contentType: 'application/vnd.microsoft.card.adaptive', content: AdaptiveCard } ] }`.

### Build & Packaging

- TypeScript compile: `npm run build` -> emits to `lib/` per `tsconfig.json` (tests excluded).
- Bundle for Action: `npm run package` (uses `@vercel/ncc`) -> outputs `dist/index.js`. Commit `dist/` when publishing action versions (tagging). Do not import from `dist/` in source; only consumers execute it.
- Aggregate convenience task: `npm run all` runs build, format, lint, package, test.
- Make targets wrap `npm` tasks: `make dependencies` (`npm install`), `make build` (calls `npm run all`). Keep target names stable; CI workflows call them.

### Testing & Quality

- Unit tests in `__tests__/` using Jest + ts-jest. Patterns: construct JSON string, parse, assert structural fields. Follow existing style when adding tests.
- Linting: ESLint (`eslint src/**/*.ts`) with GitHub + Prettier plugins; formatting via Prettier. Prefer fixing lint issues over disabling rules.
- Add new helpers under `src/` and unit tests under `__tests__/` with filename suffix `.test.ts` to auto-discover.

### Writing & Style (Vale)

- All Markdown and instruction changes must pass Vale (config: `scripts/config/vale/vale.ini`).
- Use approved terminology and capitalization (e.g. Terraform, Adaptive Card, GitHub, JavaScript).
- Prefer full words over abbreviations where flagged (configuration, interoperability, environment variables).
- If a legitimate domain term is flagged, add it to the custom vocabulary (`scripts/config/vale/styles/Vocab/`) rather than weakening prose.
- Avoid introducing informal shorthand (e.g. env, interop, config) unless already allowed.

### CI/CD Pipeline Structure (Workflows under `.github/workflows/`)

Four staged reusable workflows (commit, test, build, acceptance) orchestrated by `cicd-1-pull-request.yaml` using `workflow_call` chaining with metadata outputs. Maintain input variable names (build_* timestamps, tool versions, version) when modifying.
- Commit stage: formatting, English usage, secret / dependency scans, Terraform lint, LOC report.
- Test stage: unit tests, lint, coverage, static analysis (Sonar) + an end-to-end invocation of the action (ensures dist build + webhook send path).
- Build stage: installs deps, builds, uploads `dist/` artefact.
If altering build semantics ensure corresponding stage Make targets still satisfy expectations (e.g. keep `make build` producing fresh `dist/`).

### Conventions & Patterns

- Always escape all dynamic card text with `escapeMarkdown` before embedding.
- Optional link: if empty string, `actions` array must be `[]`. Preserve that logic; tests assert it.
- Default message colour fallback is hard-coded `'00cbff'` (not currently applied inside adaptive card body—future enhancement may use). If you implement colour usage, add tests and keep backward compatibility with existing inputs.
- Use Octokit only in `main.ts`; keep card construction pure (facilitates unit testing).
- Keep adaptive card schema version pinned (`1.4`). If updating, verify Teams compatibility.

### Safe Extension Examples

- Adding a new fact (e.g. commit SHA) to the card: modify `facts` array in `buildMessageCard`, update tests to assert presence, adjust README usage docs if exposing new input.
- Adding output parameters: update `action.yml` outputs section AND write to `core.setOutput` in `main.ts`; provide corresponding tests.

### When Implementing Changes

1. Add / update unit tests first (mirroring existing pattern of JSON parse + field assertions).
2. Run: `npm test` then `npm run lint` then `npm run package` to regenerate dist.
3. If publishing, commit updated `dist/index.js` (`@vercel/ncc` bundle) and tag a release (semantic-release pipeline handles versioning on main).
4. Maintain Node 16 compatibility until workflows updated (check `runs.using`).

### Do Not

- Do not change input names, remove existing fields, or restructure JSON without updating tests & documentation.
- Do not introduce unescaped user-provided text into the adaptive card.
- Do not import test-only libs into production source.

### Key Reference Files

- Action metadata: `action.yml`
- Entry / orchestration: `src/main.ts`
- Card construction: `src/messagecard.ts`
- Markdown escaping: `src/markdownhelper.ts`
- Tests: `__tests__/`
- Build configuration: `tsconfig.json`, `jest.config.js`, `package.json`
- CI pipeline: `.github/workflows/*.yaml`

Clarifications Needed? If any workflow expectation, versioning rule, or card schema nuance seems ambiguous, surface a brief question with proposed assumption before large refactors.
