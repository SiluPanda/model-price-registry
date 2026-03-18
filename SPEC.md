# model-price-registry -- Specification

## 1. Overview

`model-price-registry` is a queryable, auto-updating registry of LLM pricing across all major providers, published as a versioned JSON dataset with a TypeScript API. It answers the question "how much does this model cost per token?" with a single function call -- `getPrice('openai', 'gpt-4o')` -- returning structured pricing data including input price per million tokens, output price per million tokens, context window size, and model metadata. The registry ships as a static JSON data file bundled inside the npm package, requires zero network calls at runtime, and is updated on a weekly cadence via automated CI to track the rapidly changing LLM pricing landscape.

The gap this package fills is specific and well-defined. LLM pricing changes frequently -- providers adjust prices, deprecate models, and launch new ones on a near-weekly basis. OpenAI has changed GPT-4o pricing twice since launch. Anthropic reduced Claude pricing by 67% between the 3.x and 4.x generations. Google offers tiered pricing based on context length. Developers building cost management tooling -- budgeting dashboards, per-request cost attribution, spend forecasting, test cost tracking -- need a single source of truth for model pricing that is accurate, comprehensive, and kept current.

The closest existing tool is `llm-cost` on npm, which has not been updated in over two years and contains stale pricing for models that no longer exist while missing all models released since 2024. `llm-info` provides model metadata including pricing but bundles it with context window limits, tokenizer information, and capability flags, making it heavier than necessary for pure pricing lookups. Neither package provides a structured update workflow, deprecation tracking, effective-date versioning, or the provider-normalized model ID scheme needed for reliable programmatic cost calculation across heterogeneous LLM deployments.

`model-price-registry` provides both a TypeScript/JavaScript API for programmatic use and a CLI for quick terminal lookups and cost estimation. The API returns typed `PriceEntry` objects with per-model pricing, context window, deprecation status, and effective dates. The CLI prints human-readable tables or JSON output for scripting. Both interfaces support filtering by provider, searching by model name, and estimating costs for a given token count. The registry data is a plain JSON file that can be imported directly for environments where the API wrapper is unnecessary.

---

## 2. Goals and Non-Goals

### Goals

- Provide a `getPrice(provider, model)` function that returns structured pricing data (input/output price per million tokens, context window, model metadata) for any supported model, with sub-millisecond lookup time.
- Ship a comprehensive, versioned JSON registry of pricing data covering all major LLM providers: OpenAI, Anthropic, Google, Meta (via hosted providers), Mistral, and Cohere.
- Cover 60+ models across 6 providers with accurate, sourced pricing as of each release.
- Provide `estimateCost(provider, model, inputTokens, outputTokens)` for quick cost calculation in USD.
- Provide `listProviders()` and `listModels(provider?)` for programmatic discovery of available providers and models.
- Provide `getModelInfo(provider, model)` for full model metadata including context window, deprecation status, launch date, and pricing tiers.
- Maintain pricing freshness through a weekly automated update workflow (GitHub Actions scraping provider pricing pages, community PRs, manual verification) with each update published as a new patch version.
- Track model deprecation status so consumers can detect when they are using deprecated models and plan migrations.
- Track effective dates on pricing entries so consumers can attribute historical costs accurately when pricing changes.
- Provide a CLI (`model-price-registry`) for terminal-based price lookups, model listing, and cost estimation.
- Expose the raw registry data as a typed JSON import for consumers who want direct data access without the API wrapper.
- Normalize model identifiers across providers to handle aliases (e.g., `gpt-4o` and `gpt-4o-2024-11-20` resolve to the same pricing entry).
- Zero runtime dependencies. The package is a JSON file and pure TypeScript lookup functions.
- Target Node.js 18+. Use only built-in modules.

### Non-Goals

- **Not a real-time pricing API.** This package does not fetch pricing from provider APIs at runtime. Pricing data is static, bundled at publish time, and updated by publishing new versions. For real-time pricing, query provider APIs directly.
- **Not a billing system.** This package provides unit prices and cost estimates. It does not track actual API usage, manage billing accounts, apply volume discounts, or handle billing tiers. Actual costs depend on provider-specific discount programs (batch pricing, committed use, enterprise agreements) that are not modeled here.
- **Not a model capability database.** This package stores pricing-relevant metadata (context window, deprecation status) but does not track model capabilities (function calling support, vision support, reasoning mode, output format support). Use `llm-info` or provider documentation for capability discovery.
- **Not a tokenizer.** This package does not count tokens. It accepts token counts as input and returns cost estimates. For token counting, use `tiktoken` (OpenAI), the Anthropic tokenizer, or a provider-specific tokenizer library.
- **Not a usage tracker.** This package does not intercept API calls, count tokens consumed, or maintain running totals. For usage tracking and aggregation, use `ai-spend-forecast` or `ai-chargeback` from this monorepo, which consume `model-price-registry` as a pricing data source.
- **Not a price comparison tool.** While the data enables comparison, this package does not rank models by cost-effectiveness, recommend models, or optimize model selection. Use `ai-cost-compare` from this monorepo for that.

---

## 3. Target Users and Use Cases

### Cost Management Engineers

Teams responsible for tracking and controlling LLM API spend across an organization. They need accurate per-model pricing to build dashboards that show cost by team, project, or feature. `model-price-registry` provides the pricing data layer: given a model identifier from API logs, look up the unit price and compute the cost for each request. A finance dashboard ingesting 10 million API call logs per month needs sub-millisecond price lookups -- a JSON object property access, not a network call.

### AI Application Developers

Developers building applications that route requests to different models based on cost constraints. A routing layer might use GPT-4o for complex queries and GPT-4o-mini for simple ones, or fall back from Claude Opus to Claude Haiku when budget thresholds are exceeded. `estimateCost()` lets the router pre-compute the expected cost of a request before sending it, enabling budget-aware routing decisions in real time.

### Test Infrastructure Engineers

Engineers running AI-powered test suites where each test makes LLM API calls. They need to track the cost of each test run, set cost budgets per test suite, and alert when costs spike. `llm-cost-per-test` from this monorepo consumes `model-price-registry` to convert token counts from test runs into dollar amounts for cost-per-test reporting.

### DevOps and FinOps Teams

Teams implementing cost attribution and chargeback for shared LLM infrastructure. When multiple teams share an API key or a proxy, costs must be attributed to the correct cost center. `ai-chargeback` from this monorepo uses `model-price-registry` to convert metered token usage into dollar amounts for internal billing.

### Prompt Engineers and Researchers

Engineers iterating on prompts who want a quick terminal check of how much a prompt will cost before running it. The CLI's `estimate` command accepts a model, input token count, and output token count, and prints the estimated cost -- faster than navigating to a provider's pricing page.

### Library and Framework Authors

Authors of LLM SDKs, orchestration frameworks, and observability tools who need a reliable, always-current pricing data source they can depend on without maintaining their own pricing database. Depending on `model-price-registry` as an npm dependency gives them accurate pricing with weekly updates, without the maintenance burden of scraping provider pricing pages themselves.

---

## 4. Core Concepts

### Provider

A provider is a company or platform that offers LLM API access. Each provider has a unique string identifier used throughout the registry:

| Provider ID | Company | Notes |
|---|---|---|
| `openai` | OpenAI | GPT-4o, GPT-4.1, o3, o4-mini, etc. |
| `anthropic` | Anthropic | Claude Opus, Sonnet, Haiku |
| `google` | Google | Gemini 2.5 Pro, 2.5 Flash, etc. |
| `meta` | Meta | Llama 4 Maverick, Llama 4 Scout (hosted pricing via inference providers) |
| `mistral` | Mistral AI | Mistral Large, Medium, Codestral |
| `cohere` | Cohere | Command R+, Command R, Embed |

