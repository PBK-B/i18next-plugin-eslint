import { describe, expect, it } from 'vitest';
import vueParser from 'vue-eslint-parser';
import { runRule } from './utils/eslint-runner';

describe('behavior rules', () => {
	it('require-default-value: required policy reports missing default', async () => {
		const res = await runRule('require-default-value', "t('app.pages.home.submit')", {
			options: { defaultValuePolicy: 'required' },
		});
		expect(res.messages).toHaveLength(1);
		expect(res.messages[0]?.messageId).toBe('missingDefaultValue');
	});

	it('require-default-value: forbidden policy reports existing default', async () => {
		const res = await runRule('require-default-value', "t('app.pages.home.submit', '提交')", {
			options: { defaultValuePolicy: 'forbidden' },
		});
		expect(res.messages).toHaveLength(1);
		expect(res.messages[0]?.messageId).toBe('forbiddenDefaultValue');
	});

	it('require-default-value: no report when default exists with required', async () => {
		const res = await runRule('require-default-value', "t('app.pages.home.submit', '提交')", {
			options: { defaultValuePolicy: 'required' },
		});
		expect(res.messages).toHaveLength(0);
	});

	it('no-literal-string fixes jsx text and inserts t import', async () => {
		const code = 'export function Demo(){return <p>欢迎使用</p>}';
		const res = await runRule('no-literal-string', code, {
			filePath: 'src/pages/main/index.tsx',
			options: { sourceRoot: 'src', fixPrefix: 'app', i18nImportSource: '@/i18n' },
			fix: true,
		});
		expect(res.messages).toHaveLength(0);
		expect(res.output).toContain("import { t } from '@/i18n';");
		expect(res.output).toContain("{t('app.pages.main.index.literal_");
	});

	it('no-literal-string fixes accepted attribute and ignores url text', async () => {
		const code = "import { t } from '@/i18n'; export const X=()=> <img alt='应用图标' title='https://example.com' />";
		const res = await runRule('no-literal-string', code, {
			filePath: 'src/pages/main/index.tsx',
			options: { sourceRoot: 'src', fixPrefix: 'app' },
			fix: true,
		});
		expect(res.messages).toHaveLength(0);
		expect(res.output).toContain("alt={t('app.pages.main.index.literal_");
		expect(res.output).toContain("title='https://example.com'");
	});

	it('interpolation-params reports missing and unused option keys', async () => {
		const res = await runRule('interpolation-params', "t('app.pages.home.total', '{{count}} items', { total: 3, foo: 1 })");
		expect(res.messages).toHaveLength(3);
		const messageIds = res.messages.map((m) => m.messageId);
		expect(messageIds).toContain('missingInterpolation');
		expect(messageIds).toContain('unusedInterpolation');
	});

	it('interpolation-params honors disabled check option', async () => {
		const res = await runRule('interpolation-params', "t('app.pages.home.total', '{{count}} items', { total: 3 })", { options: { checkInterpolationParams: false } });
		expect(res.messages).toHaveLength(0);
	});

	it('prefer-interpolation reports string concatenation in defaultValue', async () => {
		const res = await runRule('prefer-interpolation', "t('app.pages.home.total', 'Total: ' + count)");
		expect(res.messages).toHaveLength(1);
		expect(res.messages[0]?.message).toContain('string concatenation');
	});

	it('prefer-interpolation reports object-style defaultValue concatenation', async () => {
		const res = await runRule('prefer-interpolation', "t('app.pages.home.total', { defaultValue: 'Total: ' + count, count })");
		expect(res.messages).toHaveLength(1);
	});

	it('prefer-interpolation ignores static string defaultValue', async () => {
		const res = await runRule('prefer-interpolation', "t('app.pages.home.total', 'Total')");
		expect(res.messages).toHaveLength(0);
	});

	it('prefer-interpolation reports concatenation on translation result', async () => {
		const res = await runRule('prefer-interpolation', "const text = t('app.pages.home.total', 'Total') + 'xxxx';");
		expect(res.messages).toHaveLength(1);
		expect(res.messages[0]?.message).toContain('Translation result is concatenated');
	});

	it('prefer-interpolation reports template concat around translation in jsx', async () => {
		const res = await runRule('prefer-interpolation', "export const X=()=> <div>{`${t('app.pages.home.total', 'Total:')}${count}`}</div>", {
			filePath: 'src/pages/main/index.tsx',
		});
		expect(res.messages).toHaveLength(1);
		expect(res.messages[0]?.message).toContain('Translation result is concatenated');
	});

	it('prefer-interpolation reports concatenation around translation in vue template expression', async () => {
		const code = `<template><div>{{ t('app.pages.home.total', 'Total:') + count }}</div></template>`;
		const res = await runRule('prefer-interpolation', code, {
			filePath: 'src/pages/main/index.vue',
			languageOptions: {
				parser: vueParser,
			},
		});
		expect(res.messages).toHaveLength(1);
	});

	it('prefer-interpolation reports template-string concat in vue sfc script', async () => {
		const code = `<script setup>const text = \`${"${t('app.pages.home.total', 'Total:')}${count}"}\`;</script>`;
		const res = await runRule('prefer-interpolation', code, {
			filePath: 'src/pages/main/index.vue',
			languageOptions: {
				parser: vueParser,
			},
		});
		expect(res.messages).toHaveLength(1);
	});

	it('prefer-interpolation reports += concatenation on translation result', async () => {
		const res = await runRule('prefer-interpolation', "let text = ''; text += t('app.pages.home.total', 'Total')");
		expect(res.messages).toHaveLength(1);
	});

	it('prefer-interpolation reports concat() around translation result', async () => {
		const res = await runRule('prefer-interpolation', "const text = 'prefix '.concat(t('app.pages.home.total', 'Total'))");
		expect(res.messages).toHaveLength(1);
	});

	it("prefer-interpolation reports join('') around translation result", async () => {
		const res = await runRule('prefer-interpolation', "const text = [t('app.pages.home.total', 'Total'), suffix].join('')");
		expect(res.messages).toHaveLength(1);
	});

	it('prefer-interpolation ignores non-empty separator join()', async () => {
		const res = await runRule('prefer-interpolation', "const text = [t('app.pages.home.total', 'Total'), suffix].join(',')");
		expect(res.messages).toHaveLength(0);
	});

	it('prefer-interpolation reports defaultValue template string', async () => {
		const res = await runRule('prefer-interpolation', "t('app.pages.home.total', `Total: ${count}`)");
		expect(res.messages).toHaveLength(1);
		expect(res.messages[0]?.message).toContain('Default text uses string concatenation');
	});
});
