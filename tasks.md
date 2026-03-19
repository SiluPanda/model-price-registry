# model-price-registry -- Task Breakdown

## Phase 1: Project Scaffolding and Configuration

- [ ] **Install dev dependencies** -- Add `typescript`, `vitest`, and `eslint` as devDependencies in `package.json`. Run `npm install` to generate `node_modules` and `package-lock.json`. | Status: not_done
- [ ] **Configure package.json bin field** -- Add `"bin": { "model-price-registry": "dist/cli.js" }` to `package.json` so the CLI is available after global install or via npx. | Status: not_done
- [ ] **Update package.json files array** -- Ensure the `"files"` field includes `"dist"` so that compiled output and the bundled registry JSON are included in the published package. Verify `src/data/registry.json` ends up in `dist/data/registry.json` after build. | Status: not_done
- [ ] **Update tsconfig.json for JSON imports** -- Confirm `"resolveJsonModule": true` is set (already present). Ensure `src/data/` directory contents are included in the build output by verifying the `include` and `rootDir` settings. | Status: not_done
- [ ] **Create directory structure** -- Create `src/data/`, and `src/__tests__/` directories to match the spec's file structure. | Status: not_done
- [ ] **Add ESLint configuration** -- Create a minimal ESLint config (e.g., `.eslintrc.json` or `eslint.config.js`) for TypeScript linting. Match monorepo conventions if they exist. | Status: not_done
- [ ] **Add Vitest configuration** -- Create `vitest.config.ts` or configure Vitest in `package.json` if not already set up. Ensure it discovers `src/__tests__/*.test.ts` files. | Status: not_done

## Phase 2: TypeScript Types and Interfaces

- [ ] **Create `src/types.ts` with `ModelCategory` type** -- Define the `ModelCategory` union type: `'flagship' | 'balanced' | 'fast' | 'reasoning' | 'code' | 'embedding' | 'legacy'`. | Status: not_done
- [ ] **Create `PricingTier` interface** -- Define `PricingTier` with fields `minInputTokens: number`, `inputPerMTok: number`, `outputPerMTok: number`. | Status: not_done
- [ ] **Create `ModelPriceData` interface** -- Define all fields: `modelId`, `displayName`, `inputPerMTok`, `outputPerMTok`, `cachedInputPerMTok?`, `contextWindow`, `maxOutputTokens?`, `effectiveDate`, `deprecated`, `deprecatedDate?`, `successor?`, `launchDate?`, `tiers?`, `category`. | Status: not_done
- [ ] **Create `ProviderData` interface** -- Define with fields: `displayName`, `pricingUrl`, `models: Record<string, ModelPriceData>`, `aliases: Record<string, string>`. | Status: not_done
- [ ] **Create `PriceRegistry` interface** -- Define top-level structure: `schemaVersion`, `lastUpdated`, `packageVersion`, `providers: Record<string, ProviderData>`. | Status: not_done
- [ ] **Create `PriceEntry` interface** -- Define the return type of `getPrice`: `provider`, `modelId`, `displayName`, `inputPerMTok`, `outputPerMTok`, `cachedInputPerMTok?`, `contextWindow`, `maxOutputTokens?`, `effectiveDate`, `deprecated`, `deprecatedDate?`, `successor?`, `category`, `tiers?`. | Status: not_done
- [ ] **Create `GetPriceOptions` interface** -- Define with optional `asOf?: string` field. | Status: not_done
- [ ] **Create `TokenUsage` interface** -- Define with `inputTokens: number`, `outputTokens: number`, `cachedInputTokens?: number`. | Status: not_done
- [ ] **Create `CostEstimate` interface** -- Define with `provider`, `modelId`, `inputCost`, `outputCost`, `cachedInputCost`, `totalCost`, `inputTokens`, `outputTokens`, `cachedInputTokens`, `currency: 'USD'`. | Status: not_done
- [ ] **Create `ListModelsOptions` interface** -- Define with optional `provider?`, `category?`, `includeDeprecated?` (default true), `sortBy?: 'name' | 'inputPrice' | 'outputPrice' | 'contextWindow'`. | Status: not_done
- [ ] **Create `ModelSummary` interface** -- Define with `provider`, `modelId`, `displayName`, `inputPerMTok`, `outputPerMTok`, `contextWindow`, `category`, `deprecated`. | Status: not_done
- [ ] **Create `ModelInfo` interface extending `PriceEntry`** -- Add `aliases: string[]` and `launchDate?: string`. | Status: not_done
- [ ] **Create `RegistryMetadata` interface** -- Define with `schemaVersion`, `lastUpdated`, `packageVersion`, `providerCount`, `modelCount`, `oldestEffectiveDate`, `newestEffectiveDate`. | Status: not_done
- [ ] **Create `RegistryInstance` interface** -- Define the interface with method signatures: `getPrice`, `estimateCost`, `listProviders`, `listModels`, `getModelInfo`, `resolveModel`, `getRegistryMetadata`, `readonly registry`. | Status: not_done
- [ ] **Export all types from `src/types.ts`** -- Ensure all interfaces and types are exported for TypeScript consumers. | Status: not_done

