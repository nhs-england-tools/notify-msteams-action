#!/bin/bash

# GPG Wrapper Script for Non-Interactive Commit Signing
#
# This script intercepts GPG calls from git and automatically injects the
# passphrase from an environment variable, enabling fully automated commit
# signing in CI/CD pipelines without interactive prompts.
#
# Usage:
#   1. Set APP_SIGNING_KEY_PASSPHRASE environment variable
#   2. Configure git to use this wrapper: git config gpg.program /path/to/gpg-wrapper.sh
#   3. Enable commit signing: git config commit.gpgsign true
#
# The script will automatically pass the passphrase to GPG in loopback mode.

set -euo pipefail

# Verify passphrase environment variable is set
if [ -z "${APP_SIGNING_KEY_PASSPHRASE:-}" ]; then
  echo "Error: APP_SIGNING_KEY_PASSPHRASE environment variable is not set" >&2
  exit 1
fi

# Call GPG with batch mode, loopback pinentry, and automatic passphrase injection
# All original arguments ($@) are forwarded to GPG
gpg --batch --pinentry-mode=loopback --passphrase "$APP_SIGNING_KEY_PASSPHRASE" "$@"
