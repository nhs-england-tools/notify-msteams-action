#!/bin/bash

# Upload GitHub App Signing Secrets
#
# This script automates the upload of GitHub App commit signing secrets to a repository,
# making secret rotation easier, repeatable, and less error-prone.
#
# Prerequisites:
#   - GitHub CLI (gh) installed and authenticated: gh auth login
#   - Repository permissions to manage secrets
#
# Usage:
#   ./scripts/upload-signing-secrets.sh [OPTIONS]
#
# Options:
#   --repo OWNER/REPO              Target repository (default: current repository)
#   --app-id ID                    GitHub App ID
#   --app-private-key FILE         Path to GitHub App private key (.pem file)
#   --signing-key-id KEY_ID        GPG signing key ID
#   --signing-key FILE             Path to GPG signing key (.asc file)
#   --signing-key-passphrase PASS  GPG signing key passphrase
#   --env ENVIRONMENT              Upload to environment instead of repository (optional)
#   --dry-run                      Show what would be uploaded without uploading
#   --help                         Show this help message
#
# Examples:
#   # Upload to current repository (interactive prompts for missing values)
#   ./scripts/upload-signing-secrets.sh
#
#   # Upload with all values provided
#   ./scripts/upload-signing-secrets.sh \
#     --repo nhs-england-tools/notify-msteams-action \
#     --app-id 12345 \
#     --app-private-key ./app-private-key.pem \
#     --signing-key-id ABC123DEF456789A \
#     --signing-key ./signing-key.asc \
#     --signing-key-passphrase "my-secure-passphrase"
#
#   # Upload to a specific environment
#   ./scripts/upload-signing-secrets.sh --env production
#
#   # Dry run to verify before uploading
#   ./scripts/upload-signing-secrets.sh --dry-run

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
REPO=""
APP_ID=""
APP_PRIVATE_KEY_FILE=""
SIGNING_KEY_ID=""
SIGNING_KEY_FILE=""
SIGNING_KEY_PASSPHRASE=""
ENVIRONMENT=""
DRY_RUN=false

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1" >&2
}

# Function to show help
show_help() {
    grep '^#' "$0" | grep -v '#!/bin/bash' | sed 's/^# \?//'
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --repo)
            REPO="$2"
            shift 2
            ;;
        --app-id)
            APP_ID="$2"
            shift 2
            ;;
        --app-private-key)
            APP_PRIVATE_KEY_FILE="$2"
            shift 2
            ;;
        --signing-key-id)
            SIGNING_KEY_ID="$2"
            shift 2
            ;;
        --signing-key)
            SIGNING_KEY_FILE="$2"
            shift 2
            ;;
        --signing-key-passphrase)
            SIGNING_KEY_PASSPHRASE="$2"
            shift 2
            ;;
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI (gh) is not installed."
    print_info "Install from: https://cli.github.com/"
    exit 1
fi

# Check if gh is authenticated
if ! gh auth status &> /dev/null; then
    print_error "GitHub CLI is not authenticated."
    print_info "Run: gh auth login"
    exit 1
fi

# Get current repository if not specified
if [ -z "$REPO" ]; then
    if git rev-parse --git-dir > /dev/null 2>&1; then
        REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
    fi

    if [ -z "$REPO" ]; then
        print_error "Could not determine repository. Use --repo OWNER/REPO"
        exit 1
    fi
    print_info "Using repository: $REPO"
fi

# Interactive prompts for missing values
if [ -z "$APP_ID" ]; then
    read -p "GitHub App ID: " APP_ID
fi

if [ -z "$APP_PRIVATE_KEY_FILE" ]; then
    read -p "Path to GitHub App private key (.pem file): " APP_PRIVATE_KEY_FILE
fi

if [ -z "$SIGNING_KEY_ID" ]; then
    read -p "GPG signing key ID: " SIGNING_KEY_ID
fi