## Phase 3: Registry Data File

- [ ] **Create `src/data/registry.json` with schema metadata** -- Set `schemaVersion: "1.0.0"`, `lastUpdated` to current ISO 8601 timestamp, `packageVersion` matching `package.json` version. Initialize empty `providers` object. | Status: not_done
- [ ] **Add OpenAI provider data** -- Add all 11 OpenAI models (gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, o3, o3-mini, o4-mini, o1, gpt-4-turbo, gpt-3.5-turbo) with correct pricing, context windows, categories, and effective dates. Include `cachedInputPerMTok` where applicable. Set `displayName` and `pricingUrl`. | Status: not_done
- [ ] **Add OpenAI aliases** -- Map `gpt-4o-2024-11-20` -> `gpt-4o`, `gpt-4.1-2025-04-14` -> `gpt-4.1`, `gpt-4.1-nano-2025-04-14` -> `gpt-4.1-nano`, `gpt-4.1-mini-2025-04-14` -> `gpt-4.1-mini`, `chatgpt-4o-latest` -> `gpt-4o`, `o3-2025-04-16` -> `o3`. | Status: not_done
- [ ] **Add Anthropic provider data** -- Add all 6 Anthropic models (claude-opus-4, claude-sonnet-4, claude-sonnet-4-5, claude-haiku-3-5, claude-opus-3-5, claude-sonnet-3-5) with correct pricing, context windows, categories, and cached input pricing. | Status: not_done
- [ ] **Add Anthropic pricing tiers** -- Add 2x long-context pricing tiers for claude-sonnet-4-5 (input $6.00, output $30.00 above 200K) and claude-opus-4 (input $30.00, output $150.00 above 200K). Set `minInputTokens: 200000` for each tier. | Status: not_done
- [ ] **Add Anthropic aliases** -- Map `claude-sonnet-4-5-20250514` -> `claude-sonnet-4-5`, `claude-3-5-haiku-20241022` -> `claude-haiku-3-5`, `claude-opus-4-20250514` -> `claude-opus-4`. | Status: not_done
- [ ] **Add Google provider data** -- Add all 5 Google models (gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash) with correct pricing, context windows, categories, and cached input pricing. Mark gemini-2.0-flash as deprecated with `successor: 'gemini-2.5-flash'` and a `deprecatedDate`. | Status: not_done
- [ ] **Add Google pricing tiers** -- Add 2x long-context pricing tiers for gemini-2.5-pro (input $2.50, output $20.00 above 200K) and gemini-2.5-flash (input $0.30, output $1.20 above 200K). | Status: not_done
- [ ] **Add Google aliases** -- Map `gemini-2.5-pro-preview-05-06` -> `gemini-2.5-pro`, `gemini-2.5-flash-preview-04-17` -> `gemini-2.5-flash`, `gemini-2.0-flash-001` -> `gemini-2.0-flash`. | Status: not_done
- [ ] **Add Meta provider data** -- Add all 5 Meta models (llama-4-maverick, llama-4-scout, llama-3.3-70b, llama-3.1-405b, llama-3.1-8b) with representative hosted pricing. No cached input pricing. Include context windows and categories per spec. | Status: not_done
- [ ] **Add Mistral provider data** -- Add all 6 Mistral models (mistral-large, mistral-medium-3, mistral-small, codestral, mistral-nemo, pixtral-large) with correct pricing, context windows, and categories. | Status: not_done
- [ ] **Add Mistral aliases** -- Map `mistral-large-latest` -> `mistral-large`, `mistral-medium-latest` -> `mistral-medium-3`, `mistral-small-latest` -> `mistral-small`. | Status: not_done
- [ ] **Add Cohere provider data** -- Add all 7 Cohere models (command-r-plus, command-r, command-r7b, command-light, embed-english-v3, embed-multilingual-v3, rerank-english-v3) with correct pricing. Handle embedding models that have no `outputPerMTok` (set to 0 or omit per implementation). | Status: not_done
- [ ] **Add Cohere aliases** -- Map `command-r-plus-08-2024` -> `command-r-plus`, `command-r-08-2024` -> `command-r`. | Status: not_done
- [ ] **Create `src/data/registry.schema.json`** -- Write a JSON Schema that validates the structure of `registry.json`, including required fields, types, enum constraints for `ModelCategory`, and format constraints for date strings. | Status: not_done

