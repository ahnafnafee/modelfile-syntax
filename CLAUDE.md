# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A VSCode extension (`ahnafnafee.ollama-modelfile`) that provides TextMate-grammar-based syntax highlighting, an 18-rule linter, hover docs, autocomplete, and snippets for Ollama Modelfiles. Published to both the Visual Studio Marketplace and Open VSX Registry. See `README.md` and `docs/modelfile-reference.md` for product-level docs.

## Commands

The full local quality gate (what CI runs):

```bash
npm run lint        # eslint + prettier --check
npm run typecheck   # tsc --noEmit
npm run build:grammar
npm run test:grammar
npm run build       # esbuild bundles dist/extension.js + dist/web/extension.js
npm run compile:tests
npm test            # mocha against out/test/**/*.test.js
npm run package     # vsce package
```

Grammar workflow has two ordering gotchas:

- `npm run test:grammar` requires that `syntaxes/modelfile.tmLanguage.json` is up to date. The script chains `build:grammar` first; if you invoke `vscode-tmgrammar-snap` directly, run `npm run build:grammar` first.
- When you change `syntaxes/modelfile.tmLanguage.yml`, run `npm run test:grammar:update` (NOT `test:grammar`) to regenerate the `.snap` baselines. Verify the diff is intentional, then commit both the `.yml` source and the regenerated `.json` + all touched `.snap` files.

Single test file (Mocha grep): `npx mocha --grep 'OM005' out/test/**/*.test.js` after `npm run compile:tests`.

Run extension in dev: open the folder in VSCode and press <kbd>F5</kbd> (launches the Extension Development Host via `.vscode/launch.json`).

## Architecture

### Single source of truth: `src/linter/spec.ts`

Every other module that needs to know "what's a valid PARAMETER", "what's a valid MESSAGE role", "what's a documented TEMPLATE variable", or "what's a valid instruction keyword" imports from `spec.ts`. The diagnostics linter, the hover provider, and the completion provider all read this catalog. When the Ollama parser adds a new PARAMETER or instruction, **update `spec.ts` only** — the other layers pick it up automatically.

The TextMate grammar (`syntaxes/modelfile.tmLanguage.yml`) is a separate source of truth for colorization — it duplicates some of the same enum data (instruction keywords, parameter names, deprecated names, valid roles) because TextMate runs in the editor's syntax-highlighting layer before the linter ever runs. When you add a PARAMETER, update **both** `spec.ts` (for the linter) and `modelfile.tmLanguage.yml` (for highlighting).

### Linter pipeline

`document text` → `src/linter/parser.ts` (line-by-line tokenizer mirroring `ollama/parser/parser.go`'s state machine, including multi-line `"""..."""` body tracking) → `ParsedFile` → `src/linter/validator.ts` (runs every rule in `src/linter/rules.ts`, catching rule exceptions so a bug in one rule never breaks the editor) → `LintDiagnostic[]` → `src/providers/diagnostics.ts` (debounce 200ms on `onDidChangeTextDocument`, converts to `vscode.Diagnostic` with stable `OMNNN` rule codes that link to `docs/rules.md`).

The linter modules are **VSCode-agnostic** (no `import vscode`). This is why unit tests run under plain Mocha — no `@vscode/test-electron` is needed for the rule logic.

### Adding a linter rule

1. Pick the next free ID (e.g., `OM019`) and add it to the `RuleId` union in `src/linter/rules.ts`.
2. Append a `Rule` object to the `RULES` array.
3. Add unit tests in `src/test/linter.test.ts` (one positive + one negative case minimum).
4. Add a `<a id="om019"></a>` section to `docs/rules.md` with before/after examples.
5. Add a row to the linter-rules table in `README.md`.

### Build pipeline

`esbuild.config.mjs` produces **two** bundles in one invocation:

- `dist/extension.js` — Node target, for desktop VSCode / VSCodium / Cursor / Windsurf.
- `dist/web/extension.js` — browser target, for vscode.dev / github.dev.

Both bundles are referenced from `package.json` (`main` and `browser`). The codebase is intentionally pure JS (no `child_process`, no `fs`) so the web bundle works without conditionals. Don't introduce Node-only APIs without adding an environment guard.

### Release pipeline

A `v*.*.*` tag pushed to GitHub triggers `.github/workflows/release.yml`, which (in order): verifies the tag matches `package.json` version, runs the full quality gate, packages the `.vsix`, publishes to the Visual Studio Marketplace via `vsce` (using secret `VSCE_PAT`), publishes to Open VSX via `ovsx` (using secret `OVSX_PAT`), and creates a GitHub Release with the `.vsix` attached. See `docs/publishing.md` for the human-side checklist.

## Cross-platform gotchas

- **`.gitattributes` forces LF for every text file.** Prettier's `endOfLine: "lf"` enforcement runs in CI on Windows; without LF-locked checkout, every file fails `prettier --check`. Don't remove or weaken `.gitattributes` — keep `* text=auto eol=lf` plus the explicit per-extension entries and the `binary` entries for PNG/JPG/GIF/ICO/VSIX.
- **Generated files committed to disk:** `syntaxes/modelfile.tmLanguage.json` (built from `.yml`) and `syntaxes/tests/*.snap` (snapshot baselines) are intentionally in version control so downstream consumers and CI don't need to regenerate them. Always commit the regenerated output alongside the source edit.

## Configuration model

User-visible settings live under the `ollamaModelfile.lint.*` namespace in `package.json`'s `contributes.configuration` block. The diagnostics provider reads them via `vscode.workspace.getConfiguration('ollamaModelfile.lint')` and passes them into `validate()` as the `LintContext`. To add a new user setting:

1. Declare the property in `package.json` under `contributes.configuration.properties`.
2. Extend `LintContext` in `src/linter/rules.ts`.
3. Read it from the workspace config in `src/providers/diagnostics.ts` and thread it through to `validate()`.
4. Reference any new rule-specific setting in `docs/rules.md`.
