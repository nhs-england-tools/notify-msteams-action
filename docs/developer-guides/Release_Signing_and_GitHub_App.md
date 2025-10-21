# Guide: Release Commit Signing with a GitHub App

This guide describes a secure pattern for producing signed release commits and tags for this Action using GitHub App native commit signing:

1. A dedicated GitHub App (least privilege access token instead of the default workflow token).
2. A GPG signing key registered directly with the GitHub App (not a user account) so commits show as **Verified** and are attributed to the App.
3. A GPG wrapper script that enables non-interactive passphrase injection for fully automated CI/CD workflows.
4. Rotation and revocation procedures that minimise exposure while preserving provenance.

It complements the existing documents:

- `Release_Process.md` (overall release automation)
- `Sign_Git_commits.md` (general commit signing)

---

## 1. Architecture Overview

Component | Purpose
----------|--------
GitHub App | Issues an installation token with only the required repository permissions (Contents, Issues, Pull requests) for semantic-release to push a release commit and create a tag and GitHub Release. Also provides the identity for commit attribution.
GPG Signing Key (App) | A dedicated GPG key registered with the GitHub App for commit signing. Enables cryptographic signatures on release commits and tags so branch protection rules that require signed commits are satisfied.
GPG Wrapper Script | A shell script that intercepts GPG calls and automatically injects the passphrase, enabling non-interactive commit signing in CI/CD pipelines.
Workflow Logic | Obtains GitHub App installation token, imports GPG key, configures custom GPG wrapper, enables signing, runs semantic-release.

Release flow (simplified):

1. Publish workflow starts after merge to `main`.
2. Workflow obtains a GitHub App installation token via JWT authentication.
3. Workflow imports GPG signing key and configures `git` to use custom GPG wrapper script.
4. `semantic-release` computes next version, updates artefacts, creates signed commit and tag using the App token.
5. GitHub UI shows commit and tag as **Verified** and attributed to the GitHub App.

---

## 2. Prerequisites

- An organisation (or user) GitHub account with permission to create a GitHub App.
- Local machine with recent `gpg` (GnuPG 2.2+), `bash`, `openssl`, `jq`, and `curl`.
- GitHub Actions runner environment (ubuntu-latest or similar with the above tools pre-installed).

---

## 3. Create a GitHub App

1. Navigate to: Settings → Developer settings → GitHub Apps → New GitHub App.
2. Recommended fields:

   - Name: `notify-msteams-action-release`
   - Homepage URL: Repository URL
   - Webhook: Disabled (not required for basic releases)

3. Permissions (Repository):

   - Contents: Read & write
   - Issues: Read & write (release notes may reference issues)
   - Pull requests: Read & write (release notes may reference pull requests)
   - Metadata: Read (implicit)

4. Events: None required (semantic-release drives actions proactively).
5. Create the App, then Install it on the target repository.
6. Generate a **Private key** (for authentication) and download the `.pem` file.

Record:

- App ID (numeric)
- Installation ID (visible in URL after install or retrievable via API)
- Private key content (authentication PEM)

> Do not commit the private key; treat it as sensitive material.

---

## 4. Generate a Dedicated GPG Signing Key

Use a distinct identity for the GitHub App automation. The key will be registered with the App (not a user account).

### 4.1 Interactive Method

```bash
BOT_NAME="notify-msteams-action release bot"
BOT_EMAIL="noreply@github.com"  # Can be any email; not tied to a GitHub user

gpg --full-generate-key
# Select key type: ECC (ed25519) or ED25519 if offered directly
# Key size: (not prompted for ed25519)
# Expiration: 1y (recommended; rotate periodically)
# Real name: $BOT_NAME
# Email: $BOT_EMAIL
# Comment: (leave blank or 'release')
# Enter a strong passphrase (store it securely)
```

### 4.2 Batch (Deterministic) Method

