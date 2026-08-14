#!/bin/bash

set -euo pipefail

# Script to help check the next semantic version based on the PR title.
# usage: PR_TITLE="feat: add new feature" ./scripts/version-check.sh
# Rules aligned to Release_Process.md
# major: BREAKING CHANGE(S) footer or conventional commit "!" (for example feat!:)
# minor: feat
# patch: fix

PR_TITLE_INPUT=${PR_TITLE:-}

# Use only full semantic tags (vX.Y.Z), excluding moving major tags (for example v1).
LAST_TAG=$(git describe --tags --abbrev=0 --match 'v[0-9]*.[0-9]*.[0-9]*' 2>/dev/null || true)

if [[ -n "$LAST_TAG" ]]; then
  CURRENT_VERSION="${LAST_TAG#v}"
  echo "Last tag: #$LAST_TAG#"
else
  CURRENT_VERSION="0.0.0"
  echo "Last tag: #none#"
fi

PATTERN='^[0-9]+\.[0-9]+\.[0-9]+$'
if ! [[ "$CURRENT_VERSION" =~ $PATTERN ]]; then
  echo "Could not parse semantic version from last tag: $CURRENT_VERSION"
  exit 1
fi

increment_version() {
  local version=$1
  local increment=$2
  local major minor patch

  IFS='.' read -r major minor patch <<< "$version"

  case "$increment" in
    major)
      major=$((major + 1))
      minor=0
      patch=0
      ;;
    minor)
      minor=$((minor + 1))
      patch=0
      ;;
    patch)
      patch=$((patch + 1))
      ;;
    none)
      ;;
    *)
      echo "Unknown increment type: $increment"
      exit 1
      ;;
  esac

  echo "${major}.${minor}.${patch}"
}

detect_increment_from_text() {
  local text=$1

  if grep -Eq 'BREAKING CHANGE|BREAKING CHANGES' <<< "$text" || grep -Eq '^[a-zA-Z0-9_-]+\([^)]*\)!:|^[a-zA-Z0-9_-]+!:' <<< "$text"; then
    echo "major"
    return
  fi

  if grep -Eq '^feat(\([^)]*\))?:' <<< "$text"; then
    echo "minor"
    return
  fi

  if grep -Eq '^fix(\([^)]*\))?:' <<< "$text"; then
    echo "patch"
    return
  fi

  echo "none"
}

start() {
  if [[ -z "$PR_TITLE_INPUT" ]]; then
    echo "PR_TITLE is required for version prediction"
    exit 1
  fi

  local increment_type
  increment_type=$(detect_increment_from_text "$PR_TITLE_INPUT")

  local new_version
  new_version=$(increment_version "$CURRENT_VERSION" "$increment_type")

  echo "Current version: $CURRENT_VERSION"
  echo "Next increment: $increment_type"
  echo "Next version: $new_version"
}

start

