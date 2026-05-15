import * as assert from 'node:assert/strict';
import { parse } from '../linter/parser';
import { validate } from '../linter/validator';
import type { RuleId } from '../linter/rules';

const defaultCtx = {
  disabledRules: new Set<string>(),
  warnOnDefaultContextSize: true
};

function lint(text: string, ctx = defaultCtx): RuleId[] {
  return validate(parse(text), ctx).map((d) => d.ruleId);
}

function lintFull(text: string, ctx = defaultCtx) {
  return validate(parse(text), ctx);
}

describe('parser', () => {
  it('classifies blank, comment, and instruction lines', () => {
    const file = parse('# top\n\nFROM llama3\nPARAMETER temperature 0.5\n');
    assert.equal(file.lines[0].kind, 'comment');
    assert.equal(file.lines[1].kind, 'blank');
    assert.equal(file.lines[2].kind, 'instruction');
    assert.equal(file.lines[3].kind, 'instruction');
  });

  it('detects unterminated triple-quoted string', () => {
    const file = parse('FROM llama3\nSYSTEM """unterminated\nmore text');
    assert.equal(file.unterminatedTripleQuote, true);
    assert.equal(file.unterminatedAt, 1);
  });

  it('handles single-line triple-quoted strings', () => {
    const file = parse('FROM llama3\nSYSTEM """one line"""\n');
    assert.equal(file.unterminatedTripleQuote, false);
  });

  it('uppercases instruction keywords for downstream rules', () => {
    const file = parse('from llama3\n');
    assert.equal(file.lines[0].kind, 'instruction');
    if (file.lines[0].kind === 'instruction') {
      assert.equal(file.lines[0].instruction, 'FROM');
    }
  });
});

describe('OM001 — missing FROM', () => {
  it('flags a Modelfile with no FROM', () => {
    assert.ok(lint('PARAMETER temperature 0.5\n').includes('OM001'));
  });
  it('passes a Modelfile with FROM', () => {
    assert.ok(!lint('FROM llama3\n').includes('OM001'));
  });
});

describe('OM002 — FROM must be first non-comment instruction', () => {
  it('flags when a non-FROM instruction comes first', () => {
    assert.ok(lint('PARAMETER temperature 0.5\nFROM llama3\n').includes('OM002'));
  });
  it('passes when FROM is first', () => {
    assert.ok(!lint('FROM llama3\nPARAMETER temperature 0.5\n').includes('OM002'));
  });
  it('allows comments before FROM', () => {
    assert.ok(!lint('# my model\nFROM llama3\n').includes('OM002'));
  });
});

describe('OM003 — multiple FROM instructions', () => {
  it('flags duplicate FROM', () => {
    const ids = lint('FROM llama3\nFROM mistral\n');
    assert.ok(ids.includes('OM003'));
  });
  it('passes single FROM', () => {
    assert.ok(!lint('FROM llama3\n').includes('OM003'));
  });
});

describe('OM004 — unknown instruction keyword', () => {
  it('flags an unknown keyword', () => {
    assert.ok(lint('FROM llama3\nGIBBERISH foo\n').includes('OM004'));
  });
  it('passes all known instructions', () => {
    const text = `FROM llama3
PARAMETER temperature 0.5
TEMPLATE """{{ .Prompt }}"""
SYSTEM "hello"
ADAPTER ./adapter.gguf
LICENSE "MIT"
MESSAGE user "hi"
REQUIRES 0.6.0
RENDERER ollama
PARSER llama
DRAFT ./draft.gguf
`;
    assert.ok(!lint(text).includes('OM004'));
  });
});

describe('OM005 — unknown PARAMETER name', () => {
  it('flags gibberish parameter name', () => {
    assert.ok(lint('FROM llama3\nPARAMETER bogus 1\n').includes('OM005'));
  });
  it('passes known parameter', () => {
    assert.ok(!lint('FROM llama3\nPARAMETER temperature 0.5\n').includes('OM005'));
  });
});

describe('OM006 — PARAMETER value type mismatch', () => {
  it('flags non-numeric temperature', () => {
    assert.ok(lint('FROM llama3\nPARAMETER temperature foo\n').includes('OM006'));
  });
  it('flags non-integer num_ctx', () => {
    assert.ok(lint('FROM llama3\nPARAMETER num_ctx 2.5\n').includes('OM006'));
  });
  it('flags non-boolean use_mmap', () => {
    assert.ok(lint('FROM llama3\nPARAMETER use_mmap maybe\n').includes('OM006'));
  });
  it('passes valid types', () => {
    const ids = lint(
      'FROM llama3\nPARAMETER temperature 0.7\nPARAMETER num_ctx 8192\nPARAMETER use_mmap true\n'
    );
    assert.ok(!ids.includes('OM006'));
  });
});

describe('OM007 — PARAMETER out of range', () => {
  it('flags top_p > 1', () => {
    assert.ok(lint('FROM llama3\nPARAMETER top_p 1.5\n').includes('OM007'));
  });
  it('flags mirostat > 2', () => {
    assert.ok(lint('FROM llama3\nPARAMETER mirostat 5\n').includes('OM007'));
  });
  it('passes in-range values', () => {
    assert.ok(!lint('FROM llama3\nPARAMETER top_p 0.9\nPARAMETER mirostat 2\n').includes('OM007'));
  });
});

describe('OM008 — invalid MESSAGE role', () => {
  it('flags robot role', () => {
    assert.ok(lint('FROM llama3\nMESSAGE robot "hi"\n').includes('OM008'));
  });
  it('passes valid roles', () => {
    const ids = lint('FROM llama3\nMESSAGE system "x"\nMESSAGE user "y"\nMESSAGE assistant "z"\n');
    assert.ok(!ids.includes('OM008'));
  });
});