```bash
BOT_NAME="notify-msteams-action release bot"
BOT_EMAIL="noreply@github.com"
PASSPHRASE=$(openssl rand -base64 32)

cat > key.batch <<EOF
%echo Generating release signing key
Key-Type: eddsa
Key-Curve: Ed25519
Subkey-Type: eddsa
Subkey-Curve: Ed25519
Name-Real: $BOT_NAME
Name-Email: $BOT_EMAIL
Expire-Date: 1y
Passphrase: $PASSPHRASE
%commit
%echo done
EOF

gpg --batch --generate-key key.batch
rm key.batch
echo "Store passphrase safely: $PASSPHRASE"
```

### 4.3 List and Capture Key Details

```bash
gpg --list-secret-keys --keyid-format LONG "$BOT_EMAIL"
```

Example output:

```bash
sec   ed25519/ABC123DEF456789A 2025-09-30 [SC]
      FINGERPRINTFINGERPRINTFINGERPRINTFINGERPRINT
uid                 [ultimate] notify-msteams-action release bot <noreply@github.com>
ssb   ed25519/BBBBBBBBBBBBBBBB 2025-09-30 [E]
```

Record:

- **Key ID**: The short form after `sec ed25519/` (e.g., `ABC123DEF456789A`)
- **Fingerprint**: The 40-hex-character fingerprint for audits
- **Passphrase**: Store securely in secrets manager

---

## 5. Export Keys and Create Revocation Certificate

```bash
KEY_ID="ABC123DEF456789A"  # Replace with your key ID
FPR="<REPLACE_WITH_FULL_FINGERPRINT>"

# Public key (for GitHub App)
gpg --armor --export "$KEY_ID" > public-release-key.asc

# Private key (for Actions secret)
gpg --armor --export-secret-keys "$KEY_ID" > private-release-key.asc

# Revocation certificate (store offline)
gpg --output revoke-release-key.asc --gen-revoke "$FPR" <<EOF
y
Key compromised
y
EOF
```

Storage recommendations:

- `public-release-key.asc`: Will be uploaded to GitHub App settings.
- `private-release-key.asc`: Never commit; store in a secret manager.
- `revoke-release-key.asc`: Offline / restricted (use only if key should be revoked).

---

## 6. Add the Public GPG Key to the GitHub App

**Critical difference from user-based signing:** The GPG key is registered with the GitHub App, not a user account.

1. Navigate to your GitHub App settings: Settings → Developer settings → GitHub Apps → [Your App].
2. Scroll to **Optional features** section.
3. Under **Commit signing**, click **Add a signing key**.
4. Paste the contents of `public-release-key.asc`.
5. Save the changes.

Result: Commits signed with this key will show as **Verified** and attributed to the GitHub App (not an individual user).

---

## 7. Store Secrets in the Repository

### 7.1 Required Secrets

The following secrets must be configured in Repository Settings → Secrets and variables → Actions:

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `GITHUB_APP_ID` | GitHub App ID | Create installation token via JWT |
| `GITHUB_APP_PRIVATE_KEY` | Contents of the `.pem` authentication key | Authenticate as App |
| `GITHUB_APP_SIGNING_KEY_ID` | GPG key ID (e.g., `ABC123DEF456789A`) | Specify which key to use for signing |
| `GITHUB_APP_SIGNING_KEY` | Contents of `private-release-key.asc` | Import for signing |
| `GITHUB_APP_SIGNING_KEY_PASSPHRASE` | Passphrase string | Unlock key via GPG wrapper |

Optional secrets:

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `GITHUB_APP_INSTALLATION_ID` | Installation ID | Some tooling needs explicit value |
| `GPG_KEY_FPR` | Fingerprint | Audit / logging |

Consider using an **Environment** with required reviewers for additional control if higher assurance is needed.

### 7.2 Automated Secret Upload (Recommended)

To make secret upload easier, repeatable, and less error-prone, use the provided helper script:

```bash
# Interactive mode (prompts for values)
./scripts/upload-signing-secrets.sh

# Non-interactive mode with all values provided
./scripts/upload-signing-secrets.sh \
  --repo nhs-england-tools/notify-msteams-action \
  --app-id 12345 \
  --app-private-key ./app-private-key.pem \
  --signing-key-id ABC123DEF456789A \
  --signing-key ./signing-key.asc \
  --signing-key-passphrase "my-secure-passphrase"

# Upload to a specific environment
./scripts/upload-signing-secrets.sh --env production

# Dry run to verify before uploading
./scripts/upload-signing-secrets.sh --dry-run
```

**Prerequisites:**
- GitHub CLI (`gh`) installed and authenticated: `gh auth login`
- Repository permissions to manage secrets

**Benefits of using the script:**
- **Repeatable**: Same process for initial setup and rotation
- **Less error-prone**: Validates files exist and reads content correctly
- **Faster**: Uploads all five secrets in one command
- **Auditable**: Shows summary before uploading with confirmation prompt
- **Secure**: Supports password masking and dry-run mode

### 7.3 Manual Upload (Alternative)

If you prefer manual upload via the GitHub UI:

1. Navigate to: Repository → Settings → Secrets and variables → Actions
2. Click "New repository secret" for each secret
3. Paste the appropriate value from Section 5 (exported keys)
4. Save each secret

---

## 8. Workflow Integration

The publish workflow implements the following phases:

1. Generate GitHub App installation token.
2. Create GPG wrapper script for non-interactive passphrase injection.
3. Import GPG key and configure git signing.
4. Run semantic-release with the App token.

### 8.1 Complete Workflow Example

```yaml
- name: Generate GitHub App token
  uses: actions/create-github-app-token@v1
  id: app-token
  with:
    app-id: ${{ secrets.GITHUB_APP_ID }}
    private-key: ${{ secrets.GITHUB_APP_PRIVATE_KEY }}

- name: Import GPG key and configure signing
  env:
    GPG_SIGNING_KEY: ${{ secrets.GITHUB_APP_SIGNING_KEY }}
    GPG_KEY_ID: ${{ secrets.GITHUB_APP_SIGNING_KEY_ID }}
    GITHUB_APP_SIGNING_KEY_PASSPHRASE: ${{ secrets.GITHUB_APP_SIGNING_KEY_PASSPHRASE }}
  run: |
    # Import the GPG signing key
    echo "$GPG_SIGNING_KEY" | gpg --batch --import

    # Configure git identity (will show as GitHub App)
    git config --global user.name "notify-msteams-action release bot"
    git config --global user.email "noreply@github.com"

    # Configure commit signing with custom GPG wrapper (from repository)
    git config --global user.signingkey "$GPG_KEY_ID"
    git config --global commit.gpgsign true
    git config --global tag.gpgSign true
    git config --global gpg.program "$GITHUB_WORKSPACE/scripts/gpg-wrapper.sh"

    # Configure GPG for non-interactive mode
    mkdir -p ~/.gnupg
    echo 'pinentry-mode loopback' >> ~/.gnupg/gpg.conf
    echo 'allow-loopback-pinentry' >> ~/.gnupg/gpg-agent.conf || true
    chmod 700 ~/.gnupg

    # Set GPG_TTY for terminal interaction
    export GPG_TTY=$(tty)

- name: Semantic Release
  uses: cycjimmy/semantic-release-action@v4.1.1
  env:
    GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
```

### 8.2 How the GPG Wrapper Works

The GPG wrapper script (`scripts/gpg-wrapper.sh`) is committed to the repository and intercepts all GPG calls from git to automatically inject the passphrase:

- **Key insight**: `git config gpg.program $GITHUB_WORKSPACE/scripts/gpg-wrapper.sh` redirects all GPG operations through the custom script.
- The wrapper calls `gpg --batch --pinentry-mode=loopback --passphrase "$GITHUB_APP_SIGNING_KEY_PASSPHRASE"` with all original arguments.
- This enables fully automated, non-interactive commit signing without user prompts.
- The script is version-controlled, making it easier to maintain, test, and audit.

