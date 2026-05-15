import {
  INSTRUCTION_SET,
  MESSAGE_ROLES,
  PARAMETER_BY_NAME,
  SEMVER_RE,
  TEMPLATE_VARIABLE_SET,
  type ParameterSpec
} from './spec';
import type { Line, ParsedFile } from './parser';

export type RuleId =
  | 'OM001'
  | 'OM002'
  | 'OM003'
  | 'OM004'
  | 'OM005'
  | 'OM006'
  | 'OM007'
  | 'OM008'
  | 'OM009'
  | 'OM010'
  | 'OM011'
  | 'OM012'
  | 'OM013'
  | 'OM014'
  | 'OM015'
  | 'OM016'
  | 'OM017'
  | 'OM018';

export type Severity = 'error' | 'warning' | 'info';

export interface LintDiagnostic {
  ruleId: RuleId;
  severity: Severity;
  message: string;
  line: number;
  startCol: number;
  endCol: number;
}

export interface LintContext {
  disabledRules: ReadonlySet<string>;
  warnOnDefaultContextSize: boolean;
}

export interface Rule {
  id: RuleId;
  severity: Severity;
  description: string;
  check(file: ParsedFile, ctx: LintContext): LintDiagnostic[];
}

function lineLength(line: Line): number {
  return line.raw.length;
}

function diag(
  ruleId: RuleId,
  severity: Severity,
  message: string,
  line: number,
  startCol: number,
  endCol: number
): LintDiagnostic {
  return { ruleId, severity, message, line, startCol, endCol };
}

function extractParameterParts(line: Extract<Line, { kind: 'instruction' }>): {
  name: string;
  nameStart: number;
  nameEnd: number;
  value: string;
  valueStart: number;
  valueEnd: number;
} | null {
  const arg = line.argument;
  const m = /^(\S+)(\s+)?(.*)$/.exec(arg);
  if (!m) return null;
  const [, name, gap, value] = m;
  const nameStart = line.argumentStart;
  const nameEnd = nameStart + name.length;
  const valueStart = gap ? nameEnd + gap.length : nameEnd;
  const valueEnd = valueStart + (value?.length ?? 0);
  return { name, nameStart, nameEnd, value: value ?? '', valueStart, valueEnd };
}

function parseTypedValue(value: string, spec: ParameterSpec): { ok: boolean; num?: number } {
  const trimmed = value.trim().replace(/^"|"$/g, '');
  switch (spec.type) {
    case 'int': {
      if (!/^-?\d+$/.test(trimmed)) return { ok: false };
      return { ok: true, num: parseInt(trimmed, 10) };
    }
    case 'float': {
      if (!/^-?(\d+\.?\d*|\.\d+)$/.test(trimmed)) return { ok: false };
      return { ok: true, num: parseFloat(trimmed) };
    }
    case 'bool': {
      return { ok: /^(true|false)$/i.test(trimmed) };
    }
    case 'string':
      return { ok: trimmed.length > 0 };
  }
}

// ---- Rules ----

const OM001: Rule = {
  id: 'OM001',
  severity: 'error',
  description: 'Missing FROM instruction. Every Modelfile must declare a base model.',
  check(file) {
    const hasFrom = file.lines.some((l) => l.kind === 'instruction' && l.instruction === 'FROM');
    if (hasFrom) return [];
    return [
      diag(
        'OM001',
        'error',
        'Missing FROM instruction. Every Modelfile must declare a base model with FROM.',
        0,
        0,
        0
      )
    ];
  }
};

const OM002: Rule = {
  id: 'OM002',
  severity: 'error',
  description: 'FROM must be the first non-comment instruction.',
  check(file) {
    const firstInstruction = file.lines.find((l) => l.kind === 'instruction');
    if (!firstInstruction || firstInstruction.kind !== 'instruction') return [];
    if (firstInstruction.instruction === 'FROM') return [];
    const fromLine = file.lines.find((l) => l.kind === 'instruction' && l.instruction === 'FROM');
    if (!fromLine) return [];
    const target = fromLine.kind === 'instruction' ? fromLine : firstInstruction;
    const [start, end] = target.kind === 'instruction' ? target.keywordRange : [0, 0];
    return [
      diag(
        'OM002',
        'error',
        'FROM must be the first non-comment instruction.',
        target.lineNumber,
        start,
        end
      )
    ];
  }
};