Provider IDs are lowercase, stable, and never change. They are the first-level key in the registry data structure.

### Model

A model is a specific LLM offered by a provider, identified by a model ID string. Model IDs follow the provider's own naming convention but are normalized to lowercase:

- `gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, `gpt-4.1-nano`
- `claude-sonnet-4-5`, `claude-opus-4`, `claude-haiku-3-5`
- `gemini-2.5-pro`, `gemini-2.5-flash`
- `llama-4-maverick`, `llama-4-scout`
- `mistral-large`, `mistral-medium-3`, `codestral`
- `command-r-plus`, `command-r`

### Model Aliases

Providers often use multiple identifiers for the same model. OpenAI uses both `gpt-4o` and `gpt-4o-2024-11-20`; Anthropic uses both `claude-sonnet-4-5` and `claude-sonnet-4-5-20250514`. The registry maintains an alias map so that any recognized identifier resolves to the canonical model ID and its pricing entry. Unrecognized model IDs return `undefined` rather than throwing, allowing callers to handle unknown models gracefully.

### Pricing Tiers

Some providers charge different rates based on context length. Google charges 2x for Gemini 2.5 Pro prompts exceeding 200K input tokens. Anthropic charges 2x for Claude Sonnet prompts exceeding 200K input tokens. The registry models this as pricing tiers: each model can have a `basePricing` entry (for standard context) and optional `tierPricing` entries keyed by the token threshold at which the tier activates.

### Token Types

LLM APIs bill for different token types at different rates:

- **Input tokens**: Tokens in the prompt/request. Billed at the input rate.
- **Output tokens**: Tokens in the completion/response. Billed at the output rate, which is typically 2x-5x higher than the input rate.
- **Cached input tokens**: Tokens served from prompt caching (OpenAI, Anthropic, Google). Billed at a reduced rate, typically 50-90% off the input rate.
- **Reasoning tokens**: Internal chain-of-thought tokens generated by reasoning models (o3, o4-mini). Billed as output tokens but not visible in the API response. The registry does not model reasoning tokens separately -- they are billed at the output token rate.

The registry stores `inputPerMTok` and `outputPerMTok` as the primary pricing fields. Cached input pricing is stored as `cachedInputPerMTok` where available.

### Effective Date

Each pricing entry has an `effectiveDate` field (ISO 8601 date string, e.g., `"2025-04-14"`) indicating when that pricing took effect. When a provider changes pricing, the registry adds a new entry with the updated prices and a new effective date. The default lookup returns the most recent pricing. Historical lookups by date are supported via `getPrice(provider, model, { asOf: '2025-01-15' })`.

### Deprecation Status

Models are deprecated when providers announce end-of-life. The registry tracks this with a `deprecated` boolean and an optional `deprecatedDate` and `successor` field pointing to the replacement model. Deprecated models remain in the registry (their pricing is still needed for historical cost attribution) but are flagged so consumers can warn users or plan migrations.

---

## 5. Registry Data Schema

### Top-Level Structure

The registry is a single JSON object with the following shape:

```typescript
interface PriceRegistry {
  /** Schema version for forward compatibility. */
  schemaVersion: '1.0.0';

  /** ISO 8601 timestamp of when this registry was last updated. */
  lastUpdated: string;

  /** The npm package version that contains this data. */
  packageVersion: string;

  /** Map of provider ID to provider data. */
  providers: Record<string, ProviderData>;
}
```

### Provider Data

```typescript
interface ProviderData {
  /** Human-readable provider name. */
  displayName: string;

  /** Provider's pricing page URL for manual verification. */
  pricingUrl: string;

  /** Map of canonical model ID to model pricing data. */
  models: Record<string, ModelPriceData>;

  /** Map of alias model ID to canonical model ID. */
  aliases: Record<string, string>;
}
```

### Model Price Data

```typescript
interface ModelPriceData {
  /** Canonical model identifier. */
  modelId: string;

  /** Human-readable model name for display. */
  displayName: string;

  /** Price per 1 million input tokens, in USD. */
  inputPerMTok: number;

  /** Price per 1 million output tokens, in USD. */
  outputPerMTok: number;

  /** Price per 1 million cached input tokens, in USD. Undefined if caching is not supported. */
  cachedInputPerMTok?: number;

  /** Maximum context window size in tokens. */
  contextWindow: number;

  /** Maximum output tokens per request. Undefined if not constrained or not documented. */
  maxOutputTokens?: number;

  /** ISO 8601 date when this pricing became effective. */
  effectiveDate: string;

  /** Whether this model is deprecated. */
  deprecated: boolean;

  /** ISO 8601 date when this model was deprecated. Undefined if not deprecated. */
  deprecatedDate?: string;

  /** Canonical model ID of the suggested successor. Undefined if not deprecated or no successor. */
  successor?: string;

  /** ISO 8601 date when this model was released/launched. */
  launchDate?: string;

  /** Pricing tiers for long-context requests. */
  tiers?: PricingTier[];

  /** Model category for filtering. */
  category: ModelCategory;
}

interface PricingTier {
  /** Minimum input token count for this tier to apply. */
  minInputTokens: number;

  /** Input price per million tokens at this tier. */
  inputPerMTok: number;

  /** Output price per million tokens at this tier. */
  outputPerMTok: number;
}

type ModelCategory =
  | 'flagship'      // Highest-capability model (GPT-4o, Claude Opus, Gemini Pro)
  | 'balanced'      // Mid-tier model (Claude Sonnet, Gemini Flash)
  | 'fast'          // Low-cost, high-speed model (GPT-4o-mini, Claude Haiku)
  | 'reasoning'     // Reasoning/chain-of-thought model (o3, o4-mini)
  | 'code'          // Code-specialized model (Codestral)
  | 'embedding'     // Embedding model (text-embedding-3-small)
  | 'legacy';       // Older model still available but superseded