The commit and tag produced by semantic-release will now:

- Be authored with the configured identity.
- Be signed with the GitHub App's GPG key.
- Show as **Verified** and attributed to the GitHub App.
- Be pushed using the App installation token.

---

## 9. Verifying a Release Commit

After a publish completes:

1. Inspect the release commit in the GitHub UI → should display **Verified** with the GitHub App as the committer.
2. Locally verify the signature (optional):

   ```bash
   git fetch --tags origin
   git show --show-signature <release-commit-sha>
   git verify-tag vX.Y.Z
   ```

If not verified:

- Ensure the public GPG key was added to the GitHub App settings (not a user account).
- Confirm the workflow logs show successful key import and signing configuration.
- Verify the GPG wrapper script was created and configured correctly.
- Check that `git config gpg.program` points to the wrapper script.
- Ensure the passphrase secret is correct and accessible.

---

## 10. Rotation Procedure

Rotate at least every 6–12 months or on suspicion of compromise.

1. Generate new GPG key (repeat Section 4) with new expiration and passphrase.
2. Export the new public and private keys (Section 5).
3. Add the new public key to the GitHub App settings *before* changing secrets:
   - Navigate to GitHub App → Optional features → Commit signing
   - Add the new signing key (you can have multiple keys during transition)
4. Update repository secrets with new values using the helper script:
   ```bash
   ./scripts/upload-signing-secrets.sh \
     --app-id <SAME_APP_ID> \
     --app-private-key <SAME_OR_NEW_APP_KEY> \
     --signing-key-id <NEW_KEY_ID> \
     --signing-key ./new-signing-key.asc \
     --signing-key-passphrase "<NEW_PASSPHRASE>"
   ```
   Or manually update these secrets in the repository settings:
   - `GITHUB_APP_SIGNING_KEY_ID`: New key ID
   - `GITHUB_APP_SIGNING_KEY`: New private key content
   - `GITHUB_APP_SIGNING_KEY_PASSPHRASE`: New passphrase
5. Trigger a release; confirm **Verified** with new key.
6. After validation, remove the old public key from GitHub App settings.
7. Securely destroy old private key material and revocation certificate.
8. Generate new revocation certificate for the new key and store offline.

**Note on historical signatures:** GitHub maintains associations with keys even after removal, so historical commits remain verifiable.

**Automated rotation idea:** Add a scheduled workflow that opens a pull request reminding maintainers to rotate the key one month before expiration (lightweight operational control).

---

## 11. Revocation Certificate Usage

If the private key is believed compromised:

1. Import and apply the revocation certificate locally:

   ```bash
   gpg --import revoke-release-key.asc
   gpg --list-keys --with-colons | grep '^rev' || echo "Revocation not applied"
   ```

2. Publish the updated (revoked) public key to a keyserver if you use them (optional; GitHub relies on its stored copy).
3. **Immediately remove the compromised key from the GitHub App**:
   - Navigate to GitHub App → Optional features → Commit signing
   - Delete the compromised signing key
4. Remove the compromised secrets from the repository settings:
   - Delete `GITHUB_APP_SIGNING_KEY`
   - Delete `GITHUB_APP_SIGNING_KEY_PASSPHRASE`
   - Delete `GITHUB_APP_SIGNING_KEY_ID`
5. Generate and register a new key (Sections 4–6).
6. Update secrets with the new key and passphrase.
7. Disable the publish workflow temporarily to prevent unsigned commits.
8. After new secrets are in place, force a new (safe) release to demonstrate restored integrity.

Result: Past commits remain historically signed; future validation will show the old key as revoked (depending on trust model of the tooling verifying it).

---

## 12. Hardening Recommendations

