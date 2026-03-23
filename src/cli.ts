#!/usr/bin/env node
/**
 * model-price-registry CLI
 *
 * Commands:
 *   price <provider> <model>                           show input/output price per 1M tokens
 *   estimate <provider> <model> --input <n> --output <n>  show cost estimate
 *   list [--provider <name>] [--sort cost|name]        list models in a table
 *   providers                                          list all providers
 *   info <provider> <model>                            show full model info
 *
 * Flags:
 *   --format json|human   (default: human, or MODEL_PRICE_REGISTRY_FORMAT env var)
 *   --help / -h
 *   --version / -v
 *
 * Exit codes:
 *   0 — success
 *   1 — model/provider not found
 *   2 — usage error
 */

import defaultInstance from './registry';
import pkgJson from '../package.json';

// ─── types ───────────────────────────────────────────────────────────────────

export type OutputFormat = 'human' | 'json';

export interface ParsedArgs {
  command: string | undefined;
  positionals: string[];
  flags: Record<string, string | boolean>;
}

// ─── arg parser ──────────────────────────────────────────────────────────────

export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  let command: string | undefined;

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const raw = arg.slice(2);
      const eqIdx = raw.indexOf('=');
      if (eqIdx !== -1) {
        // --key=value syntax
        flags[raw.slice(0, eqIdx)] = raw.slice(eqIdx + 1);
        i += 1;
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('-')) {
          flags[raw] = next;
          i += 2;
        } else {
          flags[raw] = true;
          i += 1;
        }
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      // short flags: -h, -v
      const key = arg.slice(1);
      flags[key] = true;
      i += 1;
    } else {
      if (command === undefined) {
        command = arg;
      } else {
        positionals.push(arg);
      }
      i += 1;
    }
  }

  return { command, positionals, flags };
}

// ─── format helpers ──────────────────────────────────────────────────────────

function resolveFormat(flags: Record<string, string | boolean>): OutputFormat {
  const flagVal = flags['format'];
  if (flagVal === 'json' || flagVal === 'human') return flagVal;
  const envVal = process.env['MODEL_PRICE_REGISTRY_FORMAT'];
  if (envVal === 'json' || envVal === 'human') return envVal;
  return 'human';
}

/**
 * Pad a string to a given width (left-aligned).
 */