```

---

## 6. Complete Provider and Model Catalog

The following catalog represents pricing data as of March 2026. All prices are in USD per million tokens. The registry is updated weekly; the values below are a snapshot.

### OpenAI

| Model ID | Display Name | Input/MTok | Output/MTok | Cached Input/MTok | Context | Category |
|---|---|---|---|---|---|---|
| `gpt-4o` | GPT-4o | $2.50 | $10.00 | $1.25 | 128K | flagship |
| `gpt-4o-mini` | GPT-4o mini | $0.15 | $0.60 | $0.075 | 128K | fast |
| `gpt-4.1` | GPT-4.1 | $2.00 | $8.00 | $1.00 | 1M | flagship |
| `gpt-4.1-mini` | GPT-4.1 mini | $0.40 | $1.60 | $0.20 | 1M | balanced |
| `gpt-4.1-nano` | GPT-4.1 nano | $0.10 | $0.40 | $0.05 | 1M | fast |
| `o3` | o3 | $2.00 | $8.00 | $1.00 | 200K | reasoning |
| `o3-mini` | o3-mini | $1.10 | $4.40 | $0.55 | 200K | reasoning |
| `o4-mini` | o4-mini | $1.10 | $4.40 | $0.55 | 200K | reasoning |
| `o1` | o1 | $15.00 | $60.00 | $7.50 | 200K | reasoning |
| `gpt-4-turbo` | GPT-4 Turbo | $10.00 | $30.00 | -- | 128K | legacy |
| `gpt-3.5-turbo` | GPT-3.5 Turbo | $0.50 | $1.50 | -- | 16K | legacy |

**Aliases**: `gpt-4o-2024-11-20` -> `gpt-4o`, `gpt-4.1-2025-04-14` -> `gpt-4.1`, `gpt-4.1-nano-2025-04-14` -> `gpt-4.1-nano`, `gpt-4.1-mini-2025-04-14` -> `gpt-4.1-mini`, `chatgpt-4o-latest` -> `gpt-4o`, `o3-2025-04-16` -> `o3`

### Anthropic

| Model ID | Display Name | Input/MTok | Output/MTok | Cached Input/MTok | Context | Category |
|---|---|---|---|---|---|---|
| `claude-opus-4` | Claude Opus 4 | $15.00 | $75.00 | $1.50 | 200K | flagship |
| `claude-sonnet-4` | Claude Sonnet 4 | $3.00 | $15.00 | $0.30 | 200K | balanced |
| `claude-sonnet-4-5` | Claude Sonnet 4.5 | $3.00 | $15.00 | $0.30 | 200K | balanced |
| `claude-haiku-3-5` | Claude Haiku 3.5 | $0.80 | $4.00 | $0.08 | 200K | fast |
| `claude-opus-3-5` | Claude Opus 3.5 | $15.00 | $75.00 | $1.50 | 200K | legacy |
| `claude-sonnet-3-5` | Claude Sonnet 3.5 | $3.00 | $15.00 | $0.30 | 200K | legacy |

**Tiers**: Claude Sonnet 4.5 and Claude Opus 4 have 2x pricing for prompts exceeding 200K input tokens (extended context): input $6.00/MTok, output $30.00/MTok for Sonnet; input $30.00/MTok, output $150.00/MTok for Opus.

**Aliases**: `claude-sonnet-4-5-20250514` -> `claude-sonnet-4-5`, `claude-3-5-haiku-20241022` -> `claude-haiku-3-5`, `claude-opus-4-20250514` -> `claude-opus-4`

### Google

| Model ID | Display Name | Input/MTok | Output/MTok | Cached Input/MTok | Context | Category |
|---|---|---|---|---|---|---|
| `gemini-2.5-pro` | Gemini 2.5 Pro | $1.25 | $10.00 | $0.3125 | 1M | flagship |
| `gemini-2.5-flash` | Gemini 2.5 Flash | $0.15 | $0.60 | $0.0375 | 1M | balanced |
| `gemini-2.0-flash` | Gemini 2.0 Flash | $0.10 | $0.40 | $0.025 | 1M | fast |
| `gemini-1.5-pro` | Gemini 1.5 Pro | $1.25 | $5.00 | $0.3125 | 2M | legacy |
| `gemini-1.5-flash` | Gemini 1.5 Flash | $0.075 | $0.30 | $0.01875 | 1M | legacy |

**Tiers**: Gemini 2.5 Pro has 2x pricing for prompts exceeding 200K input tokens: input $2.50/MTok, output $20.00/MTok. Gemini 2.5 Flash has similar long-context tiers: input $0.30/MTok, output $1.20/MTok above 200K.

**Aliases**: `gemini-2.5-pro-preview-05-06` -> `gemini-2.5-pro`, `gemini-2.5-flash-preview-04-17` -> `gemini-2.5-flash`, `gemini-2.0-flash-001` -> `gemini-2.0-flash`

**Note**: Gemini 2.0 Flash is deprecated and scheduled for shutdown on June 1, 2026. The `deprecated` flag is set to `true` with `successor: 'gemini-2.5-flash'`.

### Meta (Hosted Pricing)

Meta's Llama models are open-weight and available through multiple inference providers (Together AI, Groq, Fireworks, AWS Bedrock, etc.) at different price points. The registry records representative pricing from major hosted providers. Self-hosted Llama deployments have infrastructure costs rather than per-token pricing and are out of scope.

| Model ID | Display Name | Input/MTok | Output/MTok | Context | Category | Notes |
|---|---|---|---|---|---|---|
| `llama-4-maverick` | Llama 4 Maverick | $0.15 | $0.60 | 1M | flagship | Representative hosted pricing |
| `llama-4-scout` | Llama 4 Scout | $0.11 | $0.34 | 512K | balanced | Representative hosted pricing |
| `llama-3.3-70b` | Llama 3.3 70B | $0.18 | $0.18 | 128K | legacy | Together AI pricing |
| `llama-3.1-405b` | Llama 3.1 405B | $1.00 | $1.00 | 128K | legacy | Together AI pricing |
| `llama-3.1-8b` | Llama 3.1 8B | $0.05 | $0.05 | 128K | fast | Together AI pricing |

**Note**: Meta model pricing varies significantly by hosting provider. The prices above are representative and sourced from major providers. The `getPrice` response for Meta models includes a `hostedPricingNote` field explaining this variation.

### Mistral

| Model ID | Display Name | Input/MTok | Output/MTok | Context | Category |
|---|---|---|---|---|---|
| `mistral-large` | Mistral Large | $2.00 | $6.00 | 128K | flagship |
| `mistral-medium-3` | Mistral Medium 3 | $0.40 | $2.00 | 128K | balanced |
| `mistral-small` | Mistral Small | $0.10 | $0.30 | 128K | fast |
| `codestral` | Codestral | $0.30 | $0.90 | 256K | code |
| `mistral-nemo` | Mistral Nemo | $0.02 | $0.02 | 128K | fast |
| `pixtral-large` | Pixtral Large | $2.00 | $6.00 | 128K | flagship |

**Aliases**: `mistral-large-latest` -> `mistral-large`, `mistral-medium-latest` -> `mistral-medium-3`, `mistral-small-latest` -> `mistral-small`

### Cohere

| Model ID | Display Name | Input/MTok | Output/MTok | Context | Category |
|---|---|---|---|---|---|
| `command-r-plus` | Command R+ | $2.50 | $10.00 | 128K | flagship |
| `command-r` | Command R | $0.15 | $0.60 | 128K | balanced |
| `command-r7b` | Command R 7B | $0.0375 | $0.15 | 128K | fast |
| `command-light` | Command Light | $0.30 | $0.60 | 4K | legacy |
| `embed-english-v3` | Embed English v3 | $0.10 | -- | 512 | embedding |
| `embed-multilingual-v3` | Embed Multilingual v3 | $0.10 | -- | 512 | embedding |
| `rerank-english-v3` | Rerank English v3 | $2.00 | -- | 4K | embedding |

**Aliases**: `command-r-plus-08-2024` -> `command-r-plus`, `command-r-08-2024` -> `command-r`

---

## 7. API Surface

### Installation

```bash
npm install model-price-registry
```

No peer dependencies. No runtime dependencies.

### `getPrice`

The primary lookup function. Returns pricing data for a specific provider and model.

```typescript
import { getPrice } from 'model-price-registry';

const price = getPrice('openai', 'gpt-4o');
// {
//   provider: 'openai',
//   modelId: 'gpt-4o',
//   displayName: 'GPT-4o',
//   inputPerMTok: 2.50,
//   outputPerMTok: 10.00,
//   cachedInputPerMTok: 1.25,
//   contextWindow: 128000,
//   category: 'flagship',
//   effectiveDate: '2025-03-01',
//   deprecated: false
// }
```

**Signature:**

```typescript
function getPrice(
  provider: string,
  model: string,
  options?: GetPriceOptions,
): PriceEntry | undefined;