## Phase 4: Core API Implementation

### 4a: Registry Instance and Data Loading

- [ ] **Create `src/registry.ts` with data loading** -- Implement loading of `src/data/registry.json` at import time via `require()`. Freeze the parsed data with `Object.freeze` (deep freeze the registry object). | Status: not_done
- [ ] **Implement `createRegistry` factory function** -- Accept a `PriceRegistry` data object and return a `RegistryInstance` with all API methods bound to that data. This enables custom registry instances. | Status: not_done
- [ ] **Implement default registry instance** -- Create a default `RegistryInstance` from the bundled `registry.json` data. Export its methods as the top-level API. | Status: not_done

### 4b: Lookup Functions

- [ ] **Create `src/lookup.ts` with `resolveModel`** -- Implement alias resolution: given a provider and model string, check if it exists as a canonical model ID; if not, check the provider's aliases map and return the canonical ID. Normalize input to lowercase. Return `undefined` if not found. | Status: not_done
- [ ] **Implement `getPrice` in `src/lookup.ts`** -- Look up a provider and model, resolve aliases, construct and return a `PriceEntry` object. Normalize provider and model to lowercase. Return `undefined` if provider or model not found. | Status: not_done
- [ ] **Implement `asOf` option in `getPrice`** -- When `options.asOf` is provided, return the pricing entry whose `effectiveDate` is the most recent date on or before `asOf`. Return `undefined` if no entry exists before that date. (Note: v1 registry has one entry per model; this lays groundwork for future historical data.) | Status: not_done
- [ ] **Implement `getModelInfo` in `src/lookup.ts`** -- Return a `ModelInfo` object (extends `PriceEntry`) with the `aliases` array populated by reverse-looking up the provider's alias map, plus the `launchDate` field. | Status: not_done

### 4c: Cost Estimation

- [ ] **Create `src/estimate.ts` with `estimateCost`** -- Implement cost calculation: look up pricing via `getPrice`, compute `inputCost`, `outputCost`, `cachedInputCost`, and `totalCost`. Return `undefined` if model not found. | Status: not_done
- [ ] **Implement tiered pricing in `estimateCost`** -- When the model has `tiers` and `inputTokens` exceeds a tier's `minInputTokens`, use the highest applicable tier's pricing for the entire input (not split billing). | Status: not_done
- [ ] **Implement cached input token fallback** -- When `cachedInputTokens` is provided but the model has no `cachedInputPerMTok`, bill cached tokens at the full input rate. | Status: not_done
- [ ] **Implement 6-decimal-place rounding** -- Round all cost values using `Math.round(value * 1_000_000) / 1_000_000` to avoid floating-point artifacts. | Status: not_done

