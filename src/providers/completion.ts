import * as vscode from 'vscode';
import {
  INSTRUCTIONS,
  MESSAGE_ROLES,
  PARAMETERS,
  TEMPLATE_VARIABLES,
  PARAMETER_BY_NAME
} from '../linter/spec';

const LANGUAGE_SELECTOR: vscode.DocumentSelector = { language: 'modelfile' };

export function registerCompletion(): vscode.Disposable {
  const instructionProvider = vscode.languages.registerCompletionItemProvider(LANGUAGE_SELECTOR, {
    provideCompletionItems(document, position) {
      const lineText = document.lineAt(position.line).text.slice(0, position.character);
      // Only suggest instructions at the start of a line (with optional indent).
      if (!/^\s*[A-Za-z]*$/.test(lineText)) return undefined;
      return INSTRUCTIONS.map((kw) => {
        const item = new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword);
        item.detail = 'Ollama Modelfile instruction';
        item.documentation = new vscode.MarkdownString(instructionDoc(kw));
        item.sortText = `0_${kw}`;
        return item;
      });
    }
  });

  const parameterProvider = vscode.languages.registerCompletionItemProvider(
    LANGUAGE_SELECTOR,
    {
      provideCompletionItems(document, position) {
        const lineText = document.lineAt(position.line).text.slice(0, position.character);
        const m = /^\s*PARAMETER\s+([A-Za-z_]\w*)?$/i.exec(lineText);
        if (!m) return undefined;
        return PARAMETERS.map((spec) => {
          const item = new vscode.CompletionItem(spec.name, vscode.CompletionItemKind.Property);
          item.detail = `${spec.type}${spec.default !== undefined ? `, default ${spec.default}` : ''}${spec.deprecated ? ' · deprecated' : ''}`;
          item.documentation = new vscode.MarkdownString(spec.description);
          item.sortText = spec.deprecated ? `9_${spec.name}` : `1_${spec.name}`;
          if (spec.deprecated) {
            item.tags = [vscode.CompletionItemTag.Deprecated];
          }
          return item;
        });
      }
    },
    ' '
  );

  const roleProvider = vscode.languages.registerCompletionItemProvider(
    LANGUAGE_SELECTOR,
    {
      provideCompletionItems(document, position) {
        const lineText = document.lineAt(position.line).text.slice(0, position.character);
        const m = /^\s*MESSAGE\s+([A-Za-z_]\w*)?$/i.exec(lineText);
        if (!m) return undefined;
        return MESSAGE_ROLES.map((role) => {
          const item = new vscode.CompletionItem(role, vscode.CompletionItemKind.EnumMember);
          item.detail = 'MESSAGE role';
          item.sortText = `2_${role}`;
          return item;
        });
      }
    },
    ' '
  );

  const templateVarProvider = vscode.languages.registerCompletionItemProvider(
    LANGUAGE_SELECTOR,
    {
      provideCompletionItems(document, position) {
        const lineText = document.lineAt(position.line).text.slice(0, position.character);
        // Trigger inside Go template expressions: matches "{{ ." or "{{- ." optionally followed by a partial name.
        if (!/\{\{-?\s*\.[A-Za-z_]\w*$|\{\{-?\s*\.$/.test(lineText)) return undefined;
        return TEMPLATE_VARIABLES.map((name) => {
          const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Variable);
          item.detail = 'Modelfile TEMPLATE variable';
          item.sortText = `3_${name}`;
          return item;
        });
      }
    },
    '.'
  );

  const valueHintProvider = vscode.languages.registerCompletionItemProvider(
    LANGUAGE_SELECTOR,
    {
      provideCompletionItems(document, position) {
        const lineText = document.lineAt(position.line).text.slice(0, position.character);
        const m = /^\s*PARAMETER\s+([A-Za-z_]\w*)\s+$/i.exec(lineText);
        if (!m) return undefined;
        const spec = PARAMETER_BY_NAME.get(m[1].toLowerCase());
        if (!spec) return undefined;
        const items: vscode.CompletionItem[] = [];
        if (spec.type === 'bool') {
          for (const v of ['true', 'false']) {
            const item = new vscode.CompletionItem(v, vscode.CompletionItemKind.Value);
            item.detail = 'boolean value';
            items.push(item);
          }
        } else if (spec.default !== undefined) {
          const item = new vscode.CompletionItem(
            String(spec.default),
            vscode.CompletionItemKind.Value
          );
          item.detail = `default value for ${spec.name}`;
          item.documentation = new vscode.MarkdownString(spec.description);
          items.push(item);
        }
        return items;
      }
    },
    ' '
  );

  return vscode.Disposable.from(
    instructionProvider,
    parameterProvider,
    roleProvider,
    templateVarProvider,
    valueHintProvider
  );
}

function instructionDoc(kw: string): string {
  const docs: Record<string, string> = {
    FROM: 'Declares the base model (model name, tag, GGUF path, or HF reference).',
    PARAMETER: 'Sets a runtime parameter.',
    TEMPLATE: 'Defines the full prompt template (Go template syntax).',
    SYSTEM: 'Sets the system message.',
    ADAPTER: 'Applies a LoRA/QLoRA adapter (must be `.gguf`).',
    LICENSE: 'Declares the model license.',
    MESSAGE: 'Pre-loads a conversation message.',
    REQUIRES: 'Minimum Ollama version (semver).',
    RENDERER: 'Custom prompt renderer.',
    PARSER: 'Custom output parser.',
    DRAFT: 'Draft model for speculative decoding (experimental).'
  };
  return docs[kw] ?? '';
}
