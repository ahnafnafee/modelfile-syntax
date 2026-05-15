/**
 * Line-oriented tokenizer for Modelfiles. Mirrors the state machine of
 * github.com/ollama/ollama/parser/parser.go: comments are `#` only at the start
 * of a line (optionally indented); triple-quoted bodies span multiple lines.
 */

export type Line =
  | { kind: 'blank'; lineNumber: number; raw: string }
  | { kind: 'comment'; lineNumber: number; raw: string }
  | {
      kind: 'instruction';
      lineNumber: number;
      raw: string;
      indent: number;
      instruction: string;
      keywordRange: [number, number];
      argument: string;
      argumentStart: number;
      multiline: boolean;
    }
  | {
      kind: 'continuation';
      lineNumber: number;
      raw: string;
      closesTripleQuote: boolean;
      ownerInstructionLine: number;
    };

export interface ParsedFile {
  lines: Line[];
  unterminatedTripleQuote: boolean;
  unterminatedAt: number;
}

const INSTRUCTION_RE = /^(\s*)([A-Za-z][A-Za-z0-9_]*)\s*(.*)$/;

export function parse(text: string): ParsedFile {
  const raws = text.split(/\r?\n/);
  const out: Line[] = [];
  let inTripleQuote = false;
  let tripleQuoteOwner = -1;
  let tripleQuoteStartLine = -1;

  for (let i = 0; i < raws.length; i++) {
    const raw = raws[i];

    if (inTripleQuote) {
      const tripleCount = countOccurrences(raw, '"""');
      const closes = tripleCount % 2 === 1;
      out.push({
        kind: 'continuation',
        lineNumber: i,
        raw,
        closesTripleQuote: closes,
        ownerInstructionLine: tripleQuoteOwner
      });
      if (closes) {
        inTripleQuote = false;
        tripleQuoteOwner = -1;
      }
      continue;
    }

    const trimmed = raw.trimStart();
    if (trimmed === '') {
      out.push({ kind: 'blank', lineNumber: i, raw });
      continue;
    }
    if (trimmed.startsWith('#')) {
      out.push({ kind: 'comment', lineNumber: i, raw });
      continue;
    }

    const m = INSTRUCTION_RE.exec(raw);
    if (!m) {
      out.push({ kind: 'blank', lineNumber: i, raw });
      continue;
    }

    const [, indentStr, keyword, argument] = m;
    const indent = indentStr.length;
    const keywordStart = indent;
    const keywordEnd = indent + keyword.length;
    const afterKeyword = raw.slice(keywordEnd);
    const argOffsetInAfter = afterKeyword.search(/\S/);
    const argumentStart = argOffsetInAfter === -1 ? keywordEnd : keywordEnd + argOffsetInAfter;

    const tripleCount = countOccurrences(argument, '"""');
    const multiline = tripleCount % 2 === 1;
    if (multiline) {
      inTripleQuote = true;
      tripleQuoteOwner = i;
      tripleQuoteStartLine = i;
    }

    out.push({
      kind: 'instruction',
      lineNumber: i,
      raw,
      indent,
      instruction: keyword.toUpperCase(),
      keywordRange: [keywordStart, keywordEnd],
      argument: argument.trimEnd(),
      argumentStart,
      multiline
    });
  }

  return {
    lines: out,
    unterminatedTripleQuote: inTripleQuote,
    unterminatedAt: inTripleQuote ? tripleQuoteStartLine : -1
  };
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

/**
 * Helper: collect the full text of a multi-line body for an instruction at lineNumber.
 * Returns the concatenated body (without surrounding triple-quotes) for TEMPLATE / SYSTEM /
 * LICENSE / MESSAGE bodies. Returns the single-line argument otherwise.
 */
export function getInstructionBody(file: ParsedFile, instructionLine: number): string {
  const line = file.lines[instructionLine];
  if (!line || line.kind !== 'instruction') return '';
  if (!line.multiline) {
    return stripQuotes(line.argument);
  }
  const parts: string[] = [stripLeadingTripleOpen(line.argument)];
  for (let i = instructionLine + 1; i < file.lines.length; i++) {
    const cont = file.lines[i];
    if (cont.kind !== 'continuation' || cont.ownerInstructionLine !== instructionLine) break;
    if (cont.closesTripleQuote) {
      parts.push(stripTrailingTripleClose(cont.raw));
      break;
    }
    parts.push(cont.raw);
  }
  return parts.join('\n');
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if (t.startsWith('"""') && t.endsWith('"""') && t.length >= 6) return t.slice(3, -3);
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) return t.slice(1, -1);
  return t;
}

function stripLeadingTripleOpen(s: string): string {
  const idx = s.indexOf('"""');
  return idx === -1 ? s : s.slice(idx + 3);
}

function stripTrailingTripleClose(s: string): string {
  const idx = s.lastIndexOf('"""');
  return idx === -1 ? s : s.slice(0, idx);
}
