# @i18next-plugin/eslint

[![npm version](https://img.shields.io/npm/v/@i18next-plugin/eslint.svg)](https://www.npmjs.com/package/@i18next-plugin/eslint) [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

ESLint plugin for i18next key quality and JSX literal-text checks.

[中文文档](./README.zh-CN.md)

[Contributing Guide](./CONTRIBUTING.md)

## Features

- Enforces i18n key quality:
    - `invalid-char`
    - `invalid-structure`
    - `invalid-segment`
    - `invalid-prefix`
    - `invalid-layer`
    - `duplicate-suffix`
    - `require-default-value`
- Detects hardcoded natural-language text in JSX:
    - `no-literal-string`
- Validates interpolation placeholders between default text and options:
    - `interpolation-params`
- Suggests interpolation when default text uses string concatenation:
    - `prefer-interpolation`

Supported call styles:

- `t('...')`
- `const { t } = useTranslation(); t('...')`
- `obj.t('...')`

## Installation

```bash
npm i -D @i18next-plugin/eslint
```

## Quick Start (Flat Config)

```js
import i18nKeyPlugin, { createI18nRulesConfig, createI18nLintRulesConfig } from '@i18next-plugin/eslint';

const i18nRuleOptions = {
	allowedPrefixes: ['lzc_dev_center', 'lzc_site', 'lzc_as', 'lzc_plg'],
	sourceRoot: 'src',
	sharedLayers: ['common'],
	defaultValuePolicy: 'required',
	checkInterpolationParams: true,
	ignoredOptionKeys: ['customMeta'],

	// no-literal-string options
	autoFix: true,
	fixPrefix: 'lzc_dev_center',
	i18nImportSource: '@/i18n',
};

export default [
	{
		plugins: {
			'i18n-key': i18nKeyPlugin,
		},
		rules: {
			...i18nKeyPlugin.configs.recommended.rules,
			...createI18nRulesConfig('error', i18nRuleOptions),
			...createI18nLintRulesConfig('warn', i18nRuleOptions),

			// per-rule override example
			'i18n-key/invalid-layer': ['warn', i18nRuleOptions],
			'i18n-key/require-default-value': ['error', { ...i18nRuleOptions, defaultValuePolicy: 'forbidden' }],
		},
	},
];
```

## Built-in Presets

- `i18nKeyPlugin.configs.recommended`: i18n rules as `error`, lint rules as `warn`
- `i18nKeyPlugin.configs.strict`: all rules as `error`
- `i18nKeyPlugin.configs.relaxed`: all rules as `warn`

## Configuration Options

```ts
type I18nRuleOptions = {
	allowedPrefixes?: string[] | null;
	sourceRoot?: string;
	sharedLayers?: string[];
	defaultValuePolicy?: 'required' | 'forbidden';
	requireDefaultValue?: boolean;
	checkInterpolationParams?: boolean;
	ignoredOptionKeys?: string[];
	disabledRules?: Array<'invalid-char' | 'invalid-structure' | 'invalid-segment' | 'invalid-prefix' | 'invalid-layer' | 'duplicate-suffix' | 'require-default-value'>;
};

type I18nLintRuleOptions = I18nRuleOptions & {
	acceptedTags?: string[];
	acceptedAttributes?: string[];
	ignoredTags?: string[];
	ignoredAttributes?: string[];
	autoFix?: boolean;
	fixPrefix?: string;
	i18nImportSource?: string;
};
```

Default behavior:

- `allowedPrefixes`: `undefined` (no prefix allow-list enforcement)
- `sourceRoot`: `''` (resolve layer from `process.cwd()`)
- `sharedLayers`: `[]`
- `defaultValuePolicy`: `required`
- `checkInterpolationParams`: `true`
- `ignoredOptionKeys`: `['defaultValue', 'ns', 'count', 'context', 'ordinal', 'returnObjects', 'returnDetails', 'joinArrays', 'postProcess', 'fallbackLng', 'lng', 'lngs', 'keySeparator', 'nsSeparator', 'interpolation', 'skipInterpolation', 'compatibilityJSON', 'defaultVariables', 'replace']`

Notes:

- If both `defaultValuePolicy` and `requireDefaultValue` are provided, `defaultValuePolicy` wins.
- `invalid-prefix` is only effective when `allowedPrefixes` is a non-empty array.
- `sourceRoot: ''` or `'.'` means using project root as layer base.
- `autoFix` only controls auto-fix for `no-literal-string`.
- `disabledRules` is accepted by schema/types for compatibility.

## Rule List

### Key Rules

- `i18n-key/invalid-char` (fixable)
- `i18n-key/invalid-structure` (not fixable)
- `i18n-key/invalid-segment` (fixable)
- `i18n-key/invalid-prefix` (fixable)
- `i18n-key/invalid-layer` (fixable)
- `i18n-key/duplicate-suffix` (fixable)
- `i18n-key/require-default-value` (not fixable)

### Text Rules

- `i18n-key/no-literal-string` (fixable)
- `i18n-key/interpolation-params` (not fixable)
- `i18n-key/prefer-interpolation` (not fixable)

## Auto Fix

Run:

```bash
npm run lint -- --fix
```

Also build output and type declarations:

```bash
npm run build
```

## Fix Comparison

### `i18n-key/invalid-char`

Ensures keys only use lowercase letters, numbers, underscores, and dots. (fixable)

```ts
// before
t('lzc_dev_center.pages.main.Title@Name');
// after
t('lzc_dev_center.pages.main.title_name');
```

### `i18n-key/invalid-structure`

Ensures a key has at least 3 segments: `${prefix}.${layer}.${suffix}`. (not fixable)

```ts
// before
t('just_one_segment');
// suggested
t('lzc_dev_center.pages.main.just_one_segment');
```

### `i18n-key/invalid-segment`

Ensures each segment is lowercase snake_case and does not start with a number. (fixable)

```ts
// before
t('lzc_dev_center.pages.Main.UserProfile');
// after
t('lzc_dev_center.pages.main.user_profile');
```

### `i18n-key/invalid-prefix`

Ensures the first segment is in `allowedPrefixes` when allow-list is enabled. (fixable)

```ts
// before
t('demo.pages.main.submit');
// after (assuming allowedPrefixes[0] = lzc_dev_center)
t('lzc_dev_center.pages.main.submit');
```

### `i18n-key/invalid-layer`

Ensures the layer part matches the current file path. (fixable)

```ts
// file: src/pages/main/index.tsx
// before
t('lzc_dev_center.pages.other.submit');
// after
t('lzc_dev_center.pages.main.index.submit');
```

### `i18n-key/duplicate-suffix`

Ensures suffix values are unique within the same file. (fixable)

```ts
// before
t('lzc_dev_center.pages.main.index.submit');
t('lzc_dev_center.pages.main.dialog.submit');
// after
t('lzc_dev_center.pages.main.index.submit');
t('lzc_dev_center.pages.main.dialog.submit_2');
```

### `i18n-key/require-default-value`

Enforces default text policy for `t()` calls (`required` or `forbidden`). (not fixable)

```ts
// policy = required
// before
t('lzc_dev_center.pages.main.index.submit');
// suggested
t('lzc_dev_center.pages.main.index.submit', 'Submit');
```

```ts
// policy = forbidden
// before
t('lzc_dev_center.pages.main.index.submit', 'Submit');
// suggested
t('lzc_dev_center.pages.main.index.submit');
```

### `i18n-key/no-literal-string`

Detects hardcoded natural-language text in JSX text/attributes. (fixable)

```tsx
// before (JSX text)
<p>Welcome</p>
// after
<p>{t('lzc_dev_center.pages.main.index.literal_welcome', 'Welcome')}</p>
```

```tsx
// before (JSX attribute)
<img alt="App Icon" />
// after
<img alt={t('lzc_dev_center.pages.main.index.literal_app_icon', 'App Icon')} />
```

### `i18n-key/interpolation-params`

Checks that interpolation placeholders in default text match option keys. (not fixable)

Default `ignoredOptionKeys`:

- `defaultValue`, `ns`, `count`, `context`, `ordinal`, `returnObjects`, `returnDetails`, `joinArrays`, `postProcess`, `fallbackLng`, `lng`, `lngs`, `keySeparator`, `nsSeparator`, `interpolation`, `skipInterpolation`, `compatibilityJSON`, `defaultVariables`, `replace`

You can extend this list with rule option `ignoredOptionKeys`.

```ts
// before
t('lzc_dev_center.pages.main.total', '{{count}} items', { total: 3 });
// suggested
t('lzc_dev_center.pages.main.total', '{{count}} items', { count: 3 });
```

```ts
// custom ignore keys
/* eslint i18n-key/interpolation-params: ["warn", { ignoredOptionKeys: ["customMeta"] }] */
t('lzc_dev_center.pages.main.total', '{{count}} items', { count: 3, customMeta: 'x' });
```

### `i18n-key/prefer-interpolation`

Warns when default text is built by string concatenation and recommends interpolation placeholders instead. (not fixable)

```ts
// before
t('lzc_dev_center.pages.main.total', 'Total: ' + count);
// suggested
t('lzc_dev_center.pages.main.total', 'Total: {{count}}', { count });
```

## Exports

Default export:

- `rules`
- `configs.recommended`
- `configs.strict`
- `configs.relaxed`

Named exports:

- `createI18nRulesConfig(level, options)`
- `createI18nLintRulesConfig(level, options)`

## License

[MIT License](LICENSE)