interface GetPriceOptions {
  /**
   * Return pricing as of this date (ISO 8601 date string).
   * Useful for historical cost attribution.
   * Default: returns the most recent pricing.
   */
  asOf?: string;
}

interface PriceEntry {
  /** Provider identifier. */
  provider: string;

  /** Canonical model identifier. */
  modelId: string;

  /** Human-readable model name. */
  displayName: string;

  /** Price per 1 million input tokens, in USD. */
  inputPerMTok: number;

  /** Price per 1 million output tokens, in USD. */
  outputPerMTok: number;

  /** Price per 1 million cached input tokens, in USD. Undefined if not supported. */
  cachedInputPerMTok?: number;

  /** Maximum context window in tokens. */
  contextWindow: number;

  /** Maximum output tokens per request. Undefined if not constrained. */
  maxOutputTokens?: number;

  /** ISO 8601 date when this pricing became effective. */
  effectiveDate: string;

  /** Whether this model is deprecated. */
  deprecated: boolean;

  /** ISO 8601 deprecation date. */
  deprecatedDate?: string;

  /** Canonical model ID of the suggested successor. */
  successor?: string;

  /** Model category. */
  category: ModelCategory;

  /** Long-context pricing tiers, if applicable. */
  tiers?: PricingTier[];
}
```

**Behavior:**

- Provider and model strings are normalized to lowercase before lookup.
- If the model string matches an alias, it is resolved to the canonical model ID.
- If the provider or model is not found, returns `undefined`. Does not throw.
- If `asOf` is provided, returns the pricing entry whose `effectiveDate` is the most recent date on or before `asOf`. If no entry exists before that date, returns `undefined`.

### `estimateCost`

Calculates the estimated cost in USD for a given number of input and output tokens.

```typescript
import { estimateCost } from 'model-price-registry';

const cost = estimateCost('anthropic', 'claude-sonnet-4-5', {
  inputTokens: 50_000,
  outputTokens: 2_000,
});
// {
//   provider: 'anthropic',
//   modelId: 'claude-sonnet-4-5',
//   inputCost: 0.15,
//   outputCost: 0.03,
//   totalCost: 0.18,
//   inputTokens: 50000,
//   outputTokens: 2000,
//   currency: 'USD'
// }
```

**Signature:**

```typescript
function estimateCost(
  provider: string,
  model: string,
  usage: TokenUsage,
): CostEstimate | undefined;

interface TokenUsage {
  /** Number of input tokens consumed. */
  inputTokens: number;

  /** Number of output tokens consumed. */
  outputTokens: number;

  /** Number of cached input tokens, if applicable. */
  cachedInputTokens?: number;
}

interface CostEstimate {
  /** Provider identifier. */
  provider: string;

  /** Canonical model identifier. */
  modelId: string;

  /** Cost of input tokens in USD. */
  inputCost: number;

  /** Cost of output tokens in USD. */
  outputCost: number;

  /** Cost of cached input tokens in USD. 0 if not applicable. */
  cachedInputCost: number;

  /** Total cost: inputCost + outputCost + cachedInputCost, in USD. */
  totalCost: number;

  /** Input tokens used in the calculation. */
  inputTokens: number;

  /** Output tokens used in the calculation. */
  outputTokens: number;

  /** Cached input tokens used in the calculation. */
  cachedInputTokens: number;

  /** Currency code. Always 'USD'. */
  currency: 'USD';
}
```

**Behavior:**

- Looks up the pricing using `getPrice(provider, model)`.
- If the model is not found, returns `undefined`.
- Cost calculation: `inputCost = inputTokens / 1_000_000 * inputPerMTok`. Same formula for output and cached input.
- If `cachedInputTokens` is provided but the model does not support cached input pricing, those tokens are billed at the full input rate.
- Costs are rounded to 6 decimal places to avoid floating-point noise.
- If the model has pricing tiers and `inputTokens` exceeds a tier threshold, the tiered rate is used for the entire input (not split between tiers), matching how providers bill.

### `listProviders`

Returns all provider IDs in the registry.

```typescript
import { listProviders } from 'model-price-registry';

const providers = listProviders();
// ['openai', 'anthropic', 'google', 'meta', 'mistral', 'cohere']
```

**Signature:**

```typescript
function listProviders(): string[];
```

### `listModels`

Returns model IDs, optionally filtered by provider and/or category.

```typescript
import { listModels } from 'model-price-registry';

// All models across all providers
const all = listModels();
// ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', ... ]

// Models for a specific provider
const openai = listModels({ provider: 'openai' });
// ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'o3', 'o3-mini', 'o4-mini', 'o1', 'gpt-4-turbo', 'gpt-3.5-turbo']

// Models by category
const reasoning = listModels({ category: 'reasoning' });
// ['o3', 'o3-mini', 'o4-mini', 'o1']

// Exclude deprecated models
const current = listModels({ provider: 'google', includeDeprecated: false });
```

**Signature:**

```typescript
function listModels(options?: ListModelsOptions): ModelSummary[];

interface ListModelsOptions {
  /** Filter by provider ID. */
  provider?: string;

  /** Filter by model category. */
  category?: ModelCategory;

  /** Include deprecated models. Default: true. */
  includeDeprecated?: boolean;

  /** Sort order. Default: 'name'. */
  sortBy?: 'name' | 'inputPrice' | 'outputPrice' | 'contextWindow';
}

interface ModelSummary {
  /** Provider identifier. */
  provider: string;

  /** Canonical model identifier. */
  modelId: string;

  /** Human-readable model name. */
  displayName: string;

  /** Input price per million tokens. */
  inputPerMTok: number;

  /** Output price per million tokens. */
  outputPerMTok: number;

  /** Context window in tokens. */
  contextWindow: number;

  /** Model category. */
  category: ModelCategory;

  /** Whether the model is deprecated. */
  deprecated: boolean;
}
```

### `getModelInfo`

Returns full model metadata, a superset of `PriceEntry` with additional fields.

```typescript
import { getModelInfo } from 'model-price-registry';

const info = getModelInfo('openai', 'gpt-4.1');
// {
//   provider: 'openai',
//   modelId: 'gpt-4.1',
//   displayName: 'GPT-4.1',
//   inputPerMTok: 2.00,
//   outputPerMTok: 8.00,
//   cachedInputPerMTok: 1.00,
//   contextWindow: 1000000,
//   maxOutputTokens: 32768,
//   effectiveDate: '2025-04-14',
//   launchDate: '2025-04-14',
//   deprecated: false,
//   category: 'flagship',
//   aliases: ['gpt-4.1-2025-04-14'],
//   tiers: []
// }
```

**Signature:**

```typescript
function getModelInfo(
  provider: string,
  model: string,
): ModelInfo | undefined;

interface ModelInfo extends PriceEntry {
  /** All known aliases for this model. */
  aliases: string[];

  /** ISO 8601 launch date. */
  launchDate?: string;
}
```

### `resolveModel`

Resolves a model alias to its canonical model ID within a provider.

```typescript
import { resolveModel } from 'model-price-registry';

const canonical = resolveModel('openai', 'chatgpt-4o-latest');
// 'gpt-4o'

const unknown = resolveModel('openai', 'nonexistent-model');
// undefined
```

**Signature:**

```typescript
function resolveModel(
  provider: string,
  modelOrAlias: string,
): string | undefined;
```

### `registry`

Direct access to the raw registry data object. For consumers who want to iterate over the full dataset, build custom indexes, or serialize the data for use in non-JavaScript environments.

```typescript
import { registry } from 'model-price-registry';

