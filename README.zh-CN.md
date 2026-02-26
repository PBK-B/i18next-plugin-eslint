<!--
 * @Author: Bin
 * @Date: 2026-02-26
 * @FilePath: /i18next-plugin-eslint/README.zh-CN.md
-->

# i18n-key ESLint 插件文档（中文）

本文档说明 `@i18next-plugin/eslint` 的规则能力、配置方式、自动修复行为与接入建议。

## 1. 目标与范围

本插件用于约束 i18n key 使用规范，覆盖以下场景：

- key 命名规范（结构、分段、前缀、路径 layer、suffix 唯一性）
- `t()` 默认值策略（必须提供 / 禁止提供）
- JSX 硬编码文案检查（含可选自动修复）
- 默认文案插值参数与 options 参数一致性检查

支持识别的调用方式：

- `t('...')`
- `const { t } = useTranslation(); t('...')`
- `obj.t('...')`

## 2. 规则总览

### 2.1 I18nRules（key 规范类）

- `i18n-key/invalid-char`：key 字符集校验（可修复）
- `i18n-key/invalid-structure`：key 至少三段结构校验（不可修复）
- `i18n-key/invalid-segment`：分段 snake_case 校验（可修复）
- `i18n-key/invalid-prefix`：prefix 白名单校验（可修复）
- `i18n-key/invalid-layer`：layer 与文件路径一致性校验（可修复）
- `i18n-key/duplicate-suffix`：同文件 suffix 唯一性校验（可修复）
- `i18n-key/require-default-value`：默认值策略校验（不可修复）

### 2.2 LintRules（代码文本类）

- `i18n-key/no-literal-string`：JSX 硬编码自然语言文案检查（可修复）
- `i18n-key/interpolation-params`：默认文案插值参数一致性检查（不可修复）

## 3. 默认行为

- `allowedPrefixes`: `undefined`
    - 不强制 prefix 白名单，允许任意 prefix。
- `sourceRoot`: `''`
    - 以项目根目录（`process.cwd()`）作为 layer 推导基准。
- `sharedLayers`: `[]`
    - 默认无 layer 豁免。
- `defaultValuePolicy`: `required`
    - 默认要求 `t()` 提供默认值。
- `checkInterpolationParams`: `true`
    - 默认开启插值参数检查。

## 4. 配置项规范

> 当前实现允许传入统一 `i18nRuleOptions`，即使包含某些规则不使用的字段，也不会报 schema 错误。

### 4.1 通用配置（推荐）

```ts
type I18nRuleOptions = {
	allowedPrefixes?: string[] | null;
	sourceRoot?: string;
	sharedLayers?: string[];
	defaultValuePolicy?: 'required' | 'forbidden';
	requireDefaultValue?: boolean;
	checkInterpolationParams?: boolean;

	acceptedTags?: string[];
	acceptedAttributes?: string[];
	ignoredTags?: string[];
	ignoredAttributes?: string[];
	autoFix?: boolean;
	fixPrefix?: string;
	i18nImportSource?: string;
};
```

### 4.2 关键字段说明

- `defaultValuePolicy` 与 `requireDefaultValue` 同时存在时，以 `defaultValuePolicy` 为准。
- `allowedPrefixes` 为 `undefined`/`null` 时，`invalid-prefix` 不生效。
- `sourceRoot` 为 `''` 或 `'.'` 时，按项目根目录推导 layer。
- `autoFix` 仅影响 `no-literal-string` 自动修复开关。

## 5. 推荐接入方式

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

			// 单条覆盖示例
			'i18n-key/invalid-layer': ['warn', i18nRuleOptions],
			'i18n-key/require-default-value': ['error', { ...i18nRuleOptions, defaultValuePolicy: 'forbidden' }],
		},
	},
];
```

## 6. 自动修复说明

执行命令：

```bash
npm run lint -- --fix
```

若需产物构建与类型声明生成：

```bash
npm run build
```

可自动修复：

- `invalid-char`
- `invalid-segment`
- `invalid-prefix`（前缀白名单启用时）
- `invalid-layer`
- `duplicate-suffix`
- `no-literal-string`

不提供自动修复：

- `invalid-structure`
- `require-default-value`
- `interpolation-params`

## 7. 每条规则修复前后对比

> 标注“无自动修复”的规则，示例为推荐人工修复写法。

### `i18n-key/invalid-char`（自动修复）

```ts
// 前
t('lzc_dev_center.pages.main.Title@Name');
// 后
t('lzc_dev_center.pages.main.title_name');
```

### `i18n-key/invalid-structure`（无自动修复）

```ts
// 前
t('just_one_segment');
// 建议后
t('lzc_dev_center.pages.main.just_one_segment');
```

### `i18n-key/invalid-segment`（自动修复）

```ts
// 前
t('lzc_dev_center.pages.Main.UserProfile');
// 后
t('lzc_dev_center.pages.main.user_profile');
```

### `i18n-key/invalid-prefix`（自动修复）

```ts
// 前
t('demo.pages.main.submit');
// 后（假设 allowedPrefixes[0] = lzc_dev_center）
t('lzc_dev_center.pages.main.submit');
```

### `i18n-key/invalid-layer`（自动修复）

```ts
// 假设文件路径：src/pages/main/index.tsx
// 前
t('lzc_dev_center.pages.other.submit');
// 后
t('lzc_dev_center.pages.main.index.submit');
```

### `i18n-key/duplicate-suffix`（自动修复）

```ts
// 前
t('lzc_dev_center.pages.main.index.submit');
t('lzc_dev_center.pages.main.dialog.submit');
// 后
t('lzc_dev_center.pages.main.index.submit');
t('lzc_dev_center.pages.main.dialog.submit_2');
```

### `i18n-key/require-default-value`（无自动修复）

```ts
// policy = required
// 前
t('lzc_dev_center.pages.main.index.submit');
// 建议后
t('lzc_dev_center.pages.main.index.submit', '提交');
```

```ts
// policy = forbidden
// 前
t('lzc_dev_center.pages.main.index.submit', '提交');
// 建议后
t('lzc_dev_center.pages.main.index.submit');
```

### `i18n-key/no-literal-string`（自动修复）

```tsx
// 前（JSX 文本）
<p>欢迎使用</p>
// 后
<p>{t('lzc_dev_center.pages.main.index.literal_huan_ying_shi_yong', '欢迎使用')}</p>
```

```tsx
// 前（JSX 属性）
<img alt="应用图标" />
// 后
<img alt={t('lzc_dev_center.pages.main.index.literal_ying_yong_tu_biao', '应用图标')} />
```

```tsx
// 前（文件中未导入 t）
export function Demo() {
	return <button title="提交">提交</button>;
}

// 后（自动补导入）
import { t } from '@/i18n';

export function Demo() {
	return <button title={t('lzc_dev_center.pages.main.index.literal_ti_jiao', '提交')}>{t('lzc_dev_center.pages.main.index.literal_ti_jiao_2', '提交')}</button>;
}
```

### `i18n-key/interpolation-params`（无自动修复）

```ts
// 前
t('lzc_dev_center.pages.main.total', '{{count}} items', { total: 3 });
// 建议后
t('lzc_dev_center.pages.main.total', '{{count}} items', { count: 3 });
```

## 8. 插件导出

默认导出：

- `rules`
- `configs.recommended`
- `configs.strict`
- `configs.relaxed`

命名导出：

- `createI18nRulesConfig(level, options)`
- `createI18nLintRulesConfig(level, options)`
