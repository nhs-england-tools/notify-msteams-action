# Guide: Release Commit Signing with a GitHub App

This guide describes a secure pattern for producing signed release commits and tags for this Action using:

1. A dedicated GitHub App (least privilege access token instead of the default workflow token).
2. A dedicated GPG signing key whose public part is registered with a GitHub account so commits show as **Verified**.
3. Rotation and revocation procedures that minimise exposure while preserving provenance.

It complements the existing documents:
- `Release_Process.md` (overall release automation)
- `Sign_Git_commits.md` (general commit signing)

---
## 1. Architecture Overview

Component | Purpose
----------|--------
GitHub App | Issues an installation token with only the required repository permissions (Contents, Issues, Pull requests) for semantic-release to push a release commit and create a tag and GitHub Release.
GPG Key (automation) | Provides a cryptographic signature on the release commit and tag so branch protection rules that require signed commits are satisfied.
Workflow Logic | Imports the private key, enables signing, obtains the App token, runs semantic-release.

Release flow (simplified):
1. Publish workflow starts after merge to `main`.
2. Workflow obtains a GitHub App installation token.
3. Workflow imports GPG key, configures `git` for signing.
4. `semantic-release` computes next version, updates artefacts, creates signed commit and tag using the App token.
5. GitHub UI shows commit and tag as **Verified**.

---
## 2. Prerequisites

- An organisation (or user) GitHub account with permission to create a GitHub App.
- A verified email address to anchor the automation identity (for example `actions+notify-msteams-action@yourdomain.example`).
- Local machine with recent `gpg` (GnuPG 2.2+) and `bash`.

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
6. Generate a **Private key** and download the `.pem` file.

Record:
- App ID (numeric)
- Installation ID (visible in URL after install or retrievable via API)
- Private key content

> Do not commit the private key; treat it as sensitive material.

---
## 4. Generate a Dedicated GPG Signing Key

Use a distinct identity separate from personal developer keys.

### 4.1 Interactive Method

```bash
BOT_NAME="notify-msteams-action release bot"
BOT_EMAIL="actions+notify-msteams-action@yourdomain.example"

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
BOT_EMAIL="actions+notify-msteams-action@yourdomain.example"
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

### 4.3 List and Capture Fingerprint

```bash
gpg --list-secret-keys --keyid-format LONG "$BOT_EMAIL"
```
Example output (truncated):
```
sec   ed25519/AAAAAAAAAAAAAAAA 2025-09-30 [SC]
      FINGERPRINTFINGERPRINTFINGERPRINTFINGERPRINT
uid                 [ultimate] notify-msteams-action release bot <actions+notify-msteams-action@yourdomain.example>
ssb   ed25519/BBBBBBBBBBBBBBBB 2025-09-30 [E]
```
Use the 40-hex-character fingerprint (not the short key ID) for audits.

---
## 5. Export Keys and Create Revocation Certificate

```bash
FPR="<REPLACE_WITH_FULL_FINGERPRINT>"

# Public key (for GitHub account)
gpg --armor --export "$FPR" > public-release-key.asc

# Private key (for Actions secret)
gpg --armor --export-secret-keys "$FPR" > private-release-key.asc

# Revocation certificate (store offline)
gpg --output revoke-release-key.asc --gen-revoke "$FPR" <<EOF
y
Key compromised
y
EOF
```

Storage recommendations:
- `public-release-key.asc`: Safe to share; commit optional (not required).
- `private-release-key.asc`: Never commit; store in a secret manager.
- `revoke-release-key.asc`: Offline / restricted (use only if key should be revoked).

---
## 6. Add the Public Key to GitHub

1. Log in as the account that will appear as author/committer.
2. Settings → **SSH and GPG keys** → **New GPG key**.
3. Paste contents of `public-release-key.asc`.
4. Ensure the email in the UID (`BOT_EMAIL`) is verified under that account (Settings → Emails). Without this, signatures will not show as **Verified**.

---
## 7. Store Secrets in the Repository

Repository Settings → Secrets and variables → Actions → New repository secret:

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `APP_ID` | GitHub App ID | Create installation token |
| `APP_PRIVATE_KEY` | Contents of the `.pem` | Authenticate as App |
| `APP_INSTALLATION_ID` (optional) | Installation ID | Some tooling needs explicit value |
| `GPG_PRIVATE_KEY` | Contents of `private-release-key.asc` | Import for signing |
| `GPG_PASSPHRASE` | Passphrase string | Unlock key (loopback) |
| `GPG_KEY_FPR` (optional) | Fingerprint | Audit / logging |

Consider using an **Environment** with required reviewers for additional control if higher assurance is needed.

---
## 8. Workflow Integration (Conceptual Snippet)

The publish workflow adds three phases:
1. Import GPG key and enable signing.
2. Mint a GitHub App token.
3. Run semantic-release with that token.

Illustrative fragment (do **not** duplicate if already integrated):

```yaml
- name: Generate GitHub App token
  uses: actions/create-github-app-token@v1
  id: app-token
  with:
    app-id: ${{ secrets.APP_ID }}
    private-key: ${{ secrets.APP_PRIVATE_KEY }}
    # installation-id: ${{ secrets.APP_INSTALLATION_ID }}  # if needed