### 4d: List Functions

- [ ] **Create `src/list.ts` with `listProviders`** -- Return an array of all provider ID strings from the registry. | Status: not_done
- [ ] **Implement `listModels` in `src/list.ts`** -- Return `ModelSummary[]` for all models. Support filtering by `provider`, `category`, and `includeDeprecated` (default `true`). | Status: not_done
- [ ] **Implement sorting in `listModels`** -- Support `sortBy` option: `'name'` (alphabetical by modelId, default), `'inputPrice'` (ascending), `'outputPrice'` (ascending), `'contextWindow'` (ascending). | Status: not_done
- [ ] **Handle unknown provider in `listModels`** -- Return an empty array if the specified provider does not exist in the registry. | Status: not_done

### 4e: Metadata

- [ ] **Create `src/metadata.ts` with `getRegistryMetadata`** -- Compute and return `RegistryMetadata`: count providers, count total models across all providers, find oldest and newest `effectiveDate` values, include `schemaVersion`, `lastUpdated`, and `packageVersion` from the registry data. | Status: not_done

### 4f: Public Exports

- [ ] **Update `src/index.ts` with all public exports** -- Export `getPrice`, `estimateCost`, `listProviders`, `listModels`, `getModelInfo`, `resolveModel`, `getRegistryMetadata`, `createRegistry`, and `registry` (the frozen data object). Also export all type interfaces. | Status: not_done

## Phase 5: CLI Implementation

- [ ] **Create `src/cli.ts` entry point** -- Add shebang line `#!/usr/bin/env node`. Parse CLI arguments using `node:util` `parseArgs`. Route to command handlers based on first positional argument. | Status: not_done
- [ ] **Implement `price` command** -- Parse `<provider> <model>` positional args. Call `getPrice`. Print human-readable pricing output matching the spec format (Provider, Model, Category, Input, Output, Cached, Context, Effective, Status). Support `--format json` to output raw JSON. | Status: not_done
- [ ] **Implement `estimate` command** -- Parse `<provider> <model>` positional args plus `--input`, `--output`, `--cached` flags. Call `estimateCost`. Print human-readable cost breakdown matching the spec format. Support `--format json`. | Status: not_done
- [ ] **Implement `list` command** -- Support `--provider`, `--category`, `--no-deprecated`, `--sort`, `--format` flags. Call `listModels` with the appropriate options. Print a formatted table (human) or JSON array. | Status: not_done
- [ ] **Implement `providers` command** -- Call `listProviders` and for each provider, display: provider ID, display name, model count, pricing URL. Print summary line with total providers and models. Support `--format json`. | Status: not_done
- [ ] **Implement `info` command** -- Call `getRegistryMetadata`. Print schema version, last updated, provider count, model count, oldest effective date, newest effective date. Support `--format json`. | Status: not_done
- [ ] **Implement `--help` flag** -- Display usage information with available commands and flags. | Status: not_done
- [ ] **Implement `--version` flag** -- Display the package version from `package.json`. | Status: not_done
- [ ] **Implement exit codes** -- Exit 0 on success, 1 when model/provider not found, 2 on configuration errors (invalid flags, missing required args). | Status: not_done
- [ ] **Implement `MODEL_PRICE_REGISTRY_FORMAT` environment variable** -- Read `MODEL_PRICE_REGISTRY_FORMAT` env var as default for `--format`. Explicit `--format` flag overrides the env var. | Status: not_done
- [ ] **Handle version header in CLI output** -- All human-readable CLI output should include a header line like `model-price-registry v{version}` matching the spec examples. | Status: not_done
- [ ] **Format context window values for display** -- Display context windows as human-readable values: `128K`, `200K`, `1M`, `2M` etc. rather than raw numbers. | Status: not_done

## Phase 6: Unit Tests

### 6a: `getPrice` Tests

