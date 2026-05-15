# Changelog

All notable changes to **ollama-modelfile** are documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0]

### Added

- TextMate grammar covering all 11 Ollama Modelfile instructions (`FROM`, `PARAMETER`, `TEMPLATE`, `SYSTEM`, `ADAPTER`, `LICENSE`, `MESSAGE`, `REQUIRES`, `RENDERER`, `PARSER`, `DRAFT`).
- Triple-quoted `"""..."""` and double-quoted `"..."` string scopes.
- Embedded Go template highlighting inside `TEMPLATE` bodies: keywords (`if`, `range`, `end`), variables (`.System`, `.Prompt`, `.Messages`, `.Response`, `.Tools`, `.Role`, `.Content`), and pipes.
- Distinct scopes for valid / deprecated / unknown PARAMETER names and valid / invalid MESSAGE roles.
- Real-time linter with 18 diagnostic rules (`OM001`–`OM018`).
- Hover documentation for every instruction keyword and every PARAMETER.
- Autocomplete for instruction keywords, PARAMETER names, MESSAGE roles, Go template variables, and PARAMETER value hints.
- 26+ snippets: chat / coder / RAG starters; Llama 3 / Qwen 2.5 / ChatML / Phi-3 templates; all common PARAMETER patterns.
- File detection for `Modelfile`, `Modelfile.*`, and `*.modelfile`.
- Browser-compatible bundle for vscode.dev / github.dev.
- Settings: `ollamaModelfile.lint.enabled`, `ollamaModelfile.lint.disabledRules`, `ollamaModelfile.lint.warnOnDefaultContextSize`.

[Unreleased]: https://github.com/ahnafnafee/ollama-modelfile/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ahnafnafee/ollama-modelfile/releases/tag/v0.1.0
