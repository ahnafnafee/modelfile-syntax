# Contributing

Thanks for your interest in improving **modelfile-syntax**. This document covers the local dev loop, the grammar-snapshot-test workflow, and the linter-rule contribution checklist.

## Quick start

```bash
git clone https://github.com/ahnafnafee/modelfile-syntax
cd modelfile-syntax
npm install
npm run build:grammar   # syntaxes/*.yml -> syntaxes/*.json
npm run build           # bundle src/ -> dist/
npm run typecheck
npm run lint
npm test                # unit tests for the linter
npm run test:grammar    # snapshot tests for the TextMate grammar
```

Open the folder in VSCode and press <kbd>F5</kbd> to launch an Extension Development Host with the extension under test.

## Project layout

```
src/
├── extension.ts              # activate() / deactivate()
├── linter/
│   ├── spec.ts               # single source of truth: INSTRUCTIONS, PARAMETERS, MESSAGE_ROLES
│   ├── parser.ts             # line-by-line tokenizer
│   ├── rules.ts              # OM001..OM018
│   └── validator.ts          # runs all rules, sorts diagnostics
├── providers/
│   ├── diagnostics.ts        # wires the linter to VSCode's diagnostic collection
│   ├── hover.ts              # hover docs from spec.ts
│   └── completion.ts         # autocomplete from spec.ts
└── test/
    └── linter.test.ts        # unit tests for every rule
syntaxes/
├── modelfile.tmLanguage.yml  # human-edited grammar source
├── modelfile.tmLanguage.json # auto-generated, committed
└── tests/                    # *.modelfile fixtures + *.snap snapshots
snippets/modelfile.json
```

## Editing the grammar

1. Edit `syntaxes/modelfile.tmLanguage.yml`.
2. Run `npm run build:grammar` to regenerate `syntaxes/modelfile.tmLanguage.json`.
3. Run `npm run test:grammar` to verify snapshots still match. If your change is intentional and snapshot diffs are expected, regenerate with `npm run test:grammar:update`.
4. Commit **both** the `.yml` source and the regenerated `.json`.

If you're adding coverage for a new construct, add a fixture file to `syntaxes/tests/` and run `npm run test:grammar:update` to generate its baseline `.snap`.

## Adding a linter rule

1. Pick the next free rule ID (e.g., `OM019`).
2. Add the rule type to the `RuleId` union in `src/linter/rules.ts`.
3. Define a `Rule` object with `id`, `severity`, `description`, and a `check(file, ctx): LintDiagnostic[]` function.
4. Append it to the `RULES` array.
5. Add unit tests in `src/test/linter.test.ts` covering at least one positive case (rule fires) and one negative case (rule does not fire).
6. Add a documentation section in `docs/rules.md` with the rule ID as anchor (e.g., `<a id="om019"></a>`).
7. Add a row to the linter-rules table in `README.md`.

The single source of truth for instructions, parameters, roles, and template variables is `src/linter/spec.ts`. Update it if your rule needs to recognize a new symbol.

## Adding a snippet

Edit `snippets/modelfile.json` directly. Follow the existing patterns:

- Use `${1:placeholder}` for tab stops.
- Use `${1|option1,option2,option3|}` for dropdown choices.
- Keep snippet names self-explanatory (the snippet name becomes the prefix description in the completion popup).

## Style

- TypeScript strict mode is enforced; no `any` without justification.
- Prettier and ESLint are both enforced in CI. Run `npm run format` before committing.
- Code comments should describe **why**, not **what** — and should avoid time-anchored references (no "added in PR #X" or dates inside comments).
- Markdown content (README, docs/) is exempt — feel free to date-anchor inside changelog entries and docs.

## CI gates

Every PR runs on Ubuntu / macOS / Windows × Node 22 / 24 (six matrix cells). All of the following must pass:

- `npm run lint`
- `npm run typecheck`
- `npm run build:grammar`
- `npm run test:grammar`
- `npm run build`
- `npm test`
- `npx vsce package` (smoke build)

## Reporting bugs

Use [GitHub Issues](https://github.com/ahnafnafee/modelfile-syntax/issues). For grammar / linter bugs, include the **minimal Modelfile that reproduces** the issue, the editor (VSCode / VSCodium / Cursor / Windsurf / vscode.dev), and the extension version.

## Code of conduct

Be kind. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