const OM003: Rule = {
  id: 'OM003',
  severity: 'error',
  description: 'Only one FROM instruction is allowed per Modelfile.',
  check(file) {
    const fromLines = file.lines.filter(
      (l): l is Extract<Line, { kind: 'instruction' }> =>
        l.kind === 'instruction' && l.instruction === 'FROM'
    );
    if (fromLines.length <= 1) return [];
    return fromLines
      .slice(1)
      .map((l) =>
        diag(
          'OM003',
          'error',
          'Multiple FROM instructions found. Only one is allowed.',
          l.lineNumber,
          l.keywordRange[0],
          l.keywordRange[1]
        )
      );
  }
};

const OM004: Rule = {
  id: 'OM004',
  severity: 'error',
  description: 'Unknown instruction keyword.',
  check(file) {
    return file.lines
      .filter((l): l is Extract<Line, { kind: 'instruction' }> => l.kind === 'instruction')
      .filter((l) => !INSTRUCTION_SET.has(l.instruction))
      .map((l) =>
        diag(
          'OM004',
          'error',
          `Unknown instruction "${l.instruction}". Valid instructions: ${[...INSTRUCTION_SET].join(', ')}.`,
          l.lineNumber,
          l.keywordRange[0],
          l.keywordRange[1]
        )
      );
  }
};

const OM005: Rule = {
  id: 'OM005',
  severity: 'error',
  description: 'Unknown PARAMETER name.',
  check(file) {
    const out: LintDiagnostic[] = [];
    for (const line of file.lines) {
      if (line.kind !== 'instruction' || line.instruction !== 'PARAMETER') continue;
      const parts = extractParameterParts(line);
      if (!parts) continue;
      if (!PARAMETER_BY_NAME.has(parts.name.toLowerCase())) {
        out.push(
          diag(
            'OM005',
            'error',
            `Unknown parameter "${parts.name}". See https://docs.ollama.com/modelfile for valid names.`,
            line.lineNumber,
            parts.nameStart,
            parts.nameEnd
          )
        );
      }
    }
    return out;
  }
};

const OM006: Rule = {
  id: 'OM006',
  severity: 'error',
  description: 'PARAMETER value does not match the expected type.',
  check(file) {
    const out: LintDiagnostic[] = [];
    for (const line of file.lines) {
      if (line.kind !== 'instruction' || line.instruction !== 'PARAMETER') continue;
      const parts = extractParameterParts(line);
      if (!parts || parts.value.trim() === '') continue;
      const spec = PARAMETER_BY_NAME.get(parts.name.toLowerCase());
      if (!spec) continue;
      const parsed = parseTypedValue(parts.value, spec);
      if (!parsed.ok) {
        out.push(
          diag(
            'OM006',
            'error',
            `Value "${parts.value.trim()}" is not a valid ${spec.type} for parameter "${spec.name}".`,
            line.lineNumber,
            parts.valueStart,
            parts.valueEnd
          )
        );
      }
    }
    return out;
  }
};

const OM007: Rule = {
  id: 'OM007',
  severity: 'warning',
  description: 'PARAMETER value is outside the recommended range.',
  check(file) {
    const out: LintDiagnostic[] = [];
    for (const line of file.lines) {
      if (line.kind !== 'instruction' || line.instruction !== 'PARAMETER') continue;
      const parts = extractParameterParts(line);
      if (!parts) continue;
      const spec = PARAMETER_BY_NAME.get(parts.name.toLowerCase());
      if (!spec || (spec.type !== 'int' && spec.type !== 'float')) continue;
      const parsed = parseTypedValue(parts.value, spec);
      if (!parsed.ok || parsed.num === undefined) continue;
      if (spec.min !== undefined && parsed.num < spec.min) {
        out.push(
          diag(
            'OM007',
            'warning',
            `Parameter "${spec.name}" value ${parsed.num} is below the recommended minimum (${spec.min}).`,
            line.lineNumber,
            parts.valueStart,
            parts.valueEnd
          )
        );
      } else if (spec.max !== undefined && parsed.num > spec.max) {
        out.push(
          diag(
            'OM007',
            'warning',
            `Parameter "${spec.name}" value ${parsed.num} is above the recommended maximum (${spec.max}).`,
            line.lineNumber,
            parts.valueStart,
            parts.valueEnd
          )
        );
      }
    }
    return out;
  }
};

