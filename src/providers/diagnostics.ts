import * as vscode from 'vscode';
import { parse } from '../linter/parser';
import { validate } from '../linter/validator';
import type { LintDiagnostic } from '../linter/rules';

const LANGUAGE_ID = 'modelfile';
const DEBOUNCE_MS = 200;
const DOCS_BASE = 'https://github.com/ahnafnafee/modelfile-syntax/blob/main/docs/rules.md';

const severityMap: Record<LintDiagnostic['severity'], vscode.DiagnosticSeverity> = {
  error: vscode.DiagnosticSeverity.Error,
  warning: vscode.DiagnosticSeverity.Warning,
  info: vscode.DiagnosticSeverity.Information
};

export function registerDiagnostics(): vscode.Disposable {
  const collection = vscode.languages.createDiagnosticCollection('modelfile-syntax');
  const timers = new Map<string, NodeJS.Timeout>();

  const runLint = (document: vscode.TextDocument): void => {
    if (document.languageId !== LANGUAGE_ID) return;
    const config = vscode.workspace.getConfiguration('modelfileSyntax.lint');
    if (!config.get<boolean>('enabled', true)) {
      collection.delete(document.uri);
      return;
    }
    const disabledRules = new Set(config.get<string[]>('disabledRules', []));
    const warnOnDefaultContextSize = config.get<boolean>('warnOnDefaultContextSize', true);

    const parsed = parse(document.getText());
    const linted = validate(parsed, { disabledRules, warnOnDefaultContextSize });

    const diagnostics = linted.map((d) => toVscodeDiagnostic(d, document));
    collection.set(document.uri, diagnostics);
  };

  const scheduleLint = (document: vscode.TextDocument): void => {
    const key = document.uri.toString();
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    const handle = setTimeout(() => {
      timers.delete(key);
      runLint(document);
    }, DEBOUNCE_MS);
    timers.set(key, handle);
  };

  // Lint already-open documents on activation.
  for (const editor of vscode.window.visibleTextEditors) {
    runLint(editor.document);
  }

  const disposables: vscode.Disposable[] = [
    collection,
    vscode.workspace.onDidOpenTextDocument(runLint),
    vscode.workspace.onDidChangeTextDocument((e) => scheduleLint(e.document)),
    vscode.workspace.onDidSaveTextDocument(runLint),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      collection.delete(doc.uri);
      const t = timers.get(doc.uri.toString());
      if (t) {
        clearTimeout(t);
        timers.delete(doc.uri.toString());
      }
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('modelfileSyntax')) return;
      for (const editor of vscode.window.visibleTextEditors) {
        runLint(editor.document);
      }
    })
  ];

  return vscode.Disposable.from(...disposables, {
    dispose: () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    }
  });
}

function toVscodeDiagnostic(d: LintDiagnostic, document: vscode.TextDocument): vscode.Diagnostic {
  const start = clamp(d.line, d.startCol, document);
  const end = clamp(d.line, Math.max(d.endCol, d.startCol + 1), document);
  const range = new vscode.Range(start, end);
  const diag = new vscode.Diagnostic(range, d.message, severityMap[d.severity]);
  diag.source = 'modelfile-syntax';
  diag.code = {
    value: d.ruleId,
    target: vscode.Uri.parse(`${DOCS_BASE}#${d.ruleId.toLowerCase()}`)
  };
  return diag;
}

function clamp(line: number, col: number, document: vscode.TextDocument): vscode.Position {
  const lineCount = document.lineCount;
  const safeLine = Math.max(0, Math.min(line, lineCount - 1));
  const lineLen = document.lineAt(safeLine).text.length;
  const safeCol = Math.max(0, Math.min(col, lineLen));
  return new vscode.Position(safeLine, safeCol);
}