if [ -z "$SIGNING_KEY_FILE" ]; then
    read -p "Path to GPG signing key (.asc file): " SIGNING_KEY_FILE
fi

if [ -z "$SIGNING_KEY_PASSPHRASE" ]; then
    read -s -p "GPG signing key passphrase: " SIGNING_KEY_PASSPHRASE
    echo
fi

# Validate required values
if [ -z "$APP_ID" ]; then
    print_error "GitHub App ID is required"
    exit 1
fi

if [ ! -f "$APP_PRIVATE_KEY_FILE" ]; then
    print_error "GitHub App private key file not found: $APP_PRIVATE_KEY_FILE"
    exit 1
fi

if [ -z "$SIGNING_KEY_ID" ]; then
    print_error "GPG signing key ID is required"
    exit 1
fi

if [ ! -f "$SIGNING_KEY_FILE" ]; then
    print_error "GPG signing key file not found: $SIGNING_KEY_FILE"
    exit 1
fi

if [ -z "$SIGNING_KEY_PASSPHRASE" ]; then
    print_error "GPG signing key passphrase is required"
    exit 1
fi

# Read file contents
print_info "Reading key files..."
APP_PRIVATE_KEY_CONTENT=$(cat "$APP_PRIVATE_KEY_FILE")
SIGNING_KEY_CONTENT=$(cat "$SIGNING_KEY_FILE")

# Display summary
echo
print_info "Summary of secrets to upload:"
echo "  Repository: $REPO"
if [ -n "$ENVIRONMENT" ]; then
    echo "  Environment: $ENVIRONMENT"
fi
echo "  APP_ID: $APP_ID"
echo "  APP_PRIVATE_KEY: (from $APP_PRIVATE_KEY_FILE, $(wc -l < "$APP_PRIVATE_KEY_FILE") lines)"
echo "  APP_SIGNING_KEY_ID: $SIGNING_KEY_ID"
echo "  APP_SIGNING_KEY: (from $SIGNING_KEY_FILE, $(wc -l < "$SIGNING_KEY_FILE") lines)"
echo "  APP_SIGNING_KEY_PASSPHRASE: ********"
echo

if [ "$DRY_RUN" = true ]; then
    print_warning "DRY RUN MODE - No secrets will be uploaded"
    exit 0
fi

# Confirm before uploading
read -p "Upload these secrets? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Upload cancelled"
    exit 0
fi

# Build gh secret set command base
if [ -n "$ENVIRONMENT" ]; then
    SECRET_CMD="gh secret set --repo $REPO --env $ENVIRONMENT"
else
    SECRET_CMD="gh secret set --repo $REPO"
fi

# Upload secrets
print_info "Uploading secrets..."

echo "$APP_ID" | $SECRET_CMD APP_ID
print_success "Uploaded APP_ID"

echo "$APP_PRIVATE_KEY_CONTENT" | $SECRET_CMD APP_PRIVATE_KEY
print_success "Uploaded APP_PRIVATE_KEY"

echo "$SIGNING_KEY_ID" | $SECRET_CMD APP_SIGNING_KEY_ID
print_success "Uploaded APP_SIGNING_KEY_ID"

echo "$SIGNING_KEY_CONTENT" | $SECRET_CMD APP_SIGNING_KEY
print_success "Uploaded APP_SIGNING_KEY"

echo "$SIGNING_KEY_PASSPHRASE" | $SECRET_CMD APP_SIGNING_KEY_PASSPHRASE
print_success "Uploaded APP_SIGNING_KEY_PASSPHRASE"

echo
print_success "All secrets uploaded successfully to $REPO"
if [ -n "$ENVIRONMENT" ]; then
    print_success "Environment: $ENVIRONMENT"
fi

# Security reminder
echo
print_warning "Security reminder:"
echo "  - Ensure key files are stored securely and not committed to version control"
echo "  - Consider deleting local key files if no longer needed"
echo "  - Document the rotation date for future reference"
echo "  - Test the workflow to verify secrets are working correctly"