// registry is a typed PriceRegistry object
console.log(registry.lastUpdated);             // '2026-03-19T00:00:00Z'
console.log(registry.schemaVersion);           // '1.0.0'
console.log(Object.keys(registry.providers));  // ['openai', 'anthropic', ...]
```

**Signature:**

```typescript
const registry: PriceRegistry;
```

The `registry` export is a frozen (`Object.freeze`) copy of the parsed JSON data. Mutations are not reflected and do not affect other consumers.

### `getRegistryMetadata`

Returns metadata about the registry itself.

```typescript
import { getRegistryMetadata } from 'model-price-registry';

const meta = getRegistryMetadata();
// {
//   schemaVersion: '1.0.0',
//   lastUpdated: '2026-03-19T00:00:00Z',
//   packageVersion: '1.2.3',
//   providerCount: 6,
//   modelCount: 42,
//   oldestEffectiveDate: '2024-01-01',
//   newestEffectiveDate: '2026-03-15'
// }
```

**Signature:**

```typescript
function getRegistryMetadata(): RegistryMetadata;

interface RegistryMetadata {
  schemaVersion: string;
  lastUpdated: string;
  packageVersion: string;
  providerCount: number;
  modelCount: number;
  oldestEffectiveDate: string;
  newestEffectiveDate: string;
}
```

### Type Exports

All interfaces, types, and enums are exported for TypeScript consumers:

```typescript
export type {
  PriceRegistry,
  ProviderData,
  ModelPriceData,
  PriceEntry,
  PricingTier,
  ModelCategory,
  GetPriceOptions,
  TokenUsage,
  CostEstimate,
  ListModelsOptions,
  ModelSummary,
  ModelInfo,
  RegistryMetadata,
};
```

---

## 8. Data Freshness and Update Workflow

### The Staleness Problem

LLM pricing changes frequently. In 2025 alone: OpenAI launched GPT-4.1 (April), o3 (April), and o4-mini (April) with new pricing; Anthropic released Claude 4.5 with a 67% price reduction; Google launched Gemini 2.5 Pro and Flash with new pricing tiers; Mistral launched Medium 3 at significantly lower pricing. An npm package with pricing data baked in at publish time becomes stale within weeks if not updated.

Existing packages like `llm-cost` demonstrate this problem: last published over two years ago, it contains pricing for models that have been deprecated and lacks all models released since late 2023. Any package in this space must solve the update problem or it will suffer the same fate.

### Update Strategy

`model-price-registry` uses a three-pronged update strategy:

1. **Automated weekly CI scan**: A GitHub Actions workflow runs every Monday at 00:00 UTC. It fetches the pricing pages of all supported providers, parses the pricing data, compares it to the current registry, and opens a PR if any prices have changed or new models have been added. The workflow uses structured scraping of provider API documentation pages (not marketing pages, which change format frequently). A maintainer reviews and merges the PR.

2. **Community PRs**: The registry JSON file (`src/data/registry.json`) is human-readable and easy to edit. Community contributors can submit PRs to add new models, update pricing, or flag deprecations. The PR template includes a checklist requiring a source URL for every pricing change.

3. **Maintainer manual updates**: For provider pricing changes announced via blog posts or API changelogs, a maintainer updates the registry and publishes a new version within 48 hours. The `lastUpdated` field in the registry and the CHANGELOG document when each update occurred and what changed.

### Version Bumping

Every registry data update bumps the patch version (e.g., `1.2.3` -> `1.2.4`). Schema changes bump the minor version. Breaking API changes bump the major version. Consumers who pin to `^1.0.0` automatically receive data updates without code changes.

### Update Verification

The CI workflow includes verification steps:

1. **Schema validation**: The updated `registry.json` is validated against the JSON schema (`src/data/registry.schema.json`) to ensure structural correctness.
2. **Price sanity checks**: Automated checks verify that no input price exceeds $100/MTok, no output price is lower than the input price for the same model (with exceptions for embedding models), and no context window exceeds 10M tokens.
3. **Regression checks**: The diff is checked to ensure no existing model was accidentally removed.
4. **Alias resolution**: All aliases are verified to point to existing canonical model IDs.

### Data Sourcing

Pricing data is sourced from official provider documentation:

| Provider | Source URL |
|---|---|
| OpenAI | `https://openai.com/api/pricing/` |
| Anthropic | `https://docs.anthropic.com/en/docs/about-claude/models` |
| Google | `https://ai.google.dev/gemini-api/docs/pricing` |
| Meta | `https://ai.meta.com/llama/` (via hosted providers) |
| Mistral | `https://mistral.ai/pricing` |
| Cohere | `https://cohere.com/pricing` |

Each `ModelPriceData` entry in the registry includes no inline source URL, but the `ProviderData.pricingUrl` field points to the provider's pricing page for manual verification. The Git commit message for each data update includes source URLs for traceability.

---

## 9. Pricing Calculation Helpers

### Cost Formula

The core cost formula used by `estimateCost` is:

```
inputCost  = inputTokens  / 1_000_000 * inputPerMTok
outputCost = outputTokens / 1_000_000 * outputPerMTok
cachedCost = cachedInputTokens / 1_000_000 * (cachedInputPerMTok ?? inputPerMTok)
totalCost  = inputCost + outputCost + cachedCost
```

All costs are in USD. Results are rounded to 6 decimal places using `Math.round(value * 1_000_000) / 1_000_000` to avoid floating-point artifacts like `0.10000000000000001`.

### Unit Conventions

The entire registry uses **per million tokens (per MTok)** as the unit for pricing. This matches the industry-standard convention used by OpenAI, Anthropic, Google, and most providers. Some older resources use per-1K-token pricing; conversion is: `perMTok = per1KTok * 1000`.

The `estimateCost` function accepts raw token counts (not thousands or millions) and handles the division internally. This avoids off-by-1000 errors that occur when callers must remember to convert between units.

### Tiered Pricing

For models with long-context pricing tiers (e.g., Gemini 2.5 Pro charges 2x above 200K input tokens), `estimateCost` applies the tiered rate when the total `inputTokens` exceeds the tier threshold. The tiered rate applies to the entire input, not just the tokens above the threshold -- this matches how Google and Anthropic actually bill.

```typescript
const cost = estimateCost('google', 'gemini-2.5-pro', {
  inputTokens: 300_000,  // exceeds 200K threshold
  outputTokens: 1_000,
});
// inputCost uses tiered rate: 300_000 / 1_000_000 * 2.50 = $0.75
// (not $1.25/MTok base rate)
```

### Batch Estimation

For estimating costs across multiple requests, callers can use `estimateCost` in a loop or reduce:

```typescript
import { estimateCost } from 'model-price-registry';

const requests = [
  { provider: 'openai', model: 'gpt-4o', inputTokens: 1000, outputTokens: 500 },
  { provider: 'anthropic', model: 'claude-sonnet-4-5', inputTokens: 2000, outputTokens: 800 },
];

const totalCost = requests.reduce((sum, req) => {
  const est = estimateCost(req.provider, req.model, {
    inputTokens: req.inputTokens,
    outputTokens: req.outputTokens,
  });
  return sum + (est?.totalCost ?? 0);
}, 0);
```

No dedicated batch function is provided because the per-call overhead of `estimateCost` is a single object property lookup and two multiplications -- negligible even for millions of calls.

---

## 10. Configuration

### No Configuration Required