- [ ] **Test `getPrice` returns valid `PriceEntry` for every model** -- Iterate all providers and models in the registry and assert each returns a non-undefined `PriceEntry` with all required fields. | Status: not_done
- [ ] **Test `getPrice` returns `undefined` for unknown provider** -- Call `getPrice('nonexistent', 'gpt-4o')` and assert result is `undefined`. | Status: not_done
- [ ] **Test `getPrice` returns `undefined` for unknown model** -- Call `getPrice('openai', 'nonexistent-model')` and assert result is `undefined`. | Status: not_done
- [ ] **Test `getPrice` resolves aliases** -- Call `getPrice('openai', 'chatgpt-4o-latest')` and assert it returns the same entry as `getPrice('openai', 'gpt-4o')`. Test multiple aliases across providers. | Status: not_done
- [ ] **Test `getPrice` is case-insensitive** -- Call `getPrice('OpenAI', 'GPT-4o')` and assert it returns a valid entry. | Status: not_done
- [ ] **Test `getPrice` with `asOf` option** -- Call with an `asOf` date and verify correct pricing is returned. Test with a date before the model's effective date returns `undefined`. | Status: not_done
- [ ] **Test `getPrice` returns correct field values for a known model** -- Assert specific pricing values for a known model (e.g., `gpt-4o`: inputPerMTok=2.50, outputPerMTok=10.00, cachedInputPerMTok=1.25, contextWindow=128000). | Status: not_done

### 6b: `estimateCost` Tests

- [ ] **Test `estimateCost` returns correct cost for known model** -- Estimate cost for a known model with specific token counts and assert correct `inputCost`, `outputCost`, `totalCost`. | Status: not_done
- [ ] **Test `estimateCost` handles zero input tokens** -- Pass `inputTokens: 0` and assert `inputCost` is 0, `totalCost` equals `outputCost`. | Status: not_done
- [ ] **Test `estimateCost` handles zero output tokens** -- Pass `outputTokens: 0` and assert `outputCost` is 0, `totalCost` equals `inputCost`. | Status: not_done
- [ ] **Test `estimateCost` handles cached input tokens** -- Pass `cachedInputTokens` for a model that supports it and assert `cachedInputCost` uses the cached rate. | Status: not_done
- [ ] **Test `estimateCost` cached token fallback** -- Pass `cachedInputTokens` for a model without `cachedInputPerMTok` and assert cached tokens are billed at the full input rate. | Status: not_done
- [ ] **Test `estimateCost` returns `undefined` for unknown model** -- Assert result is `undefined` for a non-existent model. | Status: not_done
- [ ] **Test `estimateCost` rounds to 6 decimal places** -- Verify that results do not have floating-point noise beyond 6 decimal places. | Status: not_done
- [ ] **Test `estimateCost` applies tiered pricing above threshold** -- For gemini-2.5-pro with `inputTokens: 300000`, assert the tiered rate ($2.50/MTok) is used, not the base rate ($1.25/MTok). | Status: not_done
- [ ] **Test `estimateCost` uses base pricing below tier threshold** -- For gemini-2.5-pro with `inputTokens: 100000`, assert the base rate ($1.25/MTok) is used. | Status: not_done
- [ ] **Test `estimateCost` `currency` field is always `'USD'`** -- Assert the `currency` field on the returned `CostEstimate` is `'USD'`. | Status: not_done

### 6c: `listProviders` Tests

- [ ] **Test `listProviders` returns all provider IDs** -- Assert the returned array contains `'openai'`, `'anthropic'`, `'google'`, `'meta'`, `'mistral'`, `'cohere'`. | Status: not_done
- [ ] **Test `listProviders` returns non-empty array** -- Assert length is at least 6. | Status: not_done
- [ ] **Test `listProviders` returns strings** -- Assert every element is a string. | Status: not_done

### 6d: `listModels` Tests

