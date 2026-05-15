import * as vscode from 'vscode';
import { INSTRUCTION_SET, MESSAGE_ROLES, PARAMETER_BY_NAME } from '../linter/spec';

const LANGUAGE_SELECTOR: vscode.DocumentSelector = { language: 'modelfile' };

const INSTRUCTION_DOCS: Record<string, string> = {
  FROM: 'Required. Declares the base model. Accepts a model name (`llama3.2`), tag (`llama3.2:8b`), local GGUF path (`./model.gguf`), or HuggingFace reference. Must be the first non-comment instruction.',
  PARAMETER:
    'Sets a runtime or runner parameter. Format: `PARAMETER <name> <value>`. The `stop` parameter may be repeated for multiple stop sequences.',
  TEMPLATE:
    'Defines the full prompt template using Go template syntax. Available variables: `.System`, `.Prompt`, `.Messages`, `.Tools`, `.Response`. Use triple quotes `"""..."""` for multi-line bodies.',
  SYSTEM: "Sets the default system message. Overrides the base model's system prompt.",
  ADAPTER:
    'Applies a LoRA / QLoRA adapter. Must be a `.gguf` file (convert `.safetensors` with llama.cpp first).',
  LICENSE: "Declares the model's legal license. May be repeated.",
  MESSAGE:
    'Pre-loads a message into the conversation history. Format: `MESSAGE <role> <content>`. Role must be one of: `system`, `user`, `assistant`.',
  REQUIRES:
    'Declares the minimum Ollama version required to run this model. Value must be valid semver (e.g., `0.6.0`).',
  RENDERER: 'Selects a custom prompt renderer. Advanced use.',
  PARSER: 'Selects a custom output parser. Advanced use.',
  DRAFT:
    'Declares a draft / speculative-decoding model. **Experimental** — requires `--experimental` flag when invoking `ollama create`.'
};

export function registerHover(): vscode.Disposable {
  const provider: vscode.HoverProvider = {
    provideHover(document, position) {
      const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
      if (!wordRange) return undefined;
      const word = document.getText(wordRange);
      const upper = word.toUpperCase();
      const lower = word.toLowerCase();

      // Instruction keyword?
      if (INSTRUCTION_SET.has(upper)) {
        const lineText = document.lineAt(position.line).text;
        const beforeWord = lineText.slice(0, wordRange.start.character).trimStart();
        if (beforeWord === '') {
          // The word appears as the first token on the line — it's an instruction.
          return new vscode.Hover(buildInstructionHover(upper), wordRange);
        }
      }

      // PARAMETER name? (only after a PARAMETER keyword)
      const spec = PARAMETER_BY_NAME.get(lower);
      if (spec) {
        const lineText = document.lineAt(position.line).text;
        if (/^\s*PARAMETER\s+\S/i.test(lineText)) {
          return new vscode.Hover(buildParameterHover(spec.name), wordRange);
        }
      }

      // MESSAGE role?
      if ((MESSAGE_ROLES as readonly string[]).includes(lower)) {
        const lineText = document.lineAt(position.line).text;
        if (/^\s*MESSAGE\s+\S/i.test(lineText)) {
          return new vscode.Hover(buildRoleHover(lower), wordRange);
        }
      }

      return undefined;
    }
  };
  return vscode.languages.registerHoverProvider(LANGUAGE_SELECTOR, provider);
}

function buildInstructionHover(keyword: string): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.isTrusted = false;
  md.supportHtml = false;
  md.appendMarkdown(`**\`${keyword}\`** — Ollama Modelfile instruction\n\n`);
  md.appendMarkdown(INSTRUCTION_DOCS[keyword] ?? '');
  md.appendMarkdown('\n\n[Docs](https://docs.ollama.com/modelfile)');
  return md;
}

function buildParameterHover(name: string): vscode.MarkdownString {
  const spec = PARAMETER_BY_NAME.get(name.toLowerCase());
  const md = new vscode.MarkdownString();
  md.supportHtml = false;
  if (!spec) return md;

  const deprecatedTag = spec.deprecated ? ' _(deprecated)_' : '';
  md.appendMarkdown(`**\`${spec.name}\`**${deprecatedTag} — \`${spec.type}\`\n\n`);
  md.appendMarkdown(spec.description + '\n\n');

  const meta: string[] = [];
  if (spec.default !== undefined) meta.push(`**default:** \`${String(spec.default)}\``);
  if (spec.min !== undefined) meta.push(`**min:** \`${spec.min}\``);
  if (spec.max !== undefined) meta.push(`**max:** \`${spec.max}\``);
  if (spec.multi) meta.push('repeat the PARAMETER line for multiple values');
  if (meta.length) md.appendMarkdown(meta.join(' · ') + '\n\n');

  md.appendMarkdown(`[Reference](https://docs.ollama.com/modelfile#parameter)`);
  return md;
}

function buildRoleHover(role: string): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.supportHtml = false;
  const descriptions: Record<string, string> = {
    system:
      'A system-level instruction. Equivalent to using the `SYSTEM` instruction but as a one-off example.',
    user: 'A user message in the example conversation.',
    assistant: 'An example response from the model.'
  };
  md.appendMarkdown(`**\`${role}\`** — MESSAGE role\n\n${descriptions[role] ?? ''}`);
  return md;
}