- name: Import GPG key and enable signing
  if: ${{ secrets.GPG_PRIVATE_KEY != '' }}
  env:
    GPG_PRIVATE_KEY: ${{ secrets.GPG_PRIVATE_KEY }}
    GPG_PASSPHRASE: ${{ secrets.GPG_PASSPHRASE }}
  run: |
    echo "$GPG_PRIVATE_KEY" > /tmp/private.key
    gpg --batch --import /tmp/private.key
    KEY_ID=$(gpg --list-secret-keys --with-colons | awk -F: '/^sec/ {print $5; exit}')
    git config user.name "notify-msteams-action release bot"
    git config user.email "actions+notify-msteams-action@yourdomain.example"
    git config --global user.signingkey "$KEY_ID"
    git config --global commit.gpgsign true
    git config --global tag.gpgSign true
    echo 'pinentry-mode loopback' >> ~/.gnupg/gpg.conf
    echo 'allow-loopback-pinentry' >> ~/.gnupg/gpg-agent.conf || true
    export GPG_TTY=$(tty)

- name: Export App token to environment
  run: echo "GITHUB_TOKEN=${{ steps.app-token.outputs.token }}" >> $GITHUB_ENV

- name: Semantic Release
  uses: cycjimmy/semantic-release-action@v4.1.1
  env:
    GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
```

The commit and tag produced by semantic-release will now:
- Be authored with the automation identity.
- Be signed with the imported key.
- Be pushed using the App token.

---
## 9. Verifying a Release Commit

After a publish completes:
1. Inspect the release commit in the GitHub UI → should display **Verified**.
2. Locally verify the signature (optional):
   ```bash
   git fetch --tags origin
   git show --show-signature <release-commit-sha>
   git verify-tag vX.Y.Z
   ```

If not verified:
- Check that the email matches the key UID and is verified in GitHub.
- Ensure the public key was added to the correct account.
- Confirm the workflow logs show key import and signing configuration.

---
## 10. Rotation Procedure

Rotate at least every 6–12 months or on suspicion of compromise.

1. Generate new key (repeat Section 4) with new expiration.
2. Add new public key to the GitHub account *before* changing secrets.
3. Add new `GPG_PRIVATE_KEY` and `GPG_PASSPHRASE` secrets (overwriting old values).
4. (Optional) Keep old key public part for a short overlap if verifying historical signatures—GitHub keeps prior association.
5. Trigger a release; confirm **Verified** with new key (fingerprint in logs if you output it).
6. After validation, securely destroy old private key material.
7. Optionally revoke the old key if you want GitHub to show future validations as revoked (not usually necessary if simply retired).

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
3. Remove the compromised secrets from the repository settings.
4. Generate and register a new key (Sections 4–6).
5. Update secrets with the new key and passphrase.
6. Force a new (safe) release to demonstrate restored integrity.

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
Commit not Verified | Email mismatch | Align `git config user.email` with key UID and verified email.
Unsigned commit | Missing key import or signing disabled | Inspect workflow logs; ensure `commit.gpgsign true`.
Bad signature error | Corrupted key or wrong passphrase | Re-import key; verify passphrase secret content.
Tag unsigned | `tag.gpgSign` not set | Add `git config --global tag.gpgSign true`.
App token push denied | Missing Contents write permission | Update App permissions and reinstall.

---
## 14. Optional Enhancements

- Add a guard step that fails if `GPG_PRIVATE_KEY` is empty while branch protection requires signed commits.
- Add a post-release verification step:
  ```bash
  git verify-commit HEAD || exit 1
  git describe --tags --exact-match HEAD >/dev/null 2>&1 && git verify-tag $(git describe --tags --exact-match HEAD)
  ```
- Implement a scheduled reminder for key rotation.

---
## 15. Summary

Using a GitHub App + dedicated GPG automation key yields:
- Minimal access token scope.
- Cryptographically verifiable provenance for release artefacts (`dist/`, `package.json` changes, `VERSION`).
- Clear operational playbooks for rotation and emergency revocation.

Adopting this pattern strengthens the supply chain integrity of the Action while keeping the maintenance burden low.