`model-price-registry` has no configuration. The registry data is bundled in the package and loaded at import time. There are no environment variables, config files, API keys, or initialization steps. Import and call.

```typescript
import { getPrice } from 'model-price-registry';
const price = getPrice('openai', 'gpt-4o');
// Works immediately. No setup.
```

### Custom Registry Data (Advanced)

For consumers who want to override or extend the bundled registry (e.g., adding internal models, adjusting prices for enterprise discounts, or adding providers not covered by the built-in data), the `createRegistry` function accepts a custom data object:

```typescript
import { createRegistry } from 'model-price-registry';

const custom = createRegistry({
  // Start with the built-in data
  ...require('model-price-registry/data/registry.json'),
  // Add a custom provider
  providers: {
    ...require('model-price-registry/data/registry.json').providers,
    'internal': {
      displayName: 'Internal LLM',
      pricingUrl: 'https://internal.example.com/pricing',
      models: {
        'internal-v1': {
          modelId: 'internal-v1',
          displayName: 'Internal Model v1',
          inputPerMTok: 0.50,
          outputPerMTok: 2.00,
          contextWindow: 32000,
          effectiveDate: '2026-01-01',
          deprecated: false,
          category: 'balanced',
        },
      },
      aliases: {},
    },
  },
});

const price = custom.getPrice('internal', 'internal-v1');
```

**Signature:**

```typescript
function createRegistry(data: PriceRegistry): RegistryInstance;

interface RegistryInstance {
  getPrice(provider: string, model: string, options?: GetPriceOptions): PriceEntry | undefined;
  estimateCost(provider: string, model: string, usage: TokenUsage): CostEstimate | undefined;
  listProviders(): string[];
  listModels(options?: ListModelsOptions): ModelSummary[];
  getModelInfo(provider: string, model: string): ModelInfo | undefined;
  resolveModel(provider: string, modelOrAlias: string): string | undefined;
  getRegistryMetadata(): RegistryMetadata;
  readonly registry: PriceRegistry;
}
```

The top-level exports (`getPrice`, `estimateCost`, etc.) are methods on a default `RegistryInstance` created from the bundled data. `createRegistry` creates an additional instance from custom data.

---

## 11. CLI Design

### Installation and Invocation

```bash
# Global install
npm install -g model-price-registry
model-price-registry price openai gpt-4o

# npx (no install)
npx model-price-registry price anthropic claude-sonnet-4-5

# Package script
# package.json: { "scripts": { "prices": "model-price-registry list" } }
npm run prices
```

### CLI Binary Name

`model-price-registry`

### Commands

#### `model-price-registry price <provider> <model>`

Looks up pricing for a specific model.

```
$ model-price-registry price openai gpt-4o

  model-price-registry v1.2.3

  Provider:  OpenAI
  Model:     GPT-4o (gpt-4o)
  Category:  flagship

  Input:     $2.50 / 1M tokens
  Output:    $10.00 / 1M tokens
  Cached:    $1.25 / 1M tokens
  Context:   128,000 tokens

  Effective: 2025-03-01
  Status:    active
```

**Flags:**

```
  --format <format>   Output format: human (default) | json
```

#### `model-price-registry estimate <provider> <model>`

Estimates cost for a given token usage.

```
$ model-price-registry estimate openai gpt-4o --input 50000 --output 2000

  model-price-registry v1.2.3

  Provider:  OpenAI
  Model:     GPT-4o (gpt-4o)

  Input:     50,000 tokens × $2.50/MTok  = $0.125000
  Output:    2,000 tokens  × $10.00/MTok = $0.020000
  ─────────────────────────────────────────────────
  Total:     $0.145000

```

**Flags:**

```
  --input <n>         Number of input tokens (required)
  --output <n>        Number of output tokens (required)
  --cached <n>        Number of cached input tokens (default: 0)
  --format <format>   Output format: human (default) | json
```

#### `model-price-registry list`

Lists all models or models for a specific provider.

```
$ model-price-registry list --provider openai

  model-price-registry v1.2.3

  OpenAI Models:

  Model             Category    Input/MTok   Output/MTok   Context
  ────────────────  ──────────  ──────────   ───────────   ───────
  GPT-4o            flagship    $2.50        $10.00        128K
  GPT-4o mini       fast        $0.15        $0.60         128K
  GPT-4.1           flagship    $2.00        $8.00         1M
  GPT-4.1 mini      balanced    $0.40        $1.60         1M
  GPT-4.1 nano      fast        $0.10        $0.40         1M
  o3                reasoning   $2.00        $8.00         200K
  o3-mini           reasoning   $1.10        $4.40         200K
  o4-mini           reasoning   $1.10        $4.40         200K
  o1                reasoning   $15.00       $60.00        200K
  GPT-4 Turbo       legacy      $10.00       $30.00        128K
  GPT-3.5 Turbo     legacy      $0.50        $1.50         16K

  11 models
```

**Flags:**

```
  --provider <id>        Filter by provider
  --category <cat>       Filter by category (flagship, balanced, fast, reasoning, code, embedding, legacy)
  --no-deprecated        Exclude deprecated models
  --sort <field>         Sort by: name, inputPrice, outputPrice, contextWindow (default: name)
  --format <format>      Output format: human (default) | json
```

#### `model-price-registry providers`

Lists all providers.

```
$ model-price-registry providers

  model-price-registry v1.2.3

  Provider     Display Name     Models   Pricing URL
  ──────────   ──────────────   ──────   ───────────────────────────────────
  openai       OpenAI           11       https://openai.com/api/pricing/
  anthropic    Anthropic        6        https://docs.anthropic.com/...
  google       Google           5        https://ai.google.dev/...
  meta         Meta             5        https://ai.meta.com/llama/
  mistral      Mistral AI       6        https://mistral.ai/pricing
  cohere       Cohere           7        https://cohere.com/pricing

  6 providers, 40 models
```

#### `model-price-registry info`

Prints registry metadata.

```
$ model-price-registry info

  model-price-registry v1.2.3

  Schema version:     1.0.0
  Last updated:       2026-03-19T00:00:00Z
  Providers:          6
  Models:             40
  Oldest effective:   2024-01-01
  Newest effective:   2026-03-15
```

### Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success. |
| `1` | Model or provider not found. |
| `2` | Configuration error (invalid flags, missing required arguments). |

### Environment Variables

CLI flags can be set via environment variables. Explicit flags override environment variables.

| Environment Variable | CLI Flag |
|---|---|
| `MODEL_PRICE_REGISTRY_FORMAT` | `--format` |

---

## 12. Integration with Monorepo Packages

### Integration with `prompt-price`

`prompt-price` (this monorepo) estimates the cost of a prompt before sending it. It tokenizes the prompt text and multiplies by the per-token price. `model-price-registry` provides the pricing data:

```typescript
import { getPrice } from 'model-price-registry';
import { countTokens } from 'prompt-price';

const price = getPrice('openai', 'gpt-4o');
const tokens = countTokens(promptText);
const cost = tokens / 1_000_000 * price.inputPerMTok;
```

### Integration with `llm-cost-per-test`

`llm-cost-per-test` (this monorepo) tracks the cost of each test case that makes LLM API calls. After a test run, it aggregates token usage per model and converts to dollar amounts using `model-price-registry`:

```typescript
import { estimateCost } from 'model-price-registry';

function reportTestCost(testName: string, usage: { provider: string; model: string; inputTokens: number; outputTokens: number }) {
  const cost = estimateCost(usage.provider, usage.model, {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
  });
  console.log(`${testName}: $${cost?.totalCost.toFixed(4)}`);
}
```