- [ ] **Test `listModels` returns all models with no options** -- Assert result is a non-empty array of `ModelSummary` objects. | Status: not_done
- [ ] **Test `listModels` filters by provider** -- Call with `{ provider: 'openai' }` and assert all returned models have `provider: 'openai'`. Assert count matches expected (11 for OpenAI). | Status: not_done
- [ ] **Test `listModels` filters by category** -- Call with `{ category: 'reasoning' }` and assert all returned models have `category: 'reasoning'`. | Status: not_done
- [ ] **Test `listModels` excludes deprecated models** -- Call with `{ includeDeprecated: false }` and assert no returned model has `deprecated: true`. | Status: not_done
- [ ] **Test `listModels` sorts by inputPrice** -- Call with `{ sortBy: 'inputPrice' }` and assert models are in ascending `inputPerMTok` order. | Status: not_done
- [ ] **Test `listModels` returns empty array for unknown provider** -- Call with `{ provider: 'nonexistent' }` and assert result is `[]`. | Status: not_done
- [ ] **Test `listModels` sorts by name by default** -- Call with no `sortBy` and assert models are sorted alphabetically by `modelId`. | Status: not_done
- [ ] **Test `listModels` sorts by outputPrice** -- Call with `{ sortBy: 'outputPrice' }` and verify ascending order. | Status: not_done
- [ ] **Test `listModels` sorts by contextWindow** -- Call with `{ sortBy: 'contextWindow' }` and verify ascending order. | Status: not_done

### 6e: `getModelInfo` Tests

- [ ] **Test `getModelInfo` returns `ModelInfo` with aliases** -- Call for a model that has aliases and assert `aliases` is a non-empty array. | Status: not_done
- [ ] **Test `getModelInfo` returns `undefined` for unknown model** -- Assert result is `undefined` for a non-existent model. | Status: not_done
- [ ] **Test `getModelInfo` includes `launchDate` when available** -- Assert `launchDate` field is present for models that have it in the registry data. | Status: not_done

### 6f: `resolveModel` Tests

- [ ] **Test `resolveModel` resolves known aliases** -- Call with known alias strings and assert the canonical model ID is returned. | Status: not_done
- [ ] **Test `resolveModel` returns canonical ID for canonical input** -- Call with a canonical model ID and assert the same ID is returned. | Status: not_done
- [ ] **Test `resolveModel` returns `undefined` for unknown alias** -- Call with a non-existent model string and assert `undefined`. | Status: not_done
- [ ] **Test `resolveModel` is case-insensitive** -- Call with mixed-case input and assert correct resolution. | Status: not_done

### 6g: `createRegistry` Tests

- [ ] **Test `createRegistry` creates working instance from custom data** -- Build a minimal `PriceRegistry` object, pass to `createRegistry`, and assert `getPrice` works on the custom data. | Status: not_done
- [ ] **Test `createRegistry` custom data does not affect default registry** -- Create a custom registry instance, then call the default `getPrice` and assert it still returns bundled data. | Status: not_done

### 6h: `getRegistryMetadata` Tests

- [ ] **Test `getRegistryMetadata` returns correct structure** -- Assert returned object has all `RegistryMetadata` fields. | Status: not_done
- [ ] **Test `getRegistryMetadata` counts are accurate** -- Assert `providerCount` matches actual number of providers and `modelCount` matches actual total models. | Status: not_done

## Phase 7: Data Validation Tests

