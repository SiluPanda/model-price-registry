import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  parseArgs,
  cmdPrice,
  cmdEstimate,
  cmdList,
  cmdProviders,
  cmdInfo,
  main,
} from '../cli';

// ─── helpers ─────────────────────────────────────────────────────────────────

function capture(fn: (out: (s: string) => void, err: (s: string) => void) => number): {
  stdout: string[];
  stderr: string[];
  code: number;
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code = fn(
    (s) => stdout.push(s),
    (s) => stderr.push(s),
  );
  return { stdout, stderr, code };
}

// ─── parseArgs ───────────────────────────────────────────────────────────────

describe('parseArgs', () => {
  it('parses a simple command with positionals', () => {
    const result = parseArgs(['price', 'openai', 'gpt-4o']);
    expect(result.command).toBe('price');
    expect(result.positionals).toEqual(['openai', 'gpt-4o']);
    expect(result.flags).toEqual({});
  });

  it('parses --format flag with a value', () => {
    const result = parseArgs(['list', '--format', 'json']);
    expect(result.command).toBe('list');
    expect(result.flags['format']).toBe('json');
  });

  it('parses --provider flag', () => {
    const result = parseArgs(['list', '--provider', 'anthropic']);
    expect(result.flags['provider']).toBe('anthropic');
  });

  it('parses short flags like -h as boolean true', () => {
    const result = parseArgs(['-h']);
    expect(result.flags['h']).toBe(true);
  });

  it('parses --help as boolean true', () => {
    const result = parseArgs(['--help']);
    expect(result.flags['help']).toBe(true);
  });

  it('parses --input and --output as string values', () => {
    const result = parseArgs(['estimate', 'openai', 'gpt-4o', '--input', '1000', '--output', '500']);
    expect(result.flags['input']).toBe('1000');
    expect(result.flags['output']).toBe('500');
  });

  it('handles no arguments', () => {
    const result = parseArgs([]);
    expect(result.command).toBeUndefined();
    expect(result.positionals).toEqual([]);
    expect(result.flags).toEqual({});
  });

  it('parses --sort flag', () => {
    const result = parseArgs(['list', '--sort', 'cost']);
    expect(result.flags['sort']).toBe('cost');
  });
});

// ─── cmdPrice ────────────────────────────────────────────────────────────────

describe('cmdPrice', () => {
  it('returns exit code 0 for a known model (human format)', () => {
    const { stdout, stderr, code } = capture((out, err) =>
      cmdPrice('openai', 'gpt-4o', 'human', out, err),
    );
    expect(code).toBe(0);
    expect(stderr).toHaveLength(0);
    expect(stdout.some((line) => line.includes('gpt-4o'))).toBe(true);
    expect(stdout.some((line) => line.includes('2.50'))).toBe(true);
    expect(stdout.some((line) => line.includes('10.00'))).toBe(true);
  });

  it('human output contains Input/1M and Output/1M labels', () => {
    const { stdout } = capture((out, err) =>
      cmdPrice('openai', 'gpt-4o', 'human', out, err),
    );
    expect(stdout.some((line) => line.includes('Input/1M'))).toBe(true);
    expect(stdout.some((line) => line.includes('Output/1M'))).toBe(true);
  });

  it('human output shows cached price when model has it', () => {
    const { stdout } = capture((out, err) =>
      cmdPrice('openai', 'gpt-4o', 'human', out, err),
    );
    expect(stdout.some((line) => line.includes('Cached/1M'))).toBe(true);
    expect(stdout.some((line) => line.includes('1.25'))).toBe(true);
  });

  it('returns exit code 0 and JSON object for known model (json format)', () => {
    const { stdout, code } = capture((out, err) =>
      cmdPrice('openai', 'gpt-4o', 'json', out, err),
    );
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.join(''));
    expect(parsed.provider).toBe('openai');
    expect(parsed.modelId).toBe('gpt-4o');
    expect(parsed.inputPerMTok).toBe(2.5);
    expect(parsed.outputPerMTok).toBe(10);
  });

  it('returns exit code 1 for unknown model', () => {
    const { stderr, code } = capture((out, err) =>
      cmdPrice('openai', 'gpt-does-not-exist', 'human', out, err),
    );
    expect(code).toBe(1);
    expect(stderr.some((line) => line.includes('not found'))).toBe(true);
  });

  it('returns exit code 1 for unknown provider', () => {
    const { code } = capture((out, err) =>
      cmdPrice('unknown-provider', 'gpt-4o', 'human', out, err),
    );
    expect(code).toBe(1);
  });

  it('resolves alias to canonical model', () => {
    const { stdout, code } = capture((out, err) =>
      cmdPrice('openai', 'gpt-4o-2024-11-20', 'human', out, err),
    );
    expect(code).toBe(0);
    expect(stdout.some((line) => line.includes('gpt-4o'))).toBe(true);
  });
});

