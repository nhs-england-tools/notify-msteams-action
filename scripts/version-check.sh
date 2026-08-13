#!/bin/bash

set -euo pipefail

# Rules aligned to Release_Process.md
# major: BREAKING CHANGE(S) footer or conventional commit "!" (for example feat!:)
# minor: feat
# patch: fix

PREVENT_REMOVE_FILE=${1:-}

# Use only full semantic tags (vX.Y.Z), excluding moving major tags (for example v1).
LAST_TAG=$(git describe --tags --abbrev=0 --match 'v[0-9]*.[0-9]*.[0-9]*' 2>/dev/null || true)

if [[ -n "$LAST_TAG" ]]; then
  RANGE="${LAST_TAG}..HEAD"
  CURRENT_VERSION="${LAST_TAG#v}"
  echo "Last tag: #$LAST_TAG#"
else
  RANGE="HEAD"
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

write_messages_file() {
  if [[ -s messages.txt ]]; then
    return 0
  fi

  # Keep one commit body + subject stream so BREAKING CHANGE notes are detected.
  git log "$RANGE" --no-decorate --pretty=format:'%s%n%b%n---' > messages.txt
}

detect_increment() {
  local increment_type="none"
  local block

  while IFS= read -r block; do
    [[ -z "$block" ]] && continue

    if grep -Eq 'BREAKING CHANGE|BREAKING CHANGES' <<< "$block" || grep -Eq '^[a-zA-Z0-9_-]+\([^)]*\)!:|^[a-zA-Z0-9_-]+!:' <<< "$block"; then
      echo "major"
      return
    fi

    if grep -Eq '^feat(\([^)]*\))?:' <<< "$block"; then
      increment_type="minor"
      continue
    fi

    if [[ "$increment_type" == "none" ]] && grep -Eq '^fix(\([^)]*\))?:' <<< "$block"; then
      increment_type="patch"
    fi
  done < <(awk 'BEGIN{RS="---\n"} {print $0}' messages.txt)

  echo "$increment_type"
}

start() {
  write_messages_file

  local increment_type
  increment_type=$(detect_increment)
  local new_version
  new_version=$(increment_version "$CURRENT_VERSION" "$increment_type")

  echo "Current version: $CURRENT_VERSION"
  echo "Next increment: $increment_type"
  echo "Next version: $new_version"
}

start

if [[ -z "$PREVENT_REMOVE_FILE" ]]; then
  rm -f messages.txt
fi