function pad(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

function formatUSD(n: number): string {
  // Show up to 6 significant digits, strip trailing zeros after decimal
  return `$${n.toFixed(6).replace(/\.?0+$/, '')}`;
}

// ─── command implementations ─────────────────────────────────────────────────

export function cmdPrice(
  provider: string,
  model: string,
  format: OutputFormat,
  out: (s: string) => void,
  err: (s: string) => void,
): number {
  const entry = defaultInstance.getPrice(provider, model);
  if (!entry) {
    err(`Error: model '${model}' not found for provider '${provider}'`);
    return 1;
  }

  if (format === 'json') {
    out(JSON.stringify({
      provider: entry.provider,
      modelId: entry.modelId,
      displayName: entry.displayName,
      inputPerMTok: entry.inputPerMTok,
      outputPerMTok: entry.outputPerMTok,
      cachedInputPerMTok: entry.cachedInputPerMTok ?? null,
    }, null, 2));
    return 0;
  }

  // human
  out(`Provider  : ${entry.provider}`);
  out(`Model     : ${entry.modelId} (${entry.displayName})`);
  out(`Input/1M  : $${entry.inputPerMTok.toFixed(2)}`);
  out(`Output/1M : $${entry.outputPerMTok.toFixed(2)}`);
  if (entry.cachedInputPerMTok !== undefined) {
    out(`Cached/1M : $${entry.cachedInputPerMTok.toFixed(2)}`);
  }
  if (entry.deprecated) {
    out(`Status    : DEPRECATED${entry.deprecatedDate ? ` (${entry.deprecatedDate})` : ''}${entry.successor ? ` → ${entry.successor}` : ''}`);
  }
  return 0;
}

export function cmdEstimate(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number,
  format: OutputFormat,
  out: (s: string) => void,
  err: (s: string) => void,
): number {
  const result = defaultInstance.estimateCost(provider, model, {
    inputTokens,
    outputTokens,
    cachedInputTokens: cachedInputTokens > 0 ? cachedInputTokens : undefined,
  });

  if (!result) {
    err(`Error: model '${model}' not found for provider '${provider}'`);
    return 1;
  }

  if (format === 'json') {
    out(JSON.stringify(result, null, 2));
    return 0;
  }

  out(`Provider      : ${result.provider}`);
  out(`Model         : ${result.modelId}`);
  out(`Input tokens  : ${result.inputTokens.toLocaleString()}`);
  out(`Output tokens : ${result.outputTokens.toLocaleString()}`);
  if (result.cachedInputTokens > 0) {
    out(`Cached tokens : ${result.cachedInputTokens.toLocaleString()}`);
    out(`Cached cost   : ${formatUSD(result.cachedInputCost)}`);
  }
  out(`Input cost    : ${formatUSD(result.inputCost)}`);
  out(`Output cost   : ${formatUSD(result.outputCost)}`);
  out(`─────────────────────────────`);
  out(`Total cost    : ${formatUSD(result.totalCost)}`);
  return 0;
}

export function cmdList(
  providerFilter: string | undefined,
  sortBy: 'name' | 'inputPrice' | 'outputPrice',
  format: OutputFormat,
  out: (s: string) => void,
): number {
  const models = defaultInstance.listModels({
    provider: providerFilter,
    sortBy: sortBy === 'name' ? 'name' : sortBy,
  });

  if (format === 'json') {
    out(JSON.stringify(models, null, 2));
    return 0;
  }

  if (models.length === 0) {
    out('No models found.');
    return 0;
  }

  // Column widths
  const COL_PROVIDER = 12;
  const COL_MODEL = 30;
  const COL_INPUT = 12;
  const COL_OUTPUT = 12;
  const COL_CTX = 12;
  const COL_CAT = 12;

  const header =
    pad('Provider', COL_PROVIDER) +
    pad('Model', COL_MODEL) +
    pad('Input/1M', COL_INPUT) +
    pad('Output/1M', COL_OUTPUT) +
    pad('Context', COL_CTX) +
    pad('Category', COL_CAT) +
    'Deprecated';

  const divider = '─'.repeat(header.length);

  out(header);
  out(divider);

  for (const m of models) {
    const row =
      pad(m.provider, COL_PROVIDER) +
      pad(m.modelId, COL_MODEL) +
      pad(`$${m.inputPerMTok.toFixed(2)}`, COL_INPUT) +
      pad(`$${m.outputPerMTok.toFixed(2)}`, COL_OUTPUT) +
      pad(m.contextWindow.toLocaleString(), COL_CTX) +
      pad(m.category, COL_CAT) +
      (m.deprecated ? 'yes' : '');
    out(row);
  }

  out('');
  out(`${models.length} model${models.length === 1 ? '' : 's'} listed.`);
  return 0;
}

export function cmdProviders(
  format: OutputFormat,
  out: (s: string) => void,
): number {
  const providers = defaultInstance.listProviders();

  if (format === 'json') {
    out(JSON.stringify(providers, null, 2));
    return 0;
  }

  out('Available providers:');
  for (const p of providers) {
    out(`  ${p}`);
  }
  return 0;
}

export function cmdInfo(
  provider: string,
  model: string,
  format: OutputFormat,
  out: (s: string) => void,
  err: (s: string) => void,
): number {
  const info = defaultInstance.getModelInfo(provider, model);
  if (!info) {
    err(`Error: model '${model}' not found for provider '${provider}'`);
    return 1;
  }

  if (format === 'json') {
    out(JSON.stringify(info, null, 2));
    return 0;
  }

  out(`Provider      : ${info.provider}`);
  out(`Model ID      : ${info.modelId}`);
  out(`Display name  : ${info.displayName}`);
  out(`Category      : ${info.category}`);
  out(`Input/1M      : $${info.inputPerMTok.toFixed(2)}`);
  out(`Output/1M     : $${info.outputPerMTok.toFixed(2)}`);
  if (info.cachedInputPerMTok !== undefined) {
    out(`Cached/1M     : $${info.cachedInputPerMTok.toFixed(2)}`);
  }
  out(`Context window: ${info.contextWindow.toLocaleString()} tokens`);
  if (info.maxOutputTokens !== undefined) {
    out(`Max output    : ${info.maxOutputTokens.toLocaleString()} tokens`);
  }
  out(`Effective date: ${info.effectiveDate}`);
  if (info.launchDate) {
    out(`Launch date   : ${info.launchDate}`);
  }
  out(`Deprecated    : ${info.deprecated ? `yes${info.deprecatedDate ? ` (${info.deprecatedDate})` : ''}` : 'no'}`);
  if (info.successor) {
    out(`Successor     : ${info.successor}`);
  }
  if (info.aliases.length > 0) {
    out(`Aliases       : ${info.aliases.join(', ')}`);
  }
  if (info.tiers && info.tiers.length > 0) {
    out(`Pricing tiers :`);
    for (const tier of info.tiers) {
      out(`  >= ${tier.minInputTokens.toLocaleString()} input tokens → $${tier.inputPerMTok.toFixed(2)}/in, $${tier.outputPerMTok.toFixed(2)}/out`);
    }
  }
  return 0;
}

// ─── help text ───────────────────────────────────────────────────────────────

function printHelp(out: (s: string) => void): void {
  out([
    'model-price-registry — LLM pricing lookup',
    '',
    'Usage:',
    '  model-price-registry price <provider> <model> [--format json|human]',
    '  model-price-registry estimate <provider> <model> --input <n> --output <n> [--cached <n>] [--format json|human]',
    '  model-price-registry list [--provider <name>] [--sort cost|name] [--format json|human]',
    '  model-price-registry providers [--format json|human]',
    '  model-price-registry info <provider> <model> [--format json|human]',
    '',
    'Flags:',
    '  --format json|human   Output format (default: human; overrides MODEL_PRICE_REGISTRY_FORMAT env)',
    '  --help, -h            Show this help',
    '  --version, -v         Show package version',
    '',
    'Exit codes:',
    '  0  success',
    '  1  model or provider not found',
    '  2  usage error',
  ].join('\n'));
}

// ─── main entry point ─────────────────────────────────────────────────────────

export function main(
  argv: string[],
  out: (s: string) => void = (s) => process.stdout.write(s + '\n'),
  err: (s: string) => void = (s) => process.stderr.write(s + '\n'),
): number {
  const { command, positionals, flags } = parseArgs(argv);

  // --version / -v
  if (flags['version'] === true || flags['v'] === true) {
    out(`model-price-registry v${pkgJson.version}`);
    return 0;
  }

  // --help / -h
  if (flags['help'] === true || flags['h'] === true || command === undefined) {
    printHelp(out);
    return command === undefined && !flags['help'] && !flags['h'] ? 2 : 0;
  }

  const format = resolveFormat(flags);

  switch (command) {
    case 'price': {
      const [provider, model] = positionals;
      if (!provider || !model) {
        err('Usage: model-price-registry price <provider> <model>');
        return 2;
      }
      return cmdPrice(provider, model, format, out, err);
    }

    case 'estimate': {
      const [provider, model] = positionals;
      if (!provider || !model) {
        err('Usage: model-price-registry estimate <provider> <model> --input <n> --output <n>');
        return 2;
      }
      const inputRaw = flags['input'];
      const outputRaw = flags['output'];
      const cachedRaw = flags['cached'];
      if (!inputRaw || !outputRaw) {
        err('Error: --input and --output are required');
        return 2;
      }
      const inputTokens = parseInt(String(inputRaw), 10);
      const outputTokens = parseInt(String(outputRaw), 10);
      const cachedInputTokens = cachedRaw ? parseInt(String(cachedRaw), 10) : 0;
      if (isNaN(inputTokens) || isNaN(outputTokens)) {
        err('Error: --input and --output must be integers');
        return 2;
      }
      if (cachedRaw && isNaN(cachedInputTokens)) {
        err('Error: --cached must be an integer');
        return 2;
      }
      return cmdEstimate(provider, model, inputTokens, outputTokens, cachedInputTokens, format, out, err);
    }

    case 'list': {
      const providerFilter = flags['provider'] !== undefined ? String(flags['provider']) : undefined;
      const sortRaw = flags['sort'];
      let sortBy: 'name' | 'inputPrice' | 'outputPrice' = 'name';
      if (sortRaw === 'cost') {
        sortBy = 'inputPrice';
      } else if (sortRaw === 'name') {
        sortBy = 'name';
      } else if (sortRaw !== undefined && sortRaw !== true) {
        err(`Error: --sort must be 'cost' or 'name'`);
        return 2;
      }
      return cmdList(providerFilter, sortBy, format, out);
    }

    case 'providers': {
      return cmdProviders(format, out);
    }

    case 'info': {
      const [provider, model] = positionals;
      if (!provider || !model) {
        err('Usage: model-price-registry info <provider> <model>');
        return 2;
      }
      return cmdInfo(provider, model, format, out, err);
    }

    default: {
      err(`Error: unknown command '${command}'. Run with --help for usage.`);
      return 2;
    }
  }
}

// Run when executed directly
if (require.main === module) {
  const code = main(process.argv.slice(2));
  process.exit(code);
}
