/**
 * Single source of truth for the Modelfile grammar.
 * Cross-validated against:
 *   - github.com/ollama/ollama/parser/parser.go
 *   - github.com/ollama/ollama/api/types.go
 *   - docs.ollama.com/modelfile
 */

export const INSTRUCTIONS = [
  'FROM',
  'PARAMETER',
  'TEMPLATE',
  'SYSTEM',
  'ADAPTER',
  'LICENSE',
  'MESSAGE',
  'REQUIRES',
  'RENDERER',
  'PARSER',
  'DRAFT'
] as const;

export type Instruction = (typeof INSTRUCTIONS)[number];

export const INSTRUCTION_SET = new Set<string>(INSTRUCTIONS);

export const MESSAGE_ROLES = ['system', 'user', 'assistant'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const TEMPLATE_VARIABLES = [
  'System',
  'Prompt',
  'Messages',
  'Response',
  'Tools',
  'Role',
  'Content',
  'Name',
  'Description',
  'Parameters',
  'Arguments',
  'FunctionName',
  'Function',
  'IsLastMessage'
] as const;

export const TEMPLATE_VARIABLE_SET = new Set<string>(TEMPLATE_VARIABLES);

export type ParamType = 'int' | 'float' | 'bool' | 'string';

export interface ParameterSpec {
  name: string;
  type: ParamType;
  default?: string | number | boolean;
  min?: number;
  max?: number;
  multi?: boolean;
  description: string;
  deprecated?: boolean;
}

export const PARAMETERS: ParameterSpec[] = [
  // Runner parameters
  {
    name: 'num_ctx',
    type: 'int',
    default: 2048,
    min: 1,
    description: 'Context window size (tokens).'
  },
  { name: 'num_batch', type: 'int', default: 512, min: 1, description: 'Token batch size.' },
  {
    name: 'num_gpu',
    type: 'int',
    default: -1,
    min: -1,
    description: 'GPUs to use (-1 = auto, 0 = CPU-only, 999 = all available).'
  },
  { name: 'main_gpu', type: 'int', default: 0, min: 0, description: 'Primary GPU index.' },
  {
    name: 'num_thread',
    type: 'int',
    default: 0,
    min: 0,
    description: 'CPU threads (0 = runtime decides).'
  },
  {
    name: 'num_keep',
    type: 'int',
    default: 4,
    min: 0,
    description: 'Tokens to retain in context after truncation.'
  },
  { name: 'use_mmap', type: 'bool', description: 'Use memory-mapped I/O for model weights.' },
  // Sampling parameters
  {
    name: 'num_predict',
    type: 'int',
    default: -1,
    min: -2,
    description: 'Max tokens to generate (-1 = unlimited, -2 = fill context).'
  },
  {
    name: 'seed',
    type: 'int',
    default: 0,
    description: 'Random seed for reproducibility (-1 = random).'
  },
  {
    name: 'temperature',
    type: 'float',
    default: 0.8,
    min: 0,
    description: 'Sampling temperature. Higher = more creative.'
  },
  {
    name: 'top_k',
    type: 'int',
    default: 40,
    min: 0,
    description: 'Top-K sampling (0 = disabled).'
  },
  {
    name: 'top_p',
    type: 'float',
    default: 0.9,
    min: 0,
    max: 1,
    description: 'Nucleus sampling cumulative probability threshold.'
  },
  {
    name: 'min_p',
    type: 'float',
    default: 0.0,
    min: 0,
    max: 1,
    description: 'Minimum token probability relative to most-likely token.'
  },
  {
    name: 'typical_p',
    type: 'float',
    default: 1.0,
    min: 0,
    max: 1,
    description: 'Typical-weighted sampling threshold.'
  },
  {
    name: 'tfs_z',
    type: 'float',
    default: 1.0,
    min: 1,
    description: 'Tail-free sampling cutoff (1.0 = disabled).'
  },
  // Repetition penalties
  {
    name: 'repeat_last_n',
    type: 'int',
    default: 64,
    min: -1,
    description: 'Look-back window for repeat penalty (-1 = num_ctx).'
  },
  {
    name: 'repeat_penalty',
    type: 'float',
    default: 1.1,
    min: 0,
    description: 'Repetition penalty strength.'
  },
  {
    name: 'presence_penalty',
    type: 'float',
    default: 0.0,
    description: 'Presence penalty (positive = discourage repetition).'
  },
  {
    name: 'frequency_penalty',
    type: 'float',
    default: 0.0,
    description: 'Frequency penalty (scaled by token count).'
  },
  // Mirostat
  {
    name: 'mirostat',
    type: 'int',
    default: 0,
    min: 0,
    max: 2,
    description: 'Mirostat sampling: 0 = disabled, 1 = v1, 2 = v2.'
  },
  {
    name: 'mirostat_eta',
    type: 'float',
    default: 0.1,
    min: 0,
    description: 'Mirostat learning rate.'
  },
  {
    name: 'mirostat_tau',
    type: 'float',
    default: 5.0,
    min: 0,
    description: 'Mirostat target entropy.'
  },
  // Stop (multi-value)
  {
    name: 'stop',
    type: 'string',
    multi: true,
    description: 'Stop sequence. Repeat the PARAMETER line for multiple.'
  },
  // Deprecated
  {
    name: 'penalize_newline',
    type: 'bool',
    deprecated: true,
    description: 'Penalize newline tokens. (deprecated)'
  },
  { name: 'low_vram', type: 'bool', deprecated: true, description: 'Low-VRAM mode. (deprecated)' },
  { name: 'f16_kv', type: 'bool', deprecated: true, description: 'FP16 KV cache. (deprecated)' },
  {
    name: 'logits_all',
    type: 'bool',
    deprecated: true,
    description: 'Return all logits. (deprecated)'
  },
  {
    name: 'vocab_only',
    type: 'bool',
    deprecated: true,
    description: 'Load only the vocab. (deprecated)'
  },
  {
    name: 'use_mlock',
    type: 'bool',
    deprecated: true,
    description: 'Lock memory pages. (deprecated)'
  },
  {
    name: 'num_gqa',
    type: 'int',
    deprecated: true,
    description: 'Group-query attention heads. (deprecated)'
  }
];

export const PARAMETER_BY_NAME: ReadonlyMap<string, ParameterSpec> = new Map(
  PARAMETERS.map((p) => [p.name.toLowerCase(), p])
);

/** Semver regex matching Ollama's REQUIRES check (golang.org/x/mod/semver). */
export const SEMVER_RE = /^v?\d+\.\d+\.\d+(?:-[A-Za-z0-9.]+)?(?:\+[A-Za-z0-9.]+)?$/;