### Integration with `ai-chargeback`

`ai-chargeback` (this monorepo) attributes LLM API costs to internal cost centers (teams, projects, features). It reads usage logs, looks up per-model pricing from `model-price-registry`, and produces chargeback reports:

```typescript
import { estimateCost } from 'model-price-registry';

for (const logEntry of usageLogs) {
  const cost = estimateCost(logEntry.provider, logEntry.model, {
    inputTokens: logEntry.inputTokens,
    outputTokens: logEntry.outputTokens,
  });
  chargebackReport.addEntry(logEntry.costCenter, cost?.totalCost ?? 0);
}
```

### Integration with `ai-spend-forecast`

`ai-spend-forecast` (this monorepo) projects future LLM spend based on historical usage trends. It uses `model-price-registry` for current pricing and can detect pricing changes between registry versions to adjust forecasts:

```typescript
import { getPrice, getRegistryMetadata } from 'model-price-registry';

const currentPrice = getPrice('openai', 'gpt-4o');
const meta = getRegistryMetadata();
console.log(`Forecasting with pricing from ${meta.lastUpdated}`);
```

### Integration with `ai-cost-compare`

`ai-cost-compare` (this monorepo) compares the cost of running the same workload across different models and providers. It uses `listModels` to discover available models and `estimateCost` to compare costs:

```typescript
import { listModels, estimateCost } from 'model-price-registry';

const flagships = listModels({ category: 'flagship', includeDeprecated: false });
const costs = flagships.map(m => ({
  model: `${m.provider}/${m.modelId}`,
  cost: estimateCost(m.provider, m.modelId, { inputTokens: 100_000, outputTokens: 5_000 })?.totalCost,
}));
costs.sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));
```

### Integration with `tool-cost-estimator`

`tool-cost-estimator` (this monorepo) estimates the cost of tool-augmented LLM workflows where a single user request triggers multiple LLM calls (e.g., planning, tool calls, summarization). It uses `model-price-registry` to price each step in the chain.

### Integration with `context-budget`

`context-budget` (this monorepo) manages context window budgets to avoid exceeding model limits. It uses `getModelInfo` to retrieve context window sizes and price-per-token information to co-optimize for both context limits and cost.

---

## 13. Testing Strategy

### Unit Tests

Unit tests cover the API functions against the bundled registry data.

**`getPrice` tests:**
- Returns a valid `PriceEntry` for every model in every provider.
- Returns `undefined` for an unknown provider.
- Returns `undefined` for an unknown model.
- Resolves aliases to canonical model IDs (e.g., `getPrice('openai', 'chatgpt-4o-latest')` returns the same entry as `getPrice('openai', 'gpt-4o')`).
- Provider and model strings are case-insensitive (`getPrice('OpenAI', 'GPT-4o')` works).
- The `asOf` option returns pricing valid at the specified date.
- The `asOf` option returns `undefined` for a date before the model's earliest pricing.

**`estimateCost` tests:**
- Returns correct cost for a known model with known token counts.
- Handles zero input tokens (output-only cost).
- Handles zero output tokens (input-only cost).
- Handles cached input tokens when the model supports them.
- Falls back to full input rate when cached input pricing is not available.
- Returns `undefined` for unknown models.
- Rounds to 6 decimal places (no floating-point noise).
- Applies tiered pricing when input tokens exceed the tier threshold.
- Does not apply tiered pricing when input tokens are below the threshold.

**`listProviders` tests:**
- Returns an array of all provider IDs.
- Array is non-empty.
- All returned IDs are valid strings.

**`listModels` tests:**
- Returns all models when called with no options.
- Filters by provider correctly.
- Filters by category correctly.
- `includeDeprecated: false` excludes deprecated models.
- Sorting by `inputPrice` returns models in ascending price order.
- Returns an empty array for an unknown provider.

**`getModelInfo` tests:**
- Returns `ModelInfo` with `aliases` array for models that have aliases.
- Returns `undefined` for unknown models.

**`resolveModel` tests:**
- Resolves known aliases to canonical model IDs.
- Returns the canonical model ID if the input is already canonical.
- Returns `undefined` for unknown aliases.

**`createRegistry` tests:**
- Creates a working `RegistryInstance` from custom data.
- Custom data does not affect the default global registry.

### Data Validation Tests

Tests that validate the integrity of the bundled `registry.json`:

- Every `ModelPriceData` entry has all required fields.
- `inputPerMTok` and `outputPerMTok` are non-negative numbers.
- `contextWindow` is a positive integer.
- `effectiveDate` is a valid ISO 8601 date string.
- `deprecated` is a boolean.
- If `deprecated` is `true`, `deprecatedDate` is a valid date string.
- If `successor` is set, it references a valid model ID within the same provider.
- All aliases point to existing canonical model IDs.
- No duplicate aliases within a provider.
- No canonical model ID appears as an alias.
- `schemaVersion` follows semver format.
- `lastUpdated` is a valid ISO 8601 timestamp.
- `category` is a valid `ModelCategory` value.
- No `inputPerMTok` exceeds $200 (sanity check against data entry errors).
- Pricing tiers have `minInputTokens` in ascending order.

### Snapshot Tests

A snapshot test captures the full output of `listModels()` and compares it against a known-good snapshot. When registry data is updated, the snapshot is updated in the same PR. This catches accidental model removals or field changes.

### CLI Tests

- `model-price-registry price openai gpt-4o` exits with code 0 and outputs pricing.
- `model-price-registry price unknown-provider unknown-model` exits with code 1.
- `model-price-registry estimate openai gpt-4o --input 1000 --output 500` outputs a cost estimate.
- `model-price-registry list --provider openai` lists OpenAI models.
- `model-price-registry list --format json` outputs valid JSON.
- `model-price-registry providers` lists all providers.
- `model-price-registry info` outputs registry metadata.
- `--help` and `--version` flags work correctly.

### Test Framework

Tests use Vitest, matching the project's existing configuration.

---

## 14. Performance

### Lookup Latency

`getPrice` performs two property lookups on a JavaScript object: `providers[provider].models[model]` (or `providers[provider].aliases[model]` then a second lookup on the canonical ID). This takes under 0.001ms -- effectively instantaneous. No network calls, no file I/O, no parsing at lookup time.

### Import/Load Time

The registry JSON is loaded at import time via a `require()` call. The JSON file size is approximately 30-50 KB (covering ~60 models across 6 providers). Parsing takes under 1ms on modern hardware. The parsed data is cached in the module system -- subsequent imports reuse the same parsed object.

### Memory Footprint

The in-memory registry is approximately 100-200 KB including the parsed JSON object and the string keys. This is negligible for any Node.js process.

### Cost Estimation Throughput

`estimateCost` performs one `getPrice` lookup (two object property accesses) and three multiplications. On a modern machine, it can process over 10 million cost estimates per second. There is no performance reason to batch or optimize further.

### JSON File Size Management

As more models and providers are added, the registry JSON grows. At the current scale (60 models, 6 providers), the file is under 50 KB. At 500 models and 20 providers, it would be approximately 400 KB -- still manageable. If the file exceeds 1 MB in the future, compression or lazy loading can be considered, but this is not expected within the foreseeable future.

---

## 15. Dependencies

### Runtime Dependencies

None. Zero runtime dependencies.

The package consists of:
1. A JSON data file (`src/data/registry.json`).
2. Pure TypeScript functions that read from the parsed JSON object.
3. Node.js built-in `util.parseArgs` for CLI argument parsing (Node.js 18+).