- [ ] **Test all `ModelPriceData` entries have required fields** -- Iterate every model in every provider and assert `modelId`, `displayName`, `inputPerMTok`, `outputPerMTok`, `contextWindow`, `effectiveDate`, `deprecated`, and `category` are present. | Status: not_done
- [ ] **Test `inputPerMTok` and `outputPerMTok` are non-negative** -- Assert all pricing values are >= 0 for every model. | Status: not_done
- [ ] **Test `contextWindow` is a positive integer** -- Assert `contextWindow > 0` and `Number.isInteger(contextWindow)` for every model. | Status: not_done
- [ ] **Test `effectiveDate` is valid ISO 8601** -- Assert every `effectiveDate` matches the `YYYY-MM-DD` format and parses to a valid date. | Status: not_done
- [ ] **Test `deprecated` is a boolean** -- Assert `typeof deprecated === 'boolean'` for every model. | Status: not_done
- [ ] **Test deprecated models have `deprecatedDate`** -- For every model where `deprecated === true`, assert `deprecatedDate` is a valid date string. | Status: not_done
- [ ] **Test `successor` references a valid model ID** -- For every model with a `successor` field, assert the referenced model ID exists in the same provider's models. | Status: not_done
- [ ] **Test all aliases point to existing canonical model IDs** -- For every provider, iterate all aliases and assert each value exists as a key in the provider's `models` map. | Status: not_done
- [ ] **Test no duplicate aliases within a provider** -- Assert that no two alias keys are the same within a single provider. | Status: not_done
- [ ] **Test no canonical model ID appears as an alias** -- Assert that no key in `models` also appears as a key in `aliases` for the same provider. | Status: not_done
- [ ] **Test `schemaVersion` follows semver format** -- Assert `schemaVersion` matches a semver regex pattern. | Status: not_done
- [ ] **Test `lastUpdated` is valid ISO 8601 timestamp** -- Assert `lastUpdated` parses to a valid date. | Status: not_done
- [ ] **Test `category` values are valid** -- Assert every model's `category` is one of the defined `ModelCategory` values. | Status: not_done
- [ ] **Test no `inputPerMTok` exceeds $200** -- Sanity check: assert no model's input pricing exceeds $200/MTok. | Status: not_done
- [ ] **Test pricing tiers have `minInputTokens` in ascending order** -- For models with tiers, assert the `minInputTokens` values are in strictly ascending order. | Status: not_done
- [ ] **Test embedding models handle output pricing correctly** -- Assert that embedding models (category `'embedding'`) have `outputPerMTok` of 0 or undefined, since they don't produce output tokens. | Status: not_done

## Phase 8: Snapshot Tests

- [ ] **Create snapshot test for `listModels()` output** -- Capture the full output of `listModels()` and write a snapshot test. This catches accidental model removals or field changes when registry data is updated. | Status: not_done

## Phase 9: CLI Integration Tests

- [ ] **Test `price` command with valid model** -- Run `model-price-registry price openai gpt-4o`, assert exit code 0 and output contains pricing information. | Status: not_done
- [ ] **Test `price` command with unknown provider** -- Run `model-price-registry price unknown-provider unknown-model`, assert exit code 1. | Status: not_done
- [ ] **Test `price` command with `--format json`** -- Run with `--format json` flag and assert output is valid JSON. | Status: not_done
- [ ] **Test `estimate` command** -- Run `model-price-registry estimate openai gpt-4o --input 1000 --output 500`, assert exit code 0 and output contains cost estimate. | Status: not_done
- [ ] **Test `estimate` command with `--cached` flag** -- Run with `--cached` and verify cached input cost appears in output. | Status: not_done
- [ ] **Test `estimate` command with `--format json`** -- Assert valid JSON output with all `CostEstimate` fields. | Status: not_done
- [ ] **Test `list` command with `--provider` flag** -- Run `model-price-registry list --provider openai`, assert exit code 0 and output lists OpenAI models. | Status: not_done
- [ ] **Test `list` command with `--category` flag** -- Run with `--category fast` and verify only fast-category models appear. | Status: not_done
- [ ] **Test `list` command with `--no-deprecated` flag** -- Run with `--no-deprecated` and verify no deprecated models in output. | Status: not_done
- [ ] **Test `list` command with `--sort` flag** -- Run with `--sort inputPrice` and verify models are sorted by price. | Status: not_done
- [ ] **Test `list` command with `--format json`** -- Assert valid JSON array output. | Status: not_done
- [ ] **Test `providers` command** -- Run `model-price-registry providers`, assert exit code 0 and output lists all providers. | Status: not_done
- [ ] **Test `info` command** -- Run `model-price-registry info`, assert exit code 0 and output contains registry metadata. | Status: not_done
- [ ] **Test `--help` flag** -- Run `model-price-registry --help`, assert exit code 0 and output contains usage information. | Status: not_done
- [ ] **Test `--version` flag** -- Run `model-price-registry --version`, assert exit code 0 and output matches package version. | Status: not_done
- [ ] **Test missing required arguments** -- Run `model-price-registry estimate openai gpt-4o` (missing `--input`/`--output`), assert exit code 2. | Status: not_done
- [ ] **Test `MODEL_PRICE_REGISTRY_FORMAT` env var** -- Set the env var to `json`, run a command without `--format`, and verify JSON output. | Status: not_done

