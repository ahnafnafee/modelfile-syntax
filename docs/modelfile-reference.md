# Ollama Modelfile reference

This is the canonical, machine-readable reference codified inside the extension's linter. It is cross-validated against:

- [`github.com/ollama/ollama/parser/parser.go`](https://github.com/ollama/ollama/blob/main/parser/parser.go) — the canonical Go parser.
- [`github.com/ollama/ollama/api/types.go`](https://github.com/ollama/ollama/blob/main/api/types.go) — parameter type definitions.
- [docs.ollama.com/modelfile](https://docs.ollama.com/modelfile) — the official user-facing docs.
- [ollama.readthedocs.io](https://ollama.readthedocs.io/en/modelfile/) — community-mirrored docs.

For the reader-friendly version with examples and explanations, see the [README](../README.md). This page is the dense-fact reference.

---

## Instructions (11 total)

| Instruction | Required | Repeatable | Multi-line  | Notes                                                                                                                  |
| ----------- | -------- | ---------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| `FROM`      | yes      | no         | no          | First non-comment line. Argument may be a model name, tag, registry path, GGUF file, safetensors dir, or HF reference. |
| `PARAMETER` | no       | yes        | no          | Format: `PARAMETER <name> <value>`.                                                                                    |
| `TEMPLATE`  | no       | no         | yes (`"""`) | Go template syntax.                                                                                                    |
| `SYSTEM`    | no       | no         | yes (`"""`) | System message override.                                                                                               |
| `ADAPTER`   | no       | no         | no          | LoRA/QLoRA adapter file path (`.gguf` required).                                                                       |
| `LICENSE`   | no       | yes        | yes (`"""`) | Stored as array if repeated.                                                                                           |
| `MESSAGE`   | no       | yes        | yes (`"""`) | Format: `MESSAGE <role> <content>`.                                                                                    |
| `REQUIRES`  | no       | no         | no          | Minimum Ollama version (semver).                                                                                       |
| `RENDERER`  | no       | no         | no          | Custom prompt renderer (advanced).                                                                                     |
| `PARSER`    | no       | no         | no          | Custom output parser (advanced).                                                                                       |
| `DRAFT`     | no       | no         | no          | Draft model for speculative decoding. **Experimental** — requires `--experimental` flag.                               |

Keywords are **case-insensitive** in the parser (`from`, `From`, `FROM` are all equivalent).

---

## PARAMETER catalog

### Active

| Name                | Type   | Default | Range                 |
| ------------------- | ------ | ------- | --------------------- |
| `num_ctx`           | int    | 2048    | ≥ 1                   |
| `num_batch`         | int    | 512     | ≥ 1                   |
| `num_gpu`           | int    | -1      | ≥ -1                  |
| `main_gpu`          | int    | 0       | ≥ 0                   |
| `num_thread`        | int    | 0       | ≥ 0                   |
| `num_keep`          | int    | 4       | ≥ 0                   |
| `use_mmap`          | bool   | —       | true / false          |
| `num_predict`       | int    | -1      | ≥ -2                  |
| `seed`              | int    | 0       | any int               |
| `temperature`       | float  | 0.8     | ≥ 0                   |
| `top_k`             | int    | 40      | ≥ 0                   |
| `top_p`             | float  | 0.9     | 0 – 1                 |
| `min_p`             | float  | 0.0     | 0 – 1                 |
| `typical_p`         | float  | 1.0     | 0 – 1                 |
| `tfs_z`             | float  | 1.0     | ≥ 1                   |
| `repeat_last_n`     | int    | 64      | ≥ -1                  |
| `repeat_penalty`    | float  | 1.1     | ≥ 0                   |
| `presence_penalty`  | float  | 0.0     | any                   |
| `frequency_penalty` | float  | 0.0     | any                   |
| `mirostat`          | int    | 0       | 0 / 1 / 2             |
| `mirostat_eta`      | float  | 0.1     | ≥ 0                   |
| `mirostat_tau`      | float  | 5.0     | ≥ 0                   |
| `stop`              | string | —       | (repeat for multiple) |

### Deprecated (linter warns via `OM010`)

`penalize_newline`, `low_vram`, `f16_kv`, `logits_all`, `vocab_only`, `use_mlock`, `num_gqa`.

---

## MESSAGE roles

Exactly three: `system`, `user`, `assistant`. Case-sensitive in the parser's validation step.

---

## TEMPLATE variables

Available inside `{{ ... }}`:

| Variable                                                                                             | Notes                                                             |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `.System`                                                                                            | The system message string.                                        |
| `.Prompt`                                                                                            | The current user prompt.                                          |
| `.Messages`                                                                                          | Array of conversation messages, each with `.Role` and `.Content`. |
| `.Response`                                                                                          | The model's response (omitted during generation).                 |
| `.Tools`                                                                                             | Tool definitions for tool-calling models.                         |
| `.Role`                                                                                              | Inside `range .Messages` — the role of the current message.       |
| `.Content`                                                                                           | Inside `range .Messages` — the content of the current message.    |
| `.Name`, `.Description`, `.Parameters`, `.Arguments`, `.FunctionName`, `.Function`, `.IsLastMessage` | Less common; used by specific renderers.                          |

Standard Go template control flow is supported: `{{ if }}`, `{{ else }}`, `{{ end }}`, `{{ range }}`, `{{ with }}`, `{{ define }}`, `{{ block }}`, `{{ template }}`. Trim markers `{{-` and `-}}` are honored.

---

## String quoting

- **Triple double-quoted** `"""..."""` — preserves newlines and internal `"` characters. Use for multi-line bodies.
- **Single double-quoted** `"..."` — single-line only. **Anything after a literal newline is dropped.** This is the most common Modelfile foot-gun (linter rule `OM011`).
- **Unquoted** — allowed for single-token values (e.g., `PARAMETER temperature 0.7`). Preserves spaces literally per the Ollama parser.

---

## Comments

`#` at the start of a line (with optional leading whitespace). **Inline comments are not supported** — `#` in the middle of a value is a literal character.

```modelfile
# This is a comment
   # This is also a comment (indented)
PARAMETER stop "###User:"   # This `#` is part of the stop value, not a comment.
```

---

## FROM argument forms

| Form                     | Example                                         |
| ------------------------ | ----------------------------------------------- |
| Bare model name          | `FROM llama3.2`                                 |
| Tagged                   | `FROM llama3.2:8b`                              |
| Tagged with quantization | `FROM llama3.2:7b-instruct-q4_K_M`              |
| Registry path            | `FROM registry.ollama.ai/library/llama3:latest` |
| HuggingFace              | `FROM hf.co/Qwen/Qwen2.5-7B-Instruct-GGUF`      |
| Relative GGUF            | `FROM ./model.gguf`                             |
| Absolute path            | `FROM /opt/models/llama.gguf`                   |
| Home-relative            | `FROM ~/models/llama.gguf`                      |
| Safetensors directory    | `FROM ./model-dir/`                             |
| Quoted                   | `FROM "llama3.2:8b"`                            |

---

## Sources of truth

- Parser state machine — [`parser/parser.go`](https://github.com/ollama/ollama/blob/main/parser/parser.go).
- Parameter type catalog — [`api/types.go`](https://github.com/ollama/ollama/blob/main/api/types.go).
- The deprecated-parameter list — `deprecatedParameters` slice in `parser/parser.go`.
- Semver validation — [`golang.org/x/mod/semver`](https://pkg.go.dev/golang.org/x/mod/semver) via `parser.go`.

If you find a discrepancy between this reference and Ollama's actual behavior, open an [issue](https://github.com/ahnafnafee/ollama-modelfile/issues) — keeping this reference in sync with the upstream parser is one of the maintenance goals of the project.
