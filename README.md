# model-price-registry

Queryable registry of LLM pricing across all major providers -- zero runtime dependencies, sub-millisecond lookups, updated weekly.

[![npm version](https://img.shields.io/npm/v/model-price-registry.svg)](https://www.npmjs.com/package/model-price-registry)
[![npm downloads](https://img.shields.io/npm/dt/model-price-registry.svg)](https://www.npmjs.com/package/model-price-registry)
[![license](https://img.shields.io/npm/l/model-price-registry.svg)](https://github.com/SiluPanda/model-price-registry/blob/master/LICENSE)
[![node](https://img.shields.io/node/v/model-price-registry.svg)](https://nodejs.org/)

---

## Description

`model-price-registry` provides a single source of truth for LLM API pricing. Given a provider and model identifier, it returns structured pricing data -- input cost per million tokens, output cost per million tokens, cached input pricing, context window size, deprecation status, and effective dates -- with a single function call.

The registry ships as a static JSON dataset bundled inside the npm package. It requires zero network calls at runtime. Lookups are plain object property accesses, completing in sub-millisecond time. The dataset covers 40 models across 6 providers (OpenAI, Anthropic, Google, Meta, Mistral, Cohere) and is updated on a weekly cadence via automated CI, with each update published as a new package version.

The package provides both a TypeScript/JavaScript API for programmatic use and a CLI for terminal-based lookups and cost estimation. All exports are fully typed. There are zero runtime dependencies.

---

## Installation

```bash
npm install model-price-registry
```

Requires Node.js 18 or later.

---

## Quick Start

```typescript
import { getPrice, estimateCost, listProviders, listModels } from 'model-price-registry';

// Look up pricing for a model
const price = getPrice('openai', 'gpt-4o');
// {
//   provider: 'openai',
//   modelId: 'gpt-4o',
//   displayName: 'GPT-4o',
//   inputPerMTok: 2.5,
//   outputPerMTok: 10,
//   cachedInputPerMTok: 1.25,
//   contextWindow: 128000,
//   effectiveDate: '2025-03-01',
//   deprecated: false,
//   category: 'flagship'
// }

// Estimate cost for a specific token usage
const cost = estimateCost('anthropic', 'claude-sonnet-4-5', {
  inputTokens: 50_000,
  outputTokens: 5_000,
  cachedInputTokens: 10_000,
});
// {
//   provider: 'anthropic',
//   modelId: 'claude-sonnet-4-5',
//   inputCost: 0.15,
//   outputCost: 0.075,
//   cachedInputCost: 0.003,
//   totalCost: 0.228,
//   inputTokens: 50000,
//   outputTokens: 5000,
//   cachedInputTokens: 10000,
//   currency: 'USD'
// }

// List all providers
const providers = listProviders();
// ['openai', 'anthropic', 'google', 'meta', 'mistral', 'cohere']

// List models with filtering and sorting
const cheapest = listModels({ provider: 'openai', sortBy: 'inputPrice' });
```

---

## Features

- **40 models across 6 providers** -- OpenAI, Anthropic, Google, Meta, Mistral, and Cohere with accurate, sourced pricing.
- **Zero runtime dependencies** -- Pure TypeScript lookup functions over a bundled JSON dataset. No network calls.
- **Sub-millisecond lookups** -- Pricing data is a frozen in-memory object. Lookups are property accesses, not API calls.
- **Alias resolution** -- `gpt-4o-2024-11-20` and `chatgpt-4o-latest` both resolve to `gpt-4o`. Case-insensitive matching.
- **Tiered pricing** -- Handles long-context pricing tiers (e.g., Anthropic and Google charge 2x above 200K input tokens).
- **Cached input pricing** -- First-class support for prompt caching rates offered by OpenAI, Anthropic, and Google.
- **Cost estimation** -- `estimateCost()` computes USD cost from token counts, handling tiers and caching automatically.
- **Deprecation tracking** -- Deprecated models are flagged with optional `deprecatedDate` and `successor` fields.
- **Effective date filtering** -- `getPrice()` accepts an `asOf` option for historical pricing lookups.
- **CLI included** -- Terminal commands for price lookup, cost estimation, model listing, and provider discovery.
- **Fully typed** -- All inputs and outputs have TypeScript type definitions. 14 exported types.
- **Immutable registry** -- The default registry is deep-frozen at load time. Data cannot be accidentally mutated.
- **Custom registries** -- `createRegistry()` lets you build a registry instance from your own pricing data.
- **Dual output formats** -- CLI supports both human-readable and JSON output for scripting.

---

## Supported Providers

| Provider ID | Provider | Models | Notable Models |
|---|---|---|---|
| `openai` | OpenAI | 11 | GPT-4o, GPT-4.1, o3, o4-mini, GPT-4.1-nano |
| `anthropic` | Anthropic | 6 | Claude Opus 4, Claude Sonnet 4.5, Claude Haiku 3.5 |
| `google` | Google | 5 | Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 1.5 Pro |
| `meta` | Meta | 5 | Llama 4 Maverick, Llama 4 Scout, Llama 3.1-405B |
| `mistral` | Mistral AI | 6 | Mistral Large, Codestral, Pixtral Large |
| `cohere` | Cohere | 7 | Command R+, Command R, Embed v3, Rerank v3 |

---

## API Reference

All functions below are named exports from `model-price-registry`.

### `getPrice(provider, model, options?)`

Look up pricing for a specific model. Resolves aliases automatically. Provider and model matching is case-insensitive and whitespace-trimmed.

```typescript
function getPrice(
  provider: string,
  model: string,
  options?: GetPriceOptions,
): PriceEntry | undefined;
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `provider` | `string` | Provider identifier (e.g., `'openai'`, `'anthropic'`). |
| `model` | `string` | Model ID or alias (e.g., `'gpt-4o'`, `'gpt-4o-2024-11-20'`). |
| `options.asOf` | `string` (optional) | ISO 8601 date string. Returns pricing only if the model's effective date is on or before this date. |

**Returns:** `PriceEntry | undefined` -- Returns `undefined` if the provider or model is not found, or if the model's effective date is after `asOf`.

```typescript
const entry = getPrice('openai', 'gpt-4o');
// entry.inputPerMTok  => 2.5
// entry.outputPerMTok => 10

// Historical lookup: returns undefined if model pricing was not yet effective
const old = getPrice('openai', 'gpt-4o', { asOf: '2024-01-01' });
// undefined
```

---

### `estimateCost(provider, model, usage)`

Estimate the USD cost for a given token usage. Automatically applies tiered pricing and cached input rates.

```typescript
function estimateCost(
  provider: string,
  model: string,
  usage: TokenUsage,
): CostEstimate | undefined;
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `provider` | `string` | Provider identifier. |
| `model` | `string` | Model ID or alias. |
| `usage.inputTokens` | `number` | Number of input tokens. |
| `usage.outputTokens` | `number` | Number of output tokens. |
| `usage.cachedInputTokens` | `number` (optional) | Number of cached input tokens. Defaults to `0`. |

**Returns:** `CostEstimate | undefined` -- Returns `undefined` if the provider or model is not found.

**Behavior:**

- When the model has pricing tiers (e.g., long-context pricing), the highest applicable tier based on `inputTokens` is used for both input and output rates.
- When `cachedInputTokens` is provided but the model has no `cachedInputPerMTok`, tokens are billed at the full input rate.
- All cost values are rounded to 6 decimal places.
- The `currency` field is always `'USD'`.

```typescript
const cost = estimateCost('openai', 'gpt-4o', {
  inputTokens: 100_000,
  outputTokens: 50_000,
  cachedInputTokens: 200_000,
});
// cost.inputCost       => 0.25
// cost.outputCost      => 0.5
// cost.cachedInputCost => 0.25
// cost.totalCost       => 1.0
// cost.currency        => 'USD'
```

---

### `listProviders()`

Return an array of all provider ID strings in the registry.

```typescript
function listProviders(): string[];
```

**Returns:** `string[]`

```typescript
const providers = listProviders();
// ['openai', 'anthropic', 'google', 'meta', 'mistral', 'cohere']
```

---

### `listModels(options?)`

Return a list of model summaries with optional filtering and sorting.

```typescript
function listModels(options?: ListModelsOptions): ModelSummary[];
```

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `options.provider` | `string` (optional) | -- | Filter by provider ID. |
| `options.category` | `ModelCategory` (optional) | -- | Filter by model category. |
| `options.includeDeprecated` | `boolean` (optional) | `true` | Whether to include deprecated models. |
| `options.sortBy` | `'name' \| 'inputPrice' \| 'outputPrice' \| 'contextWindow'` (optional) | `'name'` | Sort order for results. |

**Returns:** `ModelSummary[]`

```typescript
// All flagship models sorted by input price
const flagships = listModels({ category: 'flagship', sortBy: 'inputPrice' });

// Only active (non-deprecated) Anthropic models
const active = listModels({ provider: 'anthropic', includeDeprecated: false });

// Sort all models by context window size
const byContext = listModels({ sortBy: 'contextWindow' });
```

---

### `getModelInfo(provider, model)`

Return detailed model information including aliases, launch date, and all pricing fields.

```typescript
function getModelInfo(
  provider: string,
  model: string,
): ModelInfo | undefined;
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `provider` | `string` | Provider identifier. |
| `model` | `string` | Model ID or alias. |

**Returns:** `ModelInfo | undefined` -- Extends `PriceEntry` with `aliases: string[]` and `launchDate?: string`. Returns `undefined` if the provider or model is not found.

```typescript
const info = getModelInfo('openai', 'gpt-4o');
// info.aliases  => ['gpt-4o-2024-11-20', 'chatgpt-4o-latest']
// info.category => 'flagship'
// info.tiers    => undefined (no tiered pricing for this model)

const tiered = getModelInfo('anthropic', 'claude-sonnet-4-5');
// tiered.tiers => [{ minInputTokens: 200000, inputPerMTok: 6, outputPerMTok: 30 }]
```

---

### `resolveModel(provider, modelOrAlias)`

Resolve a model alias to its canonical model ID. Useful for normalizing model identifiers before logging or storage.

```typescript
function resolveModel(
  provider: string,
  modelOrAlias: string,
): string | undefined;
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `provider` | `string` | Provider identifier. |
| `modelOrAlias` | `string` | Model ID or alias to resolve. |

**Returns:** `string | undefined` -- The canonical model ID, or `undefined` if not found.

```typescript
resolveModel('openai', 'gpt-4o-2024-11-20');   // 'gpt-4o'
resolveModel('openai', 'chatgpt-4o-latest');    // 'gpt-4o'
resolveModel('openai', 'gpt-4o');               // 'gpt-4o' (already canonical)
resolveModel('openai', 'gpt-99-ultra');          // undefined
```

---

### `getRegistryMetadata()`

Return metadata about the registry including provider count, model count, schema version, and date range of pricing data.

```typescript
function getRegistryMetadata(): RegistryMetadata;
```

**Returns:** `RegistryMetadata`

```typescript
const meta = getRegistryMetadata();
// {
//   schemaVersion: '1.0.0',
//   lastUpdated: '2026-03-21T00:00:00Z',
//   packageVersion: '0.3.0',
//   providerCount: 6,
//   modelCount: 40,
//   oldestEffectiveDate: '2025-03-01',
//   newestEffectiveDate: '2025-03-01'
// }
```

---

### `createRegistry(data)`

Create a custom registry instance from your own pricing data. Returns a `RegistryInstance` with the same methods as the default exports, but operating on the provided data.

```typescript
function createRegistry(data: PriceRegistry): RegistryInstance;
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `data` | `PriceRegistry` | A pricing registry object conforming to the `PriceRegistry` type. |

**Returns:** `RegistryInstance` -- An object with bound methods: `getPrice`, `estimateCost`, `listProviders`, `listModels`, `getModelInfo`, `resolveModel`, `getRegistryMetadata`, and a `registry` property exposing the raw data.

```typescript
import { createRegistry } from 'model-price-registry';
import type { PriceRegistry } from 'model-price-registry';

const customData: PriceRegistry = {
  schemaVersion: '1.0.0',
  lastUpdated: '2026-03-22T00:00:00Z',
  packageVersion: '1.0.0',
  providers: {
    internal: {
      displayName: 'Internal LLM',
      pricingUrl: 'https://internal.example.com/pricing',
      models: {
        'custom-model': {
          modelId: 'custom-model',
          displayName: 'Custom Model',
          inputPerMTok: 1.0,
          outputPerMTok: 3.0,
          contextWindow: 32000,
          effectiveDate: '2026-01-01',
          deprecated: false,
          category: 'balanced',
        },
      },
      aliases: {},
    },
  },
};

const custom = createRegistry(customData);
const price = custom.getPrice('internal', 'custom-model');
```

---

### `registry`

The raw, deep-frozen `PriceRegistry` object. Available as a named export for direct data access when you need to traverse the registry structure without the API wrapper.

```typescript
import { registry } from 'model-price-registry';

// Direct access to provider data
const openai = registry.providers['openai'];
const gpt4o = openai.models['gpt-4o'];
console.log(gpt4o.inputPerMTok); // 2.5
```

---

## Configuration

`model-price-registry` requires no configuration for programmatic use. The registry data is bundled at publish time and loaded at import time.

### Environment Variables

| Variable | Scope | Description |
|---|---|---|
| `MODEL_PRICE_REGISTRY_FORMAT` | CLI only | Set to `json` or `human` to control default CLI output format. The `--format` flag overrides this variable. |

---

## Error Handling

All lookup functions return `undefined` when a provider or model is not found. They never throw exceptions for missing data. This design allows callers to handle unknown models with standard nullish checks rather than try/catch blocks.

```typescript
const price = getPrice('openai', 'nonexistent-model');
if (!price) {
  console.warn('Unknown model, falling back to default pricing');
}

const cost = estimateCost('unknown-provider', 'some-model', {
  inputTokens: 1000,
  outputTokens: 500,
});
if (!cost) {
  // Handle gracefully -- provider not in registry
}
```

The CLI uses exit codes to communicate error states:

| Exit Code | Meaning |
|---|---|
| `0` | Success. |
| `1` | Model or provider not found. |
| `2` | Usage error (missing arguments, invalid flags, unknown command). |

---

## CLI

The package includes a CLI binary `model-price-registry` for terminal-based lookups. Install globally or use `npx`:

```bash
npm install -g model-price-registry
# or
npx model-price-registry --help
```

### Commands

#### `price <provider> <model>`

Show input/output price per 1M tokens.

```bash
$ model-price-registry price openai gpt-4o
Provider  : openai
Model     : gpt-4o (GPT-4o)
Input/1M  : $2.50
Output/1M : $10.00
Cached/1M : $1.25
```

#### `estimate <provider> <model> --input <n> --output <n> [--cached <n>]`

Estimate the cost for a given token usage.

```bash
$ model-price-registry estimate anthropic claude-sonnet-4-5 --input 50000 --output 5000
Provider      : anthropic
Model         : claude-sonnet-4-5
Input tokens  : 50,000
Output tokens : 5,000
Input cost    : $0.15
Output cost   : $0.075
------------------------------
Total cost    : $0.225
```

#### `list [--provider <name>] [--sort cost|name]`

List all models in a table. Optionally filter by provider or sort by input price.

```bash
$ model-price-registry list --provider openai --sort cost
```

#### `providers`

List all available provider IDs.

```bash
$ model-price-registry providers
Available providers:
  openai
  anthropic
  google
  meta
  mistral
  cohere
```

#### `info <provider> <model>`

Show full model information including aliases, pricing tiers, context window, and deprecation status.

```bash
$ model-price-registry info anthropic claude-sonnet-4-5
Provider      : anthropic
Model ID      : claude-sonnet-4-5
Display name  : Claude Sonnet 4.5
Category      : flagship
Input/1M      : $3.00
Output/1M     : $15.00
Cached/1M     : $0.30
Context window: 200,000 tokens
Effective date: 2025-03-01
Deprecated    : no
Aliases       : claude-sonnet-4-5-20250514
Pricing tiers :
  >= 200,000 input tokens -> $6.00/in, $30.00/out
```

### Flags

| Flag | Description |
|---|---|
| `--format json\|human` | Output format. Default: `human`. Overrides `MODEL_PRICE_REGISTRY_FORMAT` env var. |
| `--help`, `-h` | Show help text. |
| `--version`, `-v` | Show package version. |

### JSON Output

All commands support `--format json` for machine-readable output, suitable for piping into `jq` or consuming from scripts:

```bash
$ model-price-registry price openai gpt-4o --format json
{
  "provider": "openai",
  "modelId": "gpt-4o",
  "displayName": "GPT-4o",
  "inputPerMTok": 2.5,
  "outputPerMTok": 10,
  "cachedInputPerMTok": 1.25
}

$ model-price-registry list --format json | jq '.[0]'
```

---

## Advanced Usage

### Tiered Pricing

Some providers charge different rates based on context length. The registry models this with a `tiers` array on the pricing entry. When using `estimateCost()`, the highest applicable tier is selected automatically based on the `inputTokens` count.

```typescript
// Anthropic charges 2x for Claude Sonnet 4.5 above 200K input tokens
const below = estimateCost('anthropic', 'claude-sonnet-4-5', {
  inputTokens: 100_000,  // Below 200K threshold
  outputTokens: 50_000,
});
// Uses base rate: $3.00/MTok input, $15.00/MTok output

const above = estimateCost('anthropic', 'claude-sonnet-4-5', {
  inputTokens: 300_000,  // Above 200K threshold
  outputTokens: 50_000,
});
// Uses tier rate: $6.00/MTok input, $30.00/MTok output
```

### Cached Input Tokens

OpenAI, Anthropic, and Google offer discounted rates for cached prompt tokens. Pass `cachedInputTokens` to `estimateCost()` to include cached costs in the estimate. If a model has no cached rate, cached tokens are billed at the full input rate.

```typescript
const cost = estimateCost('openai', 'gpt-4o', {
  inputTokens: 100_000,
  outputTokens: 50_000,
  cachedInputTokens: 200_000,
});
// cost.inputCost       => 0.25  ($2.50/MTok * 0.1M)
// cost.cachedInputCost => 0.25  ($1.25/MTok * 0.2M)
// cost.outputCost      => 0.5   ($10.00/MTok * 0.05M)
// cost.totalCost       => 1.0
```

### Deprecation Awareness

Filter out deprecated models when presenting options to users, while still keeping them available for historical cost attribution:

```typescript
// Only show active models
const active = listModels({ includeDeprecated: false });

// Check if a specific model is deprecated
const info = getModelInfo('google', 'gemini-2.0-flash');
if (info?.deprecated) {
  console.warn(`${info.modelId} is deprecated.`);
  if (info.successor) {
    console.warn(`Migrate to: ${info.successor}`);
  }
}
```

### Historical Pricing Lookups

Use the `asOf` option to filter by effective date. This is useful for attributing costs to the correct pricing period when processing historical API logs.

```typescript
// Only returns pricing if the model's effective date is on or before the given date
const price = getPrice('openai', 'gpt-4o', { asOf: '2025-06-01' });
```

### Custom Registry Instances

Use `createRegistry()` to build isolated registry instances for testing, for internal models, or for merging external pricing data:

```typescript
import { createRegistry } from 'model-price-registry';

const testRegistry = createRegistry(myTestPricingData);
const cost = testRegistry.estimateCost('my-provider', 'my-model', {
  inputTokens: 1000,
  outputTokens: 500,
});
```

---

## TypeScript

All exports include full TypeScript type definitions. The following types are available as named type exports:

| Type | Description |
|---|---|
| `PriceRegistry` | Top-level registry data structure. |
| `ProviderData` | Provider metadata, model map, and alias map. |
| `ModelPriceData` | Raw model pricing data as stored in the registry. |
| `PriceEntry` | Return type of `getPrice()`. Normalized pricing entry. |
| `PricingTier` | Long-context pricing tier with `minInputTokens`, `inputPerMTok`, `outputPerMTok`. |
| `ModelCategory` | `'flagship' \| 'balanced' \| 'fast' \| 'reasoning' \| 'code' \| 'embedding' \| 'legacy'` |
| `GetPriceOptions` | Options for `getPrice()`. Contains optional `asOf` field. |
| `TokenUsage` | Input for `estimateCost()`. Contains `inputTokens`, `outputTokens`, optional `cachedInputTokens`. |
| `CostEstimate` | Return type of `estimateCost()`. Contains itemized costs and totals. |
| `ListModelsOptions` | Options for `listModels()`. Contains `provider`, `category`, `includeDeprecated`, `sortBy`. |
| `ModelSummary` | Return type of `listModels()`. Lightweight model summary for listing. |
| `ModelInfo` | Return type of `getModelInfo()`. Extends `PriceEntry` with `aliases` and `launchDate`. |
| `RegistryMetadata` | Return type of `getRegistryMetadata()`. Registry-level stats and version info. |
| `RegistryInstance` | Interface for custom registry instances returned by `createRegistry()`. |

```typescript
import type { PriceEntry, CostEstimate, ModelCategory } from 'model-price-registry';

function logCost(entry: PriceEntry, estimate: CostEstimate): void {
  console.log(`${entry.displayName}: $${estimate.totalCost.toFixed(4)}`);
}

const category: ModelCategory = 'flagship';
```

---

## License

MIT