## Phase 10: Edge Cases and Error Handling

- [ ] **Handle embedding models in `estimateCost`** -- Embedding models have 0 or undefined `outputPerMTok`. Ensure `estimateCost` handles this gracefully (outputCost should be 0). | Status: not_done
- [ ] **Handle negative token counts in `estimateCost`** -- Decide behavior for negative inputs. Either clamp to 0 or return undefined. Document the choice. | Status: not_done
- [ ] **Handle empty string provider/model in `getPrice`** -- Ensure `getPrice('', '')` returns `undefined` without throwing. | Status: not_done
- [ ] **Handle whitespace in provider/model strings** -- Trim whitespace from provider and model inputs before lookup. | Status: not_done
- [ ] **Ensure `registry` export is frozen** -- Verify that `Object.isFrozen(registry)` is `true`. Verify that attempts to mutate the registry do not change the data. | Status: not_done
- [ ] **Handle Cohere rerank model in cost estimation** -- Rerank models have input pricing but no output pricing. Ensure `estimateCost` returns correct costs (outputCost = 0). | Status: not_done

## Phase 11: Build and Verification

- [ ] **Verify TypeScript compilation** -- Run `npm run build` and ensure it compiles without errors. Verify `dist/` output contains all expected files including `dist/data/registry.json`. | Status: not_done
- [ ] **Verify lint passes** -- Run `npm run lint` and ensure no lint errors. | Status: not_done
- [ ] **Verify all tests pass** -- Run `npm run test` and ensure all tests pass. | Status: not_done
- [ ] **Verify CLI runs correctly after build** -- Run `node dist/cli.js price openai gpt-4o` and verify output. | Status: not_done
- [ ] **Verify package exports** -- Confirm that `require('model-price-registry')` (from the dist output) exposes all expected exports: `getPrice`, `estimateCost`, `listProviders`, `listModels`, `getModelInfo`, `resolveModel`, `getRegistryMetadata`, `createRegistry`, `registry`, and all types. | Status: not_done

## Phase 12: Documentation

- [ ] **Create README.md** -- Write a comprehensive README covering: installation, quick start, API reference (all functions with signatures and examples), CLI usage with all commands and flags, type exports, custom registry usage, and data freshness information. | Status: not_done
- [ ] **Add JSDoc comments to all exported functions** -- Ensure every exported function and type in the source files has JSDoc comments matching the spec descriptions. | Status: not_done
- [ ] **Document the `registry.json` data format** -- Include a section in the README explaining the JSON schema for consumers who want to use the raw data directly. | Status: not_done

## Phase 13: CI/CD and Publishing Preparation

- [ ] **Version bump `package.json`** -- Bump version to `1.0.0` for initial release (or `0.1.0` for pre-release, per monorepo convention). | Status: not_done
- [ ] **Verify `prepublishOnly` script** -- Confirm that `npm run build` runs automatically before `npm publish` via the `prepublishOnly` script already configured. | Status: not_done
- [ ] **Verify `"files"` field in `package.json`** -- Ensure only `dist/` is included in the published package. Verify that `dist/data/registry.json` is included. | Status: not_done
- [ ] **Add `.gitignore` entries** -- Ensure `node_modules/`, `dist/`, and `.env` are in `.gitignore`. | Status: not_done
- [ ] **Verify package installs cleanly** -- Run `npm pack` and inspect the tarball to confirm correct file inclusion. | Status: not_done