const OM008: Rule = {
  id: 'OM008',
  severity: 'error',
  description: 'Invalid MESSAGE role.',
  check(file) {
    const out: LintDiagnostic[] = [];
    const valid = new Set<string>(MESSAGE_ROLES);
    for (const line of file.lines) {
      if (line.kind !== 'instruction' || line.instruction !== 'MESSAGE') continue;
      const m = /^(\S+)/.exec(line.argument);
      if (!m) continue;
      const role = m[1];
      if (!valid.has(role)) {
        const start = line.argumentStart;
        const end = start + role.length;
        out.push(
          diag(
            'OM008',
            'error',
            `Invalid MESSAGE role "${role}". Must be one of: ${MESSAGE_ROLES.join(', ')}.`,
            line.lineNumber,
            start,
            end
          )
        );
      }
    }
    return out;
  }
};

const OM009: Rule = {
  id: 'OM009',
  severity: 'error',
  description: 'REQUIRES value is not valid semver.',
  check(file) {
    const out: LintDiagnostic[] = [];
    for (const line of file.lines) {
      if (line.kind !== 'instruction' || line.instruction !== 'REQUIRES') continue;
      const raw = line.argument.trim().replace(/^"|"$/g, '');
      if (raw === '') continue;
      if (!SEMVER_RE.test(raw)) {
        out.push(
          diag(
            'OM009',
            'error',
            `REQUIRES value "${raw}" is not valid semver. Expected X.Y.Z (optional v prefix, pre-release, and build metadata).`,
            line.lineNumber,
            line.argumentStart,
            line.argumentStart + raw.length
          )
        );
      }
    }
    return out;
  }
};

const OM010: Rule = {
  id: 'OM010',
  severity: 'warning',
  description: 'Deprecated PARAMETER name.',
  check(file) {
    const out: LintDiagnostic[] = [];
    for (const line of file.lines) {
      if (line.kind !== 'instruction' || line.instruction !== 'PARAMETER') continue;
      const parts = extractParameterParts(line);
      if (!parts) continue;
      const spec = PARAMETER_BY_NAME.get(parts.name.toLowerCase());
      if (spec?.deprecated) {
        out.push(
          diag(
            'OM010',
            'warning',
            `Parameter "${spec.name}" is deprecated and may be removed in a future Ollama release.`,
            line.lineNumber,
            parts.nameStart,
            parts.nameEnd
          )
        );
      }
    }
    return out;
  }
};

