import * as vscode from 'vscode';
import { registerDiagnostics } from './providers/diagnostics';
import { registerHover } from './providers/hover';
import { registerCompletion } from './providers/completion';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(registerDiagnostics(), registerHover(), registerCompletion());
}

export function deactivate(): void {
  // no-op
}