No HTTP client, no caching library, no utility library. The package is self-contained.

### Dev Dependencies

| Dependency | Purpose |
|---|---|
| `typescript` | TypeScript compiler. |
| `vitest` | Test runner. |
| `eslint` | Linter. |

---

## 16. File Structure

```
model-price-registry/
├── src/
│   ├── index.ts                  # Public API exports
│   ├── registry.ts               # RegistryInstance class, createRegistry factory
│   ├── types.ts                  # All TypeScript interfaces and types
│   ├── lookup.ts                 # getPrice, resolveModel, getModelInfo implementations
│   ├── estimate.ts               # estimateCost implementation
│   ├── list.ts                   # listProviders, listModels implementations
│   ├── metadata.ts               # getRegistryMetadata implementation
│   ├── cli.ts                    # CLI entry point, argument parsing, output formatting
│   ├── data/
│   │   ├── registry.json         # The pricing data (source of truth)
│   │   └── registry.schema.json  # JSON Schema for validation
│   └── __tests__/
│       ├── getPrice.test.ts      # getPrice unit tests
│       ├── estimateCost.test.ts  # estimateCost unit tests
│       ├── listModels.test.ts    # listModels and listProviders tests
│       ├── resolveModel.test.ts  # Alias resolution tests
│       ├── registry.test.ts      # Data validation tests
│       ├── cli.test.ts           # CLI integration tests
│       └── snapshot.test.ts      # Snapshot tests for registry data
├── package.json
├── tsconfig.json
└── SPEC.md
```

The `src/data/registry.json` file is the single source of truth for all pricing data. All API functions read from this file (parsed at import time). Updates to pricing data are made by editing this file, running the validation tests, and publishing a new version.

---

## 17. Roadmap

The following features are explicitly out of scope for v1 but may be added in later versions.

### Pricing History API

A `getPriceHistory(provider, model)` function that returns an array of all historical pricing entries for a model, sorted by effective date. This enables cost trend analysis and visualization of pricing changes over time.

### Batch Pricing API

A `getPriceBatch(queries)` function that accepts an array of `{ provider, model }` queries and returns pricing for all of them in a single call. While the current per-call overhead is negligible, a batch API provides a cleaner interface for bulk lookups.

### Image and Audio Pricing

Some models (GPT-4o, Gemini) support image and audio inputs at different pricing rates. v1 covers text token pricing only. Future versions may add `imageInputPerImage`, `audioInputPerSecond`, and related fields.

### Provider-Specific Discount Modeling

Modeling batch API discounts (OpenAI and Anthropic offer 50% off for batch processing), committed use discounts, and volume tiers. v1 provides base pricing only; actual costs with discounts depend on account-level configurations that the registry cannot know.

### Real-Time Price Fetching

An optional `fetchLatestPrices()` function that queries provider pricing APIs at runtime to get the absolute latest pricing, bypassing the bundled data. This would be opt-in and require network access.

### OpenRouter and Aggregator Support

Adding pricing from LLM API aggregators like OpenRouter, which offers access to multiple providers through a single API with their own pricing structure (often with a markup).

### Embedding Model Coverage Expansion

Expanding coverage of embedding models beyond Cohere to include OpenAI embedding models (`text-embedding-3-small`, `text-embedding-3-large`), Google embedding models, and others. v1 includes embedding pricing where the provider bundles it alongside LLM pricing.

---

## 18. Examples

### Example: Quick Price Lookup

```typescript
import { getPrice } from 'model-price-registry';

const price = getPrice('openai', 'gpt-4o');
if (price) {
  console.log(`${price.displayName}: $${price.inputPerMTok}/MTok input, $${price.outputPerMTok}/MTok output`);
} else {
  console.log('Model not found');
}
```

### Example: Cost Estimation for a Chat Request

```typescript
import { estimateCost } from 'model-price-registry';

// A typical chat request: 2000-token prompt, 500-token response
const cost = estimateCost('anthropic', 'claude-sonnet-4-5', {
  inputTokens: 2_000,
  outputTokens: 500,
});

if (cost) {
  console.log(`Estimated cost: $${cost.totalCost.toFixed(6)}`);
  // Estimated cost: $0.013500
}
```

### Example: Comparing Costs Across Providers

```typescript
import { listModels, estimateCost } from 'model-price-registry';

const usage = { inputTokens: 100_000, outputTokens: 5_000 };
const models = listModels({ category: 'flagship', includeDeprecated: false });

console.log('Flagship model cost comparison (100K in, 5K out):');
for (const model of models) {
  const cost = estimateCost(model.provider, model.modelId, usage);
  if (cost) {
    console.log(`  ${model.provider}/${model.modelId}: $${cost.totalCost.toFixed(4)}`);
  }
}
// Output:
//   openai/gpt-4o: $0.3000
//   openai/gpt-4.1: $0.2400
//   anthropic/claude-opus-4: $1.8750
//   google/gemini-2.5-pro: $0.1750
//   mistral/mistral-large: $0.2300
//   cohere/command-r-plus: $0.3000
```

### Example: Budget-Aware Model Routing

```typescript
import { estimateCost, getPrice } from 'model-price-registry';

function selectModel(inputTokens: number, outputTokens: number, maxCostUsd: number): string {
  const candidates = [
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'openai', model: 'gpt-4o-mini' },
    { provider: 'anthropic', model: 'claude-sonnet-4-5' },
    { provider: 'anthropic', model: 'claude-haiku-3-5' },
  ];

  // Pick the most capable model that fits the budget
  for (const c of candidates) {
    const cost = estimateCost(c.provider, c.model, { inputTokens, outputTokens });
    if (cost && cost.totalCost <= maxCostUsd) {
      return `${c.provider}/${c.model}`;
    }
  }

  return 'budget-exceeded';
}

const model = selectModel(50_000, 2_000, 0.10);
console.log(`Selected: ${model}`);
```

### Example: Detecting Deprecated Models

```typescript
import { getPrice } from 'model-price-registry';

const modelsInUse = [
  { provider: 'openai', model: 'gpt-4-turbo' },
  { provider: 'google', model: 'gemini-2.0-flash' },
  { provider: 'openai', model: 'gpt-4o' },
];

for (const m of modelsInUse) {
  const price = getPrice(m.provider, m.model);
  if (price?.deprecated) {
    console.warn(
      `WARNING: ${m.provider}/${m.model} is deprecated` +
      (price.successor ? `. Migrate to ${price.successor}.` : '.'),
    );
  }
}
```

### Example: CLI Usage

```bash
# Look up a model's pricing
$ npx model-price-registry price anthropic claude-sonnet-4-5

# Estimate cost for a request
$ npx model-price-registry estimate openai gpt-4o --input 100000 --output 5000

# List all fast/cheap models as JSON
$ npx model-price-registry list --category fast --format json

# List all non-deprecated models sorted by input price
$ npx model-price-registry list --no-deprecated --sort inputPrice
```

### Example: Using Raw Registry Data

```typescript
import { registry } from 'model-price-registry';

// Iterate all providers and models
for (const [providerId, provider] of Object.entries(registry.providers)) {
  for (const [modelId, model] of Object.entries(provider.models)) {
    console.log(`${providerId}/${modelId}: $${model.inputPerMTok}/$${model.outputPerMTok}`);
  }
}

// Export as JSON for a non-JavaScript consumer
import fs from 'node:fs';
fs.writeFileSync('prices.json', JSON.stringify(registry, null, 2));
```
