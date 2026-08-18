# Guide: Semantic release

- [Guide: Semantic release](#guide-semantic-release)
  - [Overview](#overview)
  - [Key files](#key-files)
  - [Configuration checklist](#configuration-checklist)
  - [Testing](#testing)

## Overview

Semantic release ([semantic-release](https://semantic-release.gitbook.io/semantic-release)) is used for automatically tagging and creating GitHub releases with change logs from commit messages. It uses the [SemVer](https://semver.org/) convention and the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification by describing the features, fixes, and breaking changes made in commit messages. Pull requests are squash-merged into `main`, so the resulting commit message is made from the pull request title and description. Use the pull request title for the conventional commit type and breaking-change marker; use the description for supporting details.

The table below shows which commit message gets you which release type when semantic-release runs (using the default configuration):

| Commit message | Release type |
|----------------|--------------|
| `fix(pencil): stop graphite breaking when too much pressure applied` | ~~Patch~~ Fix Release |
| `feat(pencil): add 'graphiteWidth' option` | ~~Minor~~ Feature Release |
| `feat!: remove graphiteWidth option` | ~~Major~~ Breaking Release <br/>(Add `!` to the pull request title.) |

## Key files

- [`.releaserc`](../../.releaserc): semantic-release's configuration file, written in YAML or JSON

## Configuration checklist

Configuration should be made in the `.releaserc` file.

- Adjust the [configuration settings](https://semantic-release.gitbook.io/semantic-release/usage/configuration#branches) to align with your project's branching strategy
- Configure [plugins](https://semantic-release.gitbook.io/semantic-release/usage/plugins) depending on your needs

## Testing

It is recommended that any configuration changes are tested in a simple repository before committing to your main one