// ─── cmdEstimate ─────────────────────────────────────────────────────────────

describe('cmdEstimate', () => {
  it('returns exit code 0 for a known model (human format)', () => {
    const { stdout, stderr, code } = capture((out, err) =>
      cmdEstimate('openai', 'gpt-4o', 1_000_000, 0, 0, 'human', out, err),
    );
    expect(code).toBe(0);
    expect(stderr).toHaveLength(0);
    expect(stdout.some((line) => line.includes('Total cost'))).toBe(true);
  });

  it('human output shows correct total cost for 1M input tokens at gpt-4o rate ($2.50)', () => {
    const { stdout } = capture((out, err) =>
      cmdEstimate('openai', 'gpt-4o', 1_000_000, 0, 0, 'human', out, err),
    );
    const totalLine = stdout.find((line) => line.includes('Total cost'));
    expect(totalLine).toBeDefined();
    expect(totalLine).toContain('$2.5');
  });

  it('shows input and output costs separately in human format', () => {
    const { stdout } = capture((out, err) =>
      cmdEstimate('openai', 'gpt-4o', 100_000, 50_000, 0, 'human', out, err),
    );
    expect(stdout.some((line) => line.includes('Input cost'))).toBe(true);
    expect(stdout.some((line) => line.includes('Output cost'))).toBe(true);
  });

  it('shows cached tokens line when cachedInputTokens > 0', () => {
    const { stdout } = capture((out, err) =>
      cmdEstimate('openai', 'gpt-4o', 0, 0, 500_000, 'human', out, err),
    );
    expect(stdout.some((line) => line.includes('Cached'))).toBe(true);
  });

  it('returns JSON object with correct fields in json format', () => {
    const { stdout, code } = capture((out, err) =>
      cmdEstimate('anthropic', 'claude-sonnet-4-5', 50_000, 10_000, 0, 'json', out, err),
    );
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.join(''));
    expect(parsed.provider).toBe('anthropic');
    expect(parsed.modelId).toBe('claude-sonnet-4-5');
    expect(typeof parsed.inputCost).toBe('number');
    expect(typeof parsed.outputCost).toBe('number');
    expect(typeof parsed.totalCost).toBe('number');
    expect(parsed.currency).toBe('USD');
  });

  it('returns exit code 1 for unknown model', () => {
    const { code } = capture((out, err) =>
      cmdEstimate('openai', 'gpt-does-not-exist', 1000, 500, 0, 'human', out, err),
    );
    expect(code).toBe(1);
  });

  it('returns exit code 1 for unknown provider', () => {
    const { code } = capture((out, err) =>
      cmdEstimate('unknown-provider', 'gpt-4o', 1000, 500, 0, 'human', out, err),
    );
    expect(code).toBe(1);
  });
});

// ─── cmdList ─────────────────────────────────────────────────────────────────

describe('cmdList', () => {
  it('returns exit code 0 and lists all models (human format)', () => {
    const { stdout, code } = capture((out) => cmdList(undefined, 'name', 'human', out));
    expect(code).toBe(0);
    expect(stdout.length).toBeGreaterThan(3); // header + divider + rows + summary
  });

  it('human output has a header row with expected column names', () => {
    const { stdout } = capture((out) => cmdList(undefined, 'name', 'human', out));
    const header = stdout[0];
    expect(header).toContain('Provider');
    expect(header).toContain('Model');
    expect(header).toContain('Input/1M');
    expect(header).toContain('Output/1M');
  });

  it('filters by provider when providerFilter is specified', () => {
    const { stdout } = capture((out) => cmdList('openai', 'name', 'human', out));
    // All data rows (skip header, divider, blank, summary) should contain 'openai'
    const dataRows = stdout.slice(2, -2);
    expect(dataRows.every((r) => r.startsWith('openai'))).toBe(true);
  });

  it('sorts by inputPrice (cost) when sortBy is inputPrice', () => {
    const { stdout, code } = capture((out) => cmdList(undefined, 'inputPrice', 'human', out));
    expect(code).toBe(0);
    // Just verify it ran without error
    expect(stdout.length).toBeGreaterThan(3);
  });

  it('returns JSON array in json format', () => {
    const { stdout, code } = capture((out) => cmdList(undefined, 'name', 'json', out));
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.join(''));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(typeof parsed[0].provider).toBe('string');
    expect(typeof parsed[0].modelId).toBe('string');
  });

  it('json output contains all providers', () => {
    const { stdout } = capture((out) => cmdList(undefined, 'name', 'json', out));
    const models = JSON.parse(stdout.join('')) as Array<{ provider: string }>;
    const providers = new Set(models.map((m) => m.provider));
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
    expect(providers).toContain('google');
  });
});

