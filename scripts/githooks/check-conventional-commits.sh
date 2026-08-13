#!/bin/bash
# This repo uses https://github.com/cycjimmy/semantic-release-action to generate release notes and versioning based on conventional commits.
# This script is used to check that the commit messages are valid conventional commits.

# Regex to validate the type pattern
REGEX="^((Merge[ a-z-]* branch.*)|(Revert*)|((build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\(.*\))?!?: .*))"

if [[ -z "$1" ]]; then
	echo >&2 "ERROR: Missing commit message file argument."
	exit 1
fi

FILE=$(cat "$1") # File containing the commit message

echo "Commit Message: ${FILE}"

if ! [[ $FILE =~ $REGEX ]]; then
	echo >&2 "ERROR: Commit aborted for not following the Conventional Commit standard. See Release_Process.md for more info​"
	exit 1
else
	echo >&2 "Valid commit message."
fi
