# model-price-registry

Auto-updating registry of LLM pricing across providers.

## Installation

```bash
npm install model-price-registry
```

## Quick Start

```typescript
import {
  getPrice,
  estimateCost,
  listModels,
  listProviders,
} from 'model-price-registry';

// Look up pricing for a model
const price = getPrice('openai', 'gpt-4o');
console.log(price);
// { provider: 'openai', modelId: 'gpt-4o', inputPerMTok: 2.5, outputPerMTok: 10, ... }

// Estimate cost for a specific usage
const cost = estimateCost('anthropic', 'claude-sonnet-4', {
  inputTokens: 50_000,
  outputTokens: 5_000,
  cachedInputTokens: 10_000,
});
console.log(cost);
// { inputCost: 0.15, outputCost: 0.075, cachedInputCost: 0.015, totalCost: 0.24, ... }

// List all available providers
const providers = listProviders();
console.log(providers);
// ['openai', 'anthropic', 'google', 'meta', 'mistral', 'cohere']

// List models with filtering and sorting
const models = listModels({ provider: 'openai', sortBy: 'inputPrice' });
console.log(models);
```

## Supported Providers

- **OpenAI** — GPT-4o, GPT-4.1, o3, o4-mini, and more
- **Anthropic** — Claude Opus 4, Claude Sonnet 4, Claude Haiku 3.5, and more
- **Google** — Gemini 2.5 Pro, Gemini 2.5 Flash, and more
- **Meta** — Llama 4 Maverick, Llama 4 Scout, Llama 3.x series
- **Mistral** — Mistral Large, Codestral, Pixtral Large, and more
- **Cohere** — Command R+, Command R, Embed v3, Rerank v3

## API Reference

### `getPrice(provider, model, options?)`

Look up pricing for a specific model. Resolves aliases and is case-insensitive.

```typescript
function getPrice(
  provider: string,
  model: string,
  options?: GetPriceOptions,
): PriceEntry | undefined;
```

- `options.asOf` — Return pricing effective on or before this ISO 8601 date string.
- Returns `undefined` if the provider or model is not found.

### `estimateCost(provider, model, usage)`

Estimate the cost of a specific token usage. Supports tiered pricing and cached input tokens.

```typescript
function estimateCost(
  provider: string,
  model: string,
  usage: TokenUsage,
): CostEstimate | undefined;
```

- When a model has pricing tiers (e.g., long-context pricing), the highest applicable tier is used.
- When `cachedInputTokens` is provided but the model has no cached rate, tokens are billed at the full input rate.
- All cost values are rounded to 6 decimal places.

### `listProviders()`

Return an array of all provider ID strings.

```typescript
function listProviders(): string[];
```

### `listModels(options?)`

Return a list of model summaries with optional filtering and sorting.

```typescript
function listModels(options?: ListModelsOptions): ModelSummary[];
```

- `options.provider` — Filter by provider ID.
- `options.category` — Filter by model category.
- `options.includeDeprecated` — Include deprecated models (default: `true`).
- `options.sortBy` — Sort by `'name'` (default), `'inputPrice'`, `'outputPrice'`, or `'contextWindow'`.

### `getModelInfo(provider, model)`

Return detailed model information including aliases and launch date.

```typescript
function getModelInfo(
  provider: string,
  model: string,
): ModelInfo | undefined;
```

### `resolveModel(provider, modelOrAlias)`

Resolve an alias to its canonical model ID. Returns `undefined` if not found.

```typescript
function resolveModel(
  provider: string,
  modelOrAlias: string,
): string | undefined;
```

### `getRegistryMetadata()`

Return metadata about the registry including provider and model counts, date ranges, and version info.

```typescript
function getRegistryMetadata(): RegistryMetadata;
```

### `createRegistry(data)`

Create a custom registry instance from your own pricing data.

```typescript
function createRegistry(data: PriceRegistry): RegistryInstance;
```

## CLI

Install globally or use `npx`:

```bash
npm install -g model-price-registry
# or
npx model-price-registry --help
```

### Commands

#### `price <provider> <model>`

Show input/output price per 1M tokens for a model.

```bash
model-price-registry price openai gpt-4o
# Provider  : openai
# Model     : gpt-4o (GPT-4o)
# Input/1M  : $2.50
# Output/1M : $10.00
# Cached/1M : $1.25
```

#### `estimate <provider> <model> --input <n> --output <n> [--cached <n>]`

Estimate the cost for a given token usage.

```bash
model-price-registry estimate anthropic claude-sonnet-4-5 --input 50000 --output 5000
# Provider      : anthropic
# Model         : claude-sonnet-4-5
# Input tokens  : 50,000
# Output tokens : 5,000
# Input cost    : $0.15
# Output cost   : $0.075
# ─────────────────────────────
# Total cost    : $0.225
```

#### `list [--provider <name>] [--sort cost|name]`

List all models in a table. Optionally filter by provider or sort by input price.

```bash
model-price-registry list --provider openai --sort cost
```

#### `providers`

List all available provider IDs.

```bash
model-price-registry providers
# Available providers:
#   openai
#   anthropic
#   google
#   meta
#   mistral
#   cohere
```

#### `info <provider> <model>`

Show full model information including aliases, pricing tiers, context window, and deprecation status.

```bash
model-price-registry info anthropic claude-sonnet-4-5
```

### Flags

| Flag | Description |
|---|---|
| `--format json\|human` | Output format. Default: `human`. Overrides `MODEL_PRICE_REGISTRY_FORMAT` env var. |
| `--help`, `-h` | Show help text. |
| `--version`, `-v` | Show package version. |

### Environment variables

| Variable | Description |
|---|---|
| `MODEL_PRICE_REGISTRY_FORMAT` | Set to `json` or `human` to control default output format. |

### Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Model or provider not found |
| `2` | Usage error (missing arguments, invalid flags) |

## Types

The following types are exported for TypeScript consumers:

- `PriceRegistry` — Top-level registry structure
- `ProviderData` — Provider metadata and model map
- `ModelPriceData` — Raw model pricing data
- `PriceEntry` — Return type of `getPrice`
- `PricingTier` — Long-context pricing tier
- `ModelCategory` — `'flagship' | 'balanced' | 'fast' | 'reasoning' | 'code' | 'embedding' | 'legacy'`
- `GetPriceOptions` — Options for `getPrice`
- `TokenUsage` — Input for `estimateCost`
- `CostEstimate` — Return type of `estimateCost`
- `ListModelsOptions` — Options for `listModels`
- `ModelSummary` — Return type of `listModels`
- `ModelInfo` — Return type of `getModelInfo`
- `RegistryMetadata` — Return type of `getRegistryMetadata`
- `RegistryInstance` — Interface for custom registry instances

## License

MIT
