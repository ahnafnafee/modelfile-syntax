import { RULES, type LintContext, type LintDiagnostic } from './rules';
import type { ParsedFile } from './parser';

export function validate(file: ParsedFile, ctx: LintContext): LintDiagnostic[] {
  const out: LintDiagnostic[] = [];
  for (const rule of RULES) {
    if (ctx.disabledRules.has(rule.id)) continue;
    try {
      out.push(...rule.check(file, ctx));
    } catch (err) {
      // A bug in a rule must never break the editor. Emit no diagnostic and continue.
      // (Errors surface in `ollama-modelfile` output channel via VSCode's error handling.)
      void err;
    }
  }
  out.sort((a, b) => a.line - b.line || a.startCol - b.startCol);
  return out;
}
