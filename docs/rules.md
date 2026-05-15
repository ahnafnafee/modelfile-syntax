# Linter rules

This page documents every rule the `ollama-modelfile` extension's linter implements. Each rule has a stable ID (e.g., `OM001`), a severity, an actionable message, and a fix example.

Disable any rule via the [`ollamaModelfile.lint.disabledRules`](../README.md#configuration) VSCode setting.

---

<a id="om001"></a>

## OM001 — Missing FROM instruction

**Severity:** error

Every Modelfile must declare a base model.

**Bad:**

```modelfile
PARAMETER temperature 0.7
SYSTEM "You are helpful"
```

**Good:**

```modelfile
FROM llama3.2
PARAMETER temperature 0.7
SYSTEM "You are helpful"
```

---

<a id="om002"></a>

## OM002 — FROM must be the first non-comment instruction

**Severity:** error

`FROM` must appear before any other instruction. Comments before `FROM` are fine.

**Bad:**

```modelfile
PARAMETER temperature 0.7
FROM llama3.2
```

**Good:**

```modelfile
# My custom model
FROM llama3.2
PARAMETER temperature 0.7
```

---

<a id="om003"></a>

## OM003 — Multiple FROM instructions

**Severity:** error

Only one `FROM` is allowed. The second and subsequent are flagged.

---

<a id="om004"></a>

## OM004 — Unknown instruction keyword

**Severity:** error

The line starts with something that isn't an Ollama Modelfile instruction. Valid: `FROM`, `PARAMETER`, `TEMPLATE`, `SYSTEM`, `ADAPTER`, `LICENSE`, `MESSAGE`, `REQUIRES`, `RENDERER`, `PARSER`, `DRAFT`.

**Bad:**

```modelfile
FROM llama3
GIBBERISH 42
```

---

<a id="om005"></a>

## OM005 — Unknown PARAMETER name

**Severity:** error

The PARAMETER name isn't in the documented set. The full list is in [the README's PARAMETER catalog](../README.md#parameter-catalog).

**Bad:**

```modelfile
PARAMETER tempurature 0.7   # typo
```

---

<a id="om006"></a>

## OM006 — PARAMETER value type mismatch

**Severity:** error

The PARAMETER value doesn't match the expected type — e.g., a string where an int is required, or a non-`true`/`false` value where a bool is required.

**Bad:**

```modelfile
PARAMETER temperature warm        # float expected
PARAMETER num_ctx 2.5             # int expected
PARAMETER use_mmap maybe          # bool expected
```

---

<a id="om007"></a>

## OM007 — PARAMETER out of recommended range

**Severity:** warning

The PARAMETER value is outside the recommended range. The value will still work, but is probably a mistake.

**Bad:**

```modelfile
PARAMETER top_p 1.5      # top_p is a probability — max 1.0
PARAMETER mirostat 5     # mirostat is 0, 1, or 2
```

---

<a id="om008"></a>

## OM008 — Invalid MESSAGE role

**Severity:** error

MESSAGE role must be exactly one of `system`, `user`, `assistant`.

**Bad:**

```modelfile
MESSAGE robot "What time is it?"
```

**Good:**

```modelfile
MESSAGE user "What time is it?"
```

---

<a id="om009"></a>

## OM009 — REQUIRES value is not valid semver

**Severity:** error

`REQUIRES` value must be valid semver: `MAJOR.MINOR.PATCH`, optionally prefixed with `v`, optionally followed by pre-release / build metadata.

**Bad:**

```modelfile
REQUIRES latest
REQUIRES 0.6
```

**Good:**

```modelfile
REQUIRES 0.6.0
REQUIRES v0.6.0
REQUIRES 0.6.0-beta.1
```

---

<a id="om010"></a>

## OM010 — Deprecated PARAMETER

**Severity:** warning

The parameter still works (for now) but is slated for removal in a future Ollama release. Deprecated set: `penalize_newline`, `low_vram`, `f16_kv`, `logits_all`, `vocab_only`, `use_mlock`, `num_gqa`.

---

<a id="om011"></a>

## OM011 — Unterminated single double-quote (likely truncation)

**Severity:** warning

A single `"..."` body that never closes on the same line. Single-quote strings truncate at the first newline in Ollama's parser — you almost certainly want `"""..."""` for multi-line content.

**Bad:**

```modelfile
SYSTEM "You are helpful.
You always answer concisely.
```

**Good:**

```modelfile
SYSTEM """
You are helpful.
You always answer concisely.
"""
```

---

<a id="om012"></a>

## OM012 — num_ctx at default 2048

**Severity:** warning (configurable — disable via [`ollamaModelfile.lint.warnOnDefaultContextSize`](../README.md#configuration))

Ollama's historical default for `num_ctx` is 2048 tokens — well below what most modern models actually support. Setting it explicitly to 2048 is almost always a mistake; either omit the line (to let Ollama use its own default) or set it to a value your model supports (8192, 16384, 32768, ...).

---

<a id="om013"></a>

## OM013 — DRAFT requires --experimental

**Severity:** info

The `DRAFT` instruction is gated behind Ollama's `--experimental` flag at create time. You'll need:

```bash
ollama create my-model -f Modelfile --experimental
```

---

<a id="om014"></a>

## OM014 — ADAPTER expects .gguf

**Severity:** warning

The `ADAPTER` instruction only accepts `.gguf` adapter files. If yours is `.safetensors`, `.bin`, or `.pt`, convert it first using [llama.cpp's converter](https://github.com/ggerganov/llama.cpp).

---

<a id="om015"></a>

## OM015 — More than 6 stop sequences

**Severity:** warning

Each `stop` is OR'd. Too many fragments increase the risk of early termination on incidental matches (e.g., the model emits `<|end|>` mid-thought because you have `<|end_of_turn|>` as a stop).

---

<a id="om016"></a>

## OM016 — Unterminated triple-quoted string

**Severity:** error

A `"""` opened a string that was never closed before end of file.

**Bad:**

```modelfile
FROM llama3
SYSTEM """
You are helpful.
```

---

<a id="om017"></a>

## OM017 — Long MESSAGE system reads like SYSTEM prompt

**Severity:** warning

A long, instruction-shaped `MESSAGE system "..."` line is probably a misplaced system prompt. The `MESSAGE` instruction adds a single example exchange to the conversation history; for a persistent system prompt that applies to every turn, use the `SYSTEM` instruction.

---

<a id="om018"></a>

## OM018 — TEMPLATE references undocumented variable

**Severity:** info

The TEMPLATE references a variable like `.NotARealVariable` that isn't in the documented set (`.System`, `.Prompt`, `.Messages`, `.Response`, `.Tools`, `.Role`, `.Content`, `.Name`, `.Description`, `.Parameters`, `.Arguments`, `.FunctionName`, `.Function`, `.IsLastMessage`).

The variable might be valid for a custom renderer — check the documentation if you've intentionally referenced something exotic.