Area | Recommendation
-----|---------------
Key Scope | Use a single-purpose key (do not reuse personal keys).
Expiration | Set 6–12 month expiry; track renewal date.
Passphrase | Random 24–32 bytes Base64; never in plaintext logs.
Secret Exposure | Use repository or environment secrets; restrict repository access narrowly.
Audit | Log key fingerprint (only) at workflow start.
App Permissions | Grant minimum write permissions; review annually.
Environment Protection | Use an Environment with required approvers for the publish job if policy requires.
Subkeys (Advanced) | Create a primary (certify-only) key offline and a signing subkey for the runner.

---

## 13. Troubleshooting Matrix

Symptom | Likely Cause | Resolution
--------|--------------|-----------
Commit not Verified | GPG key not registered with GitHub App | Add public key to GitHub App → Optional features → Commit signing
Unsigned commit | Missing key import or signing disabled | Inspect workflow logs; ensure `commit.gpgsign true` and key imported
Bad signature error | Corrupted key or wrong passphrase | Re-import key; verify passphrase secret content; check wrapper script
GPG passphrase prompt | Wrapper script not configured | Ensure `git config gpg.program` points to `scripts/gpg-wrapper.sh`; verify `GITHUB_APP_SIGNING_KEY_PASSPHRASE` environment variable is set
Tag unsigned | `tag.gpgSign` not set | Add `git config --global tag.gpgSign true`
App token push denied | Missing Contents write permission | Update App permissions and reinstall
Wrapper script not found | Incorrect path or permissions | Verify `scripts/gpg-wrapper.sh` exists and is executable (`chmod +x`)
GPG agent errors | Agent not configured for loopback | Add `pinentry-mode loopback` to `~/.gnupg/gpg.conf` and restart agent

---

## 14. Optional Enhancements

- Add a guard step that fails if `GITHUB_APP_SIGNING_KEY` is empty while branch protection requires signed commits:

  ```yaml
  - name: Verify signing secrets exist
    run: |
      if [ -z "${{ secrets.GITHUB_APP_SIGNING_KEY }}" ]; then
        echo "Error: GITHUB_APP_SIGNING_KEY secret is not configured"
        exit 1
      fi
  ```

- Add a post-release verification step:

  ```bash
  git verify-commit HEAD || exit 1
  git describe --tags --exact-match HEAD >/dev/null 2>&1 && git verify-tag $(git describe --tags --exact-match HEAD)
  ```

- Implement a scheduled reminder for key rotation.
- Log the GPG key fingerprint (not the key itself) at workflow start for audit trails:

  ```bash
  gpg --list-keys --with-colons | awk -F: '/^fpr/ {print "Using GPG key: " $10; exit}'
  ```

---

## 15. Benefits of This Approach

Using GitHub App native commit signing with a GPG wrapper script yields:

1. **Fully automated**: No manual intervention required; fully non-interactive workflow.
2. **Verified commits**: All commits show as "Verified" on GitHub and attributed to the GitHub App.
3. **Minimal access token scope**: App tokens are scoped to specific repositories with least-privilege permissions.
4. **Cryptographically verifiable provenance**: Release artefacts (`dist/`, `package.json` changes, `VERSION`) have strong cryptographic signatures.
5. **Clear attribution**: Commits are attributed to the GitHub App, not an individual user account.
6. **Auditable**: GitHub App activity is logged and traceable.
7. **Secure**: Uses short-lived tokens and proper passphrase management.
8. **CI/CD friendly**: GPG wrapper script enables seamless automation without interactive prompts.
9. **Clear operational playbooks**: Well-defined procedures for rotation and emergency revocation.

Adopting this pattern strengthens the supply chain integrity of the Action while maintaining full automation and keeping the maintenance burden low.

---

## 16. References

- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [GitHub App Authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app)
- [GPG Signing Commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits)
- [GitHub Apps Commit Signing](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-commit-signing-with-github-apps)
