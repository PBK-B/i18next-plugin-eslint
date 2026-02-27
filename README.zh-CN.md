# @i18next-plugin/eslint

[![npm version](https://img.shields.io/npm/v/@i18next-plugin/eslint.svg)](https://www.npmjs.com/package/@i18next-plugin/eslint) [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

i18next key 规范与 JSX 硬编码文案检查 ESLint 插件。

[English README](./README.md)

[贡献指南（英文）](./CONTRIBUTING.md)

## 功能概览

- 约束 i18n key 规范：
    - `invalid-char`
    - `invalid-structure`
    - `invalid-segment`
    - `invalid-prefix`
    - `invalid-layer`
    - `duplicate-suffix`
    - `require-default-value`
- 检测 JSX 中硬编码自然语言文本：
    - `no-literal-string`
- 校验默认文案中的插值参数与 options 是否一致：
    - `interpolation-params`
- 当默认文案使用字符串拼接时，提示改用插值：
    - `prefer-interpolation`

支持识别的调用方式：

- `t('...')`
- `const { t } = useTranslation(); t('...')`
- `obj.t('...')`

## 安装

```bash
npm i -D @i18next-plugin/eslint
```

## 快速接入（Flat Config）

```js
import i18nKeyPlugin, { createI18nRulesConfig, createI18nLintRulesConfig } from '@i18next-plugin/eslint';

const i18nRuleOptions = {
	allowedPrefixes: ['lzc_dev_center', 'lzc_site', 'lzc_as', 'lzc_plg'],
	sourceRoot: 'src',
	sharedLayers: ['common'],
	defaultValuePolicy: 'required',
	checkInterpolationParams: true,

	// no-literal-string 可选项
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

			// 单条规则覆盖示例
			'i18n-key/invalid-layer': ['warn', i18nRuleOptions],
			'i18n-key/require-default-value': ['error', { ...i18nRuleOptions, defaultValuePolicy: 'forbidden' }],
		},
	},
];
```

## 内置预设

- `i18nKeyPlugin.configs.recommended`：i18n key 规则 `error`，文本规则 `warn`
- `i18nKeyPlugin.configs.strict`：全部规则 `error`
- `i18nKeyPlugin.configs.relaxed`：全部规则 `warn`

## 配置项

```ts
type I18nRuleOptions = {
	allowedPrefixes?: string[] | null;
	sourceRoot?: string;
	sharedLayers?: string[];
	defaultValuePolicy?: 'required' | 'forbidden';
	requireDefaultValue?: boolean;
	checkInterpolationParams?: boolean;
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

默认行为：

- `allowedPrefixes`: `undefined`（不启用 prefix 白名单限制）
- `sourceRoot`: `''`（基于 `process.cwd()` 推导 layer）
- `sharedLayers`: `[]`
- `defaultValuePolicy`: `required`
- `checkInterpolationParams`: `true`

说明：

- 同时配置 `defaultValuePolicy` 与 `requireDefaultValue` 时，以 `defaultValuePolicy` 为准。
- `allowedPrefixes` 必须是非空数组时，`invalid-prefix` 才会生效。
- `sourceRoot: ''` 或 `'.'` 表示以项目根目录作为 layer 计算基准。
- `autoFix` 仅影响 `no-literal-string` 的自动修复开关。
- `disabledRules` 目前用于 schema/types 兼容。

## 规则列表

### Key 规则

- `i18n-key/invalid-char`（可自动修复）
- `i18n-key/invalid-structure`（不可自动修复）
- `i18n-key/invalid-segment`（可自动修复）
- `i18n-key/invalid-prefix`（可自动修复）
- `i18n-key/invalid-layer`（可自动修复）
- `i18n-key/duplicate-suffix`（可自动修复）
- `i18n-key/require-default-value`（不可自动修复）

### 文本规则

- `i18n-key/no-literal-string`（可自动修复）
- `i18n-key/interpolation-params`（不可自动修复）
- `i18n-key/prefer-interpolation`（不可自动修复）

## 自动修复

执行：

```bash
npm run lint -- --fix
```

如需同时生成构建产物和类型声明：

```bash
npm run build
```

## 修复前后对比

### `i18n-key/invalid-char`

校验 key 仅包含小写字母、数字、下划线和点。（可自动修复）

```ts
// 修复前
t('lzc_dev_center.pages.main.Title@Name');
// 修复后
t('lzc_dev_center.pages.main.title_name');
```

### `i18n-key/invalid-structure`

校验 key 至少包含 3 段，格式为 `${prefix}.${layer}.${suffix}`。（不可自动修复）

```ts
// 修复前
t('just_one_segment');
// 建议修复后
t('lzc_dev_center.pages.main.just_one_segment');
```

### `i18n-key/invalid-segment`

校验每一段都符合小写 snake_case，且不能数字开头。（可自动修复）

```ts
// 修复前
t('lzc_dev_center.pages.Main.UserProfile');
// 修复后
t('lzc_dev_center.pages.main.user_profile');
```

### `i18n-key/invalid-prefix`

在启用 `allowedPrefixes` 时，校验 key 首段必须命中白名单。（可自动修复）

```ts
// 修复前
t('demo.pages.main.submit');
// 修复后（假设 allowedPrefixes[0] = lzc_dev_center）
t('lzc_dev_center.pages.main.submit');
```

### `i18n-key/invalid-layer`

校验 key 的 layer 部分与当前文件路径一致。（可自动修复）

```ts
// 文件：src/pages/main/index.tsx
// 修复前
t('lzc_dev_center.pages.other.submit');
// 修复后
t('lzc_dev_center.pages.main.index.submit');
```

### `i18n-key/duplicate-suffix`

校验同一文件内 suffix 唯一，避免重复。（可自动修复）

```ts
// 修复前
t('lzc_dev_center.pages.main.index.submit');
t('lzc_dev_center.pages.main.dialog.submit');
// 修复后
t('lzc_dev_center.pages.main.index.submit');
t('lzc_dev_center.pages.main.dialog.submit_2');
```

### `i18n-key/require-default-value`

按策略约束 `t()` 是否必须携带默认文案（`required` / `forbidden`）。（不可自动修复）

```ts
// policy = required
// 修复前
t('lzc_dev_center.pages.main.index.submit');
// 建议修复后
t('lzc_dev_center.pages.main.index.submit', '提交');
```

```ts
// policy = forbidden
// 修复前
t('lzc_dev_center.pages.main.index.submit', '提交');
// 建议修复后
t('lzc_dev_center.pages.main.index.submit');
```

### `i18n-key/no-literal-string`

检测 JSX 文本和属性中的硬编码自然语言文案。（可自动修复）

```tsx
// 修复前（JSX 文本）
<p>欢迎使用</p>
// 修复后
<p>{t('lzc_dev_center.pages.main.index.literal_huan_ying_shi_yong', '欢迎使用')}</p>
```

```tsx
// 修复前（JSX 属性）
<img alt="应用图标" />
// 修复后
<img alt={t('lzc_dev_center.pages.main.index.literal_ying_yong_tu_biao', '应用图标')} />
```

### `i18n-key/interpolation-params`

校验默认文案中的插值参数与 options 参数名一致。（不可自动修复）

```ts
// 修复前
t('lzc_dev_center.pages.main.total', '{{count}} items', { total: 3 });
// 建议修复后
t('lzc_dev_center.pages.main.total', '{{count}} items', { count: 3 });
```

### `i18n-key/prefer-interpolation`

当默认文案通过字符串拼接构造时给出提示，建议改为插值占位符。（不可自动修复）

```ts
// 修复前
t('lzc_dev_center.pages.main.total', '总数：' + count);
// 建议修复后
t('lzc_dev_center.pages.main.total', '总数：{{count}}', { count });
```

## 导出内容

默认导出：

- `rules`
- `configs.recommended`
- `configs.strict`
- `configs.relaxed`

命名导出：

- `createI18nRulesConfig(level, options)`
- `createI18nLintRulesConfig(level, options)`

## License

[MIT License](LICENSE)
