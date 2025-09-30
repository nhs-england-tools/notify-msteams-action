# Release Process

This repository uses **semantic-release** to fully automate versioning and publishing of the GitHub Action.

## Overview

1. Developers raise pull requests with source changes only (no `dist/` directory committed).
2. The pull request workflow performs a semantic-release dry run to preview the next version.
3. Once changes are merged to `main`, the publish workflow:
   - Checks out the code.
   - Installs dependencies and builds the production bundle with `npm run package` (emits `dist/index.js` + `licenses.txt`).
   - Runs `semantic-release` which:
     - Calculates the next version from Conventional Commits.
     - Updates release notes and creates a Git tag `vX.Y.Z`.
     - Commits the generated `dist/` assets and `VERSION` file via the `@semantic-release/git` plugin.
     - Creates a GitHub Release.
   - Updates the moving major tag (e.g. `v1`) to the new version tag.

## Rationale

Bundling only at release time avoids large, noisy diffs in pull requests and guarantees that the published artefact matches the exact commit that semantic-release tags.

## Usage for Consumers

Reference the Action via a tag, ideally the major tag:

```yaml
uses: nhs-england-tools/notify-msteams-action@v1
```

Pin to a specific minor/patch if you require full immutability:

```yaml
uses: nhs-england-tools/notify-msteams-action@v1.2.3
```

Avoid using `@main` externally, because the branch does not contain a guaranteed built `dist/` bundle.

## Developer Workflow

```bash
# Install dependencies
npm ci
# Run tests & quality gates
npm test
npm run lint
# Build bundle for local testing (not committed)
npm run package
```

You can validate the action locally by creating a temporary workflow that uses `uses: ./`.

## Conventional Commit Examples

| Type  | Purpose                                | Example                                        |
|-------|-----------------------------------------|------------------------------------------------|
| `feat`  | New feature (minor bump)                | `feat: support custom message colour`          |
| `fix`   | Bug fix (patch bump)                    | `fix: correct adaptive card JSON schema`       |
| `chore` | Build/tooling changes                   | `chore: update eslint config`                  |
| `docs`  | Documentation updates                   | `docs: add release process guide`              |
| `perf`  | Performance improvement                 | `perf: reduce bundle size`                     |
| `refactor` | Non-functional code change           | `refactor: simplify card builder`              |

Breaking changes: add `!` (`feat!:`) or a `BREAKING CHANGE:` footer.

## Failing Conditions

The guard job fails a pull request if `dist/` is present. Remove it before requesting review.

## Manual Intervention

If a release must be re-run (rare):

1. Revert the release commit if necessary.
2. Amend commit messages to adjust semantic meaning.
3. Push to `main` again and allow the publish workflow to execute.

Avoid editing tags directly; let semantic-release manage them.

## Future Improvements

- Add changelog generation (`@semantic-release/changelog`) if a persistent `CHANGELOG.md` is desired.
- Add an integration test workflow that consumes the just-published tag.

---
Maintainers: ensure `permissions: contents: write` is preserved in the publish workflow for tag/commit operations.