// ─── cmdProviders ─────────────────────────────────────────────────────────────

describe('cmdProviders', () => {
  it('returns exit code 0 (human format)', () => {
    const { code } = capture((out) => cmdProviders('human', out));
    expect(code).toBe(0);
  });

  it('human output lists all 6 providers', () => {
    const { stdout } = capture((out) => cmdProviders('human', out));
    const allText = stdout.join('\n');
    expect(allText).toContain('openai');
    expect(allText).toContain('anthropic');
    expect(allText).toContain('google');
    expect(allText).toContain('meta');
    expect(allText).toContain('mistral');
    expect(allText).toContain('cohere');
  });

  it('returns JSON array of provider strings in json format', () => {
    const { stdout, code } = capture((out) => cmdProviders('json', out));
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.join(''));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toContain('openai');
    expect(parsed).toContain('anthropic');
    expect(parsed.length).toBe(6);
  });
});

// ─── cmdInfo ─────────────────────────────────────────────────────────────────

describe('cmdInfo', () => {
  it('returns exit code 0 for a known model (human format)', () => {
    const { code, stderr } = capture((out, err) =>
      cmdInfo('openai', 'gpt-4o', 'human', out, err),
    );
    expect(code).toBe(0);
    expect(stderr).toHaveLength(0);
  });

  it('human output includes all key fields', () => {
    const { stdout } = capture((out, err) =>
      cmdInfo('openai', 'gpt-4o', 'human', out, err),
    );
    const text = stdout.join('\n');
    expect(text).toContain('gpt-4o');
    expect(text).toContain('GPT-4o');
    expect(text).toContain('flagship');
    expect(text).toContain('2.50');
    expect(text).toContain('128');
  });

  it('human output includes aliases when they exist', () => {
    const { stdout } = capture((out, err) =>
      cmdInfo('openai', 'gpt-4o', 'human', out, err),
    );
    const text = stdout.join('\n');
    expect(text).toContain('gpt-4o-2024-11-20');
  });

  it('human output includes tiers when model has them', () => {
    const { stdout } = capture((out, err) =>
      cmdInfo('anthropic', 'claude-sonnet-4-5', 'human', out, err),
    );
    const text = stdout.join('\n');
    expect(text).toContain('Pricing tiers');
    expect(text).toContain('200,000');
  });

  it('returns JSON object with all ModelInfo fields in json format', () => {
    const { stdout, code } = capture((out, err) =>
      cmdInfo('openai', 'gpt-4o', 'json', out, err),
    );
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.join(''));
    expect(parsed.provider).toBe('openai');
    expect(parsed.modelId).toBe('gpt-4o');
    expect(parsed.displayName).toBe('GPT-4o');
    expect(parsed.category).toBe('flagship');
    expect(Array.isArray(parsed.aliases)).toBe(true);
    expect(parsed.aliases).toContain('gpt-4o-2024-11-20');
  });

  it('returns exit code 1 for unknown model', () => {
    const { code, stderr } = capture((out, err) =>
      cmdInfo('openai', 'gpt-does-not-exist', 'human', out, err),
    );
    expect(code).toBe(1);
    expect(stderr.some((line) => line.includes('not found'))).toBe(true);
  });

  it('returns exit code 1 for unknown provider', () => {
    const { code } = capture((out, err) =>
      cmdInfo('unknown-provider', 'gpt-4o', 'human', out, err),
    );
    expect(code).toBe(1);
  });

  it('resolves alias to canonical model', () => {
    const { stdout, code } = capture((out, err) =>
      cmdInfo('anthropic', 'claude-sonnet-4-5-20250514', 'human', out, err),
    );
    expect(code).toBe(0);
    expect(stdout.some((line) => line.includes('claude-sonnet-4-5'))).toBe(true);
  });
});