const OM011: Rule = {
  id: 'OM011',
  severity: 'warning',
  description: 'Unterminated single double-quote — multi-line content needs triple quotes.',
  check(file) {
    const out: LintDiagnostic[] = [];
    const targets = new Set(['SYSTEM', 'TEMPLATE', 'LICENSE', 'MESSAGE']);
    for (const line of file.lines) {
      if (line.kind !== 'instruction' || !targets.has(line.instruction)) continue;
      const arg = line.argument.trim();
      if (arg === '' || arg.startsWith('"""')) continue;
      const quoteCount = (arg.match(/"/g) ?? []).length;
      if (arg.startsWith('"') && quoteCount === 1) {
        out.push(
          diag(
            'OM011',
            'warning',
            'Unterminated double-quote. For multi-line content use triple quotes """...""" — single quotes truncate at the first newline.',
            line.lineNumber,
            line.argumentStart,
            lineLength(line)
          )
        );
      }
    }
    return out;
  }
};

const OM012: Rule = {
  id: 'OM012',
  severity: 'warning',
  description: 'num_ctx at default 2048 — most modern models support more.',
  check(file, ctx) {
    if (!ctx.warnOnDefaultContextSize) return [];
    const out: LintDiagnostic[] = [];
    for (const line of file.lines) {
      if (line.kind !== 'instruction' || line.instruction !== 'PARAMETER') continue;
      const parts = extractParameterParts(line);
      if (!parts) continue;
      if (parts.name.toLowerCase() !== 'num_ctx') continue;
      const value = parts.value.trim();
      if (value === '2048') {
        out.push(
          diag(
            'OM012',
            'warning',
            'num_ctx 2048 is the legacy default. Most modern models support 8192 or more — explicitly set a larger value if your model supports it.',
            line.lineNumber,
            parts.valueStart,
            parts.valueEnd
          )
        );
      }
    }
    return out;
  }
};

const OM013: Rule = {
  id: 'OM013',
  severity: 'info',
  description: 'DRAFT requires the --experimental flag.',
  check(file) {
    return file.lines
      .filter(
        (l): l is Extract<Line, { kind: 'instruction' }> =>
          l.kind === 'instruction' && l.instruction === 'DRAFT'
      )
      .map((l) =>
        diag(
          'OM013',
          'info',
          'DRAFT instruction requires the `--experimental` flag when invoking `ollama create`.',
          l.lineNumber,
          l.keywordRange[0],
          l.keywordRange[1]
        )
      );
  }
};

const OM014: Rule = {
  id: 'OM014',
  severity: 'warning',
  description: 'ADAPTER should be a .gguf file.',
  check(file) {
    const out: LintDiagnostic[] = [];
    for (const line of file.lines) {
      if (line.kind !== 'instruction' || line.instruction !== 'ADAPTER') continue;
      const raw = line.argument.trim().replace(/^"|"$/g, '');
      if (raw === '') continue;
      if (raw.endsWith('.safetensors') || raw.endsWith('.bin') || raw.endsWith('.pt')) {
        out.push(
          diag(
            'OM014',
            'warning',
            `ADAPTER expects a .gguf file; got "${raw}". Convert .safetensors/.bin/.pt with llama.cpp's converter first.`,
            line.lineNumber,
            line.argumentStart,
            line.argumentStart + raw.length
          )
        );
      }
    }
    return out;
  }
};

const OM015: Rule = {
  id: 'OM015',
  severity: 'warning',
  description: 'More than 6 stop sequences risks early termination.',
  check(file) {
    const stops: Extract<Line, { kind: 'instruction' }>[] = [];
    for (const line of file.lines) {
      if (line.kind !== 'instruction' || line.instruction !== 'PARAMETER') continue;
      if (/^stop\b/i.test(line.argument)) stops.push(line);
    }
    if (stops.length <= 6) return [];
    return stops
      .slice(6)
      .map((l) =>
        diag(
          'OM015',
          'warning',
          `${stops.length} stop sequences defined. Many stops increase the risk of early termination on incidental matches — consider consolidating.`,
          l.lineNumber,
          l.keywordRange[0],
          l.keywordRange[1]
        )
      );
  }
};

const OM016: Rule = {
  id: 'OM016',
  severity: 'error',
  description: 'Unterminated triple-quoted string.',
  check(file) {
    if (!file.unterminatedTripleQuote || file.unterminatedAt < 0) return [];
    const owner = file.lines[file.unterminatedAt];
    if (owner?.kind !== 'instruction') return [];
    return [
      diag(
        'OM016',
        'error',
        'Unterminated triple-quoted string. Expected closing """ before end of file.',
        owner.lineNumber,
        owner.argumentStart,
        lineLength(owner)
      )
    ];
  }
};

const OM017: Rule = {
  id: 'OM017',
  severity: 'warning',
  description: 'Long MESSAGE system content looks like a system prompt.',
  check(file) {
    const out: LintDiagnostic[] = [];
    for (const line of file.lines) {
      if (line.kind !== 'instruction' || line.instruction !== 'MESSAGE') continue;
      const m = /^system\b\s*(.*)$/i.exec(line.argument);
      if (!m) continue;
      const body = m[1].trim().replace(/^"""?|"""?$/g, '');
      if (body.length > 120 && /\byou are\b|\bact as\b|\byou(?:'|’)re\b|\byou must\b/i.test(body)) {
        out.push(
          diag(
            'OM017',
            'warning',
            'Long MESSAGE system content reads like a system prompt. Consider using the SYSTEM instruction so it applies to every conversation, not just one example.',
            line.lineNumber,
            line.argumentStart,
            lineLength(line)
          )
        );
      }
    }
    return out;
  }
};

const OM018: Rule = {
  id: 'OM018',
  severity: 'info',
  description: 'TEMPLATE references an undocumented variable.',
  check(file) {
    const out: LintDiagnostic[] = [];
    const seen = new Set<string>();
    for (const line of file.lines) {
      if (line.kind === 'continuation' || line.kind === 'instruction') {
        const text = line.raw;
        const re = /\{\{[^}]*?\.([A-Za-z_]\w*)/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          const name = m[1];
          if (TEMPLATE_VARIABLE_SET.has(name)) continue;
          const key = `${line.lineNumber}:${m.index}:${name}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const start = m.index + m[0].length - name.length;
          out.push(
            diag(
              'OM018',
              'info',
              `TEMPLATE references ".${name}" which is not in the documented variable set (${[...TEMPLATE_VARIABLE_SET].slice(0, 5).join(', ')}, ...). It may be valid in custom render contexts, but check the documentation.`,
              line.lineNumber,
              start,
              start + name.length
            )
          );
        }
      }
    }
    return out;
  }
};

export const RULES: readonly Rule[] = [
  OM001,
  OM002,
  OM003,
  OM004,
  OM005,
  OM006,
  OM007,
  OM008,
  OM009,
  OM010,
  OM011,
  OM012,
  OM013,
  OM014,
  OM015,
  OM016,
  OM017,
  OM018
];
