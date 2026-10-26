# Code signing

Unsigned installers work but trigger Windows SmartScreen and macOS Gatekeeper warnings. Signing is optional; the release workflow skips any step whose secrets are missing. See [RELEASING.md](RELEASING.md) for how updates and releases work.

## Windows

Choose one option.

### Azure Trusted Signing

Low cost, no hardware token, works from CI. Create a Trusted Signing account and certificate profile in Azure, then configure `bundle.windows.signCommand` in `tauri.conf.json` to call the `trusted-signing-cli` tool, passing the account and profile names. Store the Azure service principal credentials (`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`) as repository secrets.

### OV / EV certificate

Buy a code signing certificate from a CA. EV certificates gain SmartScreen reputation immediately but usually live on a hardware token or cloud HSM; OV certificates build reputation over time.

For a `.pfx` file, create these secrets (the release workflow imports it automatically when present):

| Secret | Value |
| --- | --- |
| `WINDOWS_CERTIFICATE` | Base64 of the `.pfx` (`certutil -encode cert.pfx cert.txt` or `base64 -w0 cert.pfx`) |
| `WINDOWS_CERTIFICATE_PASSWORD` | Password of the `.pfx` |

The workflow imports the certificate, then sets `certificateThumbprint`, `digestAlgorithm` and `timestampUrl` for the build. For cloud HSM or token-based EV certificates, use a custom `signCommand` instead.

### SignPath (free for open source)

[SignPath Foundation](https://signpath.org/) signs open-source projects for free. Apply with the repository, then add the SignPath GitHub Action after the build and before publishing the release, and store `SIGNPATH_API_TOKEN` as a secret.

## macOS signing and notarization

Requires an Apple Developer account. Export a "Developer ID Application" certificate as `.p12`, then add:

| Secret | Value |
| --- | --- |
| `APPLE_CERTIFICATE` | Base64 of the `.p12` (`base64 -i cert.p12`) |
| `APPLE_CERTIFICATE_PASSWORD` | Password used when exporting the `.p12` |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Name (TEAMID)` |
| `APPLE_ID` | Apple ID email used for notarization |
| `APPLE_PASSWORD` | App-specific password generated at appleid.apple.com |
| `APPLE_TEAM_ID` | Your 10-character team ID |

`tauri-action` signs and notarizes automatically when these are set.

## Linux

No signing is required. Packages are distributed as `.deb`, `.rpm` and `.AppImage` from the release page.