// ─── main() ──────────────────────────────────────────────────────────────────

describe('main', () => {
  it('returns 2 and prints help when no command is given', () => {
    const { stdout, code } = capture((out, err) => main([], out, err));
    expect(code).toBe(2);
    expect(stdout.some((line) => line.includes('Usage'))).toBe(true);
  });

  it('returns 0 and prints help for --help flag', () => {
    const { code } = capture((out, err) => main(['--help'], out, err));
    expect(code).toBe(0);
  });

  it('returns 0 and prints help for -h flag', () => {
    const { code } = capture((out, err) => main(['-h'], out, err));
    expect(code).toBe(0);
  });

  it('returns 2 for unknown command', () => {
    const { code, stderr } = capture((out, err) => main(['foobar'], out, err));
    expect(code).toBe(2);
    expect(stderr.some((line) => line.includes('unknown command'))).toBe(true);
  });

  it('routes price command correctly', () => {
    const { code } = capture((out, err) => main(['price', 'openai', 'gpt-4o'], out, err));
    expect(code).toBe(0);
  });

  it('routes estimate command correctly', () => {
    const { code } = capture((out, err) =>
      main(['estimate', 'openai', 'gpt-4o', '--input', '1000', '--output', '500'], out, err),
    );
    expect(code).toBe(0);
  });

  it('returns 2 for estimate command missing --input', () => {
    const { code, stderr } = capture((out, err) =>
      main(['estimate', 'openai', 'gpt-4o', '--output', '500'], out, err),
    );
    expect(code).toBe(2);
    expect(stderr.some((line) => line.includes('--input'))).toBe(true);
  });

  it('returns 2 for estimate command with non-integer --input', () => {
    const { code } = capture((out, err) =>
      main(['estimate', 'openai', 'gpt-4o', '--input', 'abc', '--output', '500'], out, err),
    );
    expect(code).toBe(2);
  });

  it('routes list command correctly', () => {
    const { code } = capture((out, err) => main(['list'], out, err));
    expect(code).toBe(0);
  });

  it('routes list command with --provider filter', () => {
    const { stdout, code } = capture((out, err) => main(['list', '--provider', 'openai'], out, err));
    expect(code).toBe(0);
    const dataRows = stdout.slice(2, -2);
    expect(dataRows.every((r) => r.startsWith('openai'))).toBe(true);
  });

  it('returns 2 for list command with invalid --sort value', () => {
    const { code } = capture((out, err) => main(['list', '--sort', 'invalid'], out, err));
    expect(code).toBe(2);
  });

  it('routes providers command correctly', () => {
    const { code } = capture((out, err) => main(['providers'], out, err));
    expect(code).toBe(0);
  });

  it('routes info command correctly', () => {
    const { code } = capture((out, err) => main(['info', 'openai', 'gpt-4o'], out, err));
    expect(code).toBe(0);
  });

  it('returns 2 for price command missing provider', () => {
    const { code } = capture((out, err) => main(['price'], out, err));
    expect(code).toBe(2);
  });

  it('returns 2 for info command missing model', () => {
    const { code } = capture((out, err) => main(['info', 'openai'], out, err));
    expect(code).toBe(2);
  });

  it('--format json flag is passed through to commands', () => {
    const { stdout, code } = capture((out, err) =>
      main(['price', 'openai', 'gpt-4o', '--format', 'json'], out, err),
    );
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.join(''));
    expect(parsed.modelId).toBe('gpt-4o');
  });

  describe('MODEL_PRICE_REGISTRY_FORMAT env var', () => {
    beforeEach(() => {
      process.env['MODEL_PRICE_REGISTRY_FORMAT'] = 'json';
    });
    afterEach(() => {
      delete process.env['MODEL_PRICE_REGISTRY_FORMAT'];
    });

    it('uses json format when MODEL_PRICE_REGISTRY_FORMAT=json', () => {
      const { stdout, code } = capture((out, err) =>
        main(['price', 'openai', 'gpt-4o'], out, err),
      );
      expect(code).toBe(0);
      const parsed = JSON.parse(stdout.join(''));
      expect(parsed.modelId).toBe('gpt-4o');
    });
  });
});
