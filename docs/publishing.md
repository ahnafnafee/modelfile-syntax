# Publishing checklist

Internal docs for cutting a release of **ollama-modelfile**.

## Prerequisites

- `VSCE_PAT` — Personal Access Token for the Visual Studio Marketplace, with `Marketplace > Manage` scope. Generated at <https://dev.azure.com/>. Stored as a GitHub secret.
- `OVSX_PAT` — Personal Access Token for the Open VSX Registry. Generated at <https://open-vsx.org/user-settings/tokens>. Stored as a GitHub secret.
- Marketplace publisher `ahnafnafee` must exist (created at <https://marketplace.visualstudio.com/manage>).
- Open VSX namespace `ahnafnafee` must exist (verified via the Open VSX UI).

## Release process

1. Verify `main` is green: <https://github.com/ahnafnafee/ollama-modelfile/actions>.
2. Update `package.json`:
   - Bump `version` (semver — patch for fixes, minor for features, major for breaking changes).
3. Update `CHANGELOG.md`:
   - Move `Unreleased` entries under a new dated heading.
   - Add a comparison link at the bottom: `[X.Y.Z]: https://github.com/ahnafnafee/ollama-modelfile/compare/vX.Y.W...vX.Y.Z`.
4. Commit and push to `main`:
   ```bash
   git add package.json CHANGELOG.md package-lock.json
   git commit -m "release: vX.Y.Z"
   git push
   ```
5. Wait for CI green on `main`.
6. Tag and push the tag:
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
7. The `release.yml` workflow runs automatically:
   - Verifies the tag matches `package.json` version.
   - Builds and tests the extension.
   - Packages the `.vsix`.
   - Publishes to the Visual Studio Marketplace (`vsce publish`).
   - Publishes to the Open VSX Registry (`ovsx publish`).
   - Creates a GitHub Release with auto-generated notes and the `.vsix` attached.
8. Verify both registries:
   - Marketplace: <https://marketplace.visualstudio.com/items?itemName=ahnafnafee.ollama-modelfile>
   - Open VSX: <https://open-vsx.org/extension/ahnafnafee/ollama-modelfile>
9. Smoke-test the new version in at least one editor by installing the new release.

## Rolling back

If a published version has a critical bug:

1. **Unpublish on Marketplace** (only possible within a short window — see Marketplace docs). For older releases, publish a patch instead.
2. **Republish previous version** on Open VSX with `ovsx publish` pointing to the previous `.vsix`.
3. Cut a new patch release (`X.Y.Z+1`) with the fix.

## Pre-release checks

Before tagging, manually verify:

- The README on GitHub renders correctly (tables, badges, FAQ anchors).
- `images/icon.png` exists and is 128×128 (or 256×256 for Retina).
- `images/banner-marketplace.png` (if shipping) is 1280×640.
- `.vscodeignore` excludes everything except `dist/`, `syntaxes/*.json`, `snippets/`, `language-configuration.json`, `images/`, `README.md`, `CHANGELOG.md`, `LICENSE`, `package.json`.
- Running `npx vsce package` produces a `.vsix` under 1 MB.

## Publisher metadata

Update `package.json` only if any of the following change:

- `displayName` — Marketplace headline.
- `description` — Marketplace tagline and search snippet.
- `categories` — primary classification (`Programming Languages`, `Linters`, `Snippets`).
- `keywords` — max 30; Marketplace search ranks against these.
- `icon` — Marketplace listing image.
- `galleryBanner` — header color/theme on the Marketplace page.