describe('OM009 — REQUIRES not valid semver', () => {
  it('flags a non-semver REQUIRES', () => {
    assert.ok(lint('FROM llama3\nREQUIRES latest\n').includes('OM009'));
  });
  it('passes valid semver with optional v prefix', () => {
    const ids = lintFull('FROM llama3\nREQUIRES v0.6.0\n');
    assert.ok(!ids.some((d) => d.ruleId === 'OM009'));
  });
  it('passes 3-segment plain semver', () => {
    const ids = lintFull('FROM llama3\nREQUIRES 0.6.0\n');
    assert.ok(!ids.some((d) => d.ruleId === 'OM009'));
  });
});

describe('OM010 — deprecated PARAMETER', () => {
  it('warns on use_mlock', () => {
    assert.ok(lint('FROM llama3\nPARAMETER use_mlock true\n').includes('OM010'));
  });
  it('warns on f16_kv', () => {
    assert.ok(lint('FROM llama3\nPARAMETER f16_kv true\n').includes('OM010'));
  });
});

describe('OM011 — unterminated double-quote', () => {
  it('flags SYSTEM " (single quote)', () => {
    assert.ok(lint('FROM llama3\nSYSTEM "hello\n').includes('OM011'));
  });
  it('passes SYSTEM """', () => {
    assert.ok(!lint('FROM llama3\nSYSTEM """hello"""\n').includes('OM011'));
  });
});

describe('OM012 — num_ctx at default', () => {
  it('warns when num_ctx is 2048', () => {
    assert.ok(lint('FROM llama3\nPARAMETER num_ctx 2048\n').includes('OM012'));
  });
  it('does not warn when num_ctx is larger', () => {
    assert.ok(!lint('FROM llama3\nPARAMETER num_ctx 8192\n').includes('OM012'));
  });
  it('respects the warnOnDefaultContextSize flag', () => {
    const ids = lint('FROM llama3\nPARAMETER num_ctx 2048\n', {
      disabledRules: new Set(),
      warnOnDefaultContextSize: false
    });
    assert.ok(!ids.includes('OM012'));
  });
});

describe('OM013 — DRAFT requires --experimental', () => {
  it('info-flags DRAFT', () => {
    assert.ok(lint('FROM llama3\nDRAFT ./draft.gguf\n').includes('OM013'));
  });
});

describe('OM014 — ADAPTER expects .gguf', () => {
  it('warns on .safetensors', () => {
    assert.ok(lint('FROM llama3\nADAPTER ./adapter.safetensors\n').includes('OM014'));
  });
  it('passes .gguf', () => {
    assert.ok(!lint('FROM llama3\nADAPTER ./adapter.gguf\n').includes('OM014'));
  });
});

describe('OM015 — too many stop sequences', () => {
  it('warns at 7 stops', () => {
    const text =
      'FROM llama3\n' +
      Array.from({ length: 7 }, (_, i) => `PARAMETER stop "<stop_${i}>"\n`).join('');
    assert.ok(lint(text).includes('OM015'));
  });
  it('passes at 6 stops', () => {
    const text =
      'FROM llama3\n' +
      Array.from({ length: 6 }, (_, i) => `PARAMETER stop "<stop_${i}>"\n`).join('');
    assert.ok(!lint(text).includes('OM015'));
  });
});

describe('OM016 — unterminated triple-quoted string', () => {
  it('flags unterminated SYSTEM body', () => {
    assert.ok(lint('FROM llama3\nSYSTEM """unterminated\nmore content').includes('OM016'));
  });
  it('passes when triple-quote closes', () => {
    assert.ok(!lint('FROM llama3\nSYSTEM """closed"""\n').includes('OM016'));
  });
});

describe('OM017 — long MESSAGE system looks like SYSTEM prompt', () => {
  it('warns when MESSAGE system content reads like a system prompt', () => {
    const text =
      'FROM llama3\nMESSAGE system "You are a helpful assistant. You must follow these rules: never refuse, always be polite, respond in exactly 3 sentences. You are also patient and thorough."\n';
    assert.ok(lint(text).includes('OM017'));
  });
  it('does not warn on short MESSAGE system', () => {
    assert.ok(!lint('FROM llama3\nMESSAGE system "hello"\n').includes('OM017'));
  });
});

describe('OM018 — TEMPLATE undocumented variable', () => {
  it('info-flags unknown template variable', () => {
    assert.ok(lint('FROM llama3\nTEMPLATE "{{ .NotARealVariable }}"\n').includes('OM018'));
  });
  it('passes documented variables', () => {
    assert.ok(!lint('FROM llama3\nTEMPLATE "{{ .System }}{{ .Prompt }}"\n').includes('OM018'));
  });
});

describe('disabling rules', () => {
  it('honors disabledRules', () => {
    const ids = lint('PARAMETER temperature 0.5\n', {
      disabledRules: new Set(['OM001', 'OM002']),
      warnOnDefaultContextSize: true
    });
    assert.ok(!ids.includes('OM001'));
    assert.ok(!ids.includes('OM002'));
  });
});

describe('happy path Modelfile', () => {
  it('produces zero diagnostics for a well-formed file', () => {
    const text = `# A well-formed Modelfile
FROM llama3.2
PARAMETER temperature 0.7
PARAMETER num_ctx 8192
PARAMETER top_p 0.9
PARAMETER stop "<|eot_id|>"
TEMPLATE """{{ if .System }}{{ .System }}{{ end }}{{ .Prompt }}"""
SYSTEM """You are a helpful assistant."""
MESSAGE user "hello"
MESSAGE assistant "hi there"
`;
    const diags = lintFull(text);
    assert.deepEqual(diags, [], `expected no diagnostics, got: ${JSON.stringify(diags, null, 2)}`);
  });
});
