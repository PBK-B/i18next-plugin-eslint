import { describe, expect, it } from 'vitest';
import { runRule } from './utils/eslint-runner';

describe('rules branch coverage', () => {
	it('invalid-layer skips when expected layer cannot be resolved', async () => {
		const res = await runRule('invalid-layer', "t('app.pages.main.submit')", {
			filePath: 'tmp/virtual-file.tsx',
			options: { sourceRoot: 'src', allowedPrefixes: ['app'] },
		});
		expect(res.messages).toHaveLength(0);
	});

	it('invalid-layer skips for short keys and shared layers', async () => {
		const short = await runRule('invalid-layer', "t('app.short')", {
			filePath: 'src/pages/main/index.tsx',
			options: { sourceRoot: 'src', allowedPrefixes: ['app'] },
		});
		expect(short.messages).toHaveLength(0);

		const shared = await runRule('invalid-layer', "t('app.shared.submit')", {
			filePath: 'src/pages/main/index.tsx',
			options: { sourceRoot: 'src', allowedPrefixes: ['app'], sharedLayers: ['shared'] },
		});
		expect(shared.messages).toHaveLength(0);
	});

	it('duplicate-suffix skips short keys', async () => {
		const res = await runRule('duplicate-suffix', "t('app.short'); t('app.short')", {
			options: { allowedPrefixes: ['app'] },
		});
		expect(res.messages).toHaveLength(0);
	});

	it('require-default-value supports aliased t from import and hook', async () => {
		const codeImport = "import { t as tt } from '@/i18n'; tt('app.pages.main.submit')";
		const viaImport = await runRule('require-default-value', codeImport, {
			options: { defaultValuePolicy: 'required' },
		});
		expect(viaImport.messages).toHaveLength(1);

		const codeHook = "import { useTranslation as useT } from 'react-i18next'; const { t: tx } = useT(); tx('app.pages.main.submit')";
		const viaHook = await runRule('require-default-value', codeHook, {
			options: { defaultValuePolicy: 'required' },
		});
		expect(viaHook.messages).toHaveLength(1);
	});

	it('require-default-value ignores non-translate or non-string calls', async () => {
		const res = await runRule('require-default-value', "x('app.pages.main.submit'); t(1)", {
			options: { defaultValuePolicy: 'required' },
		});
		expect(res.messages).toHaveLength(0);
	});

	it('interpolation-params supports object defaultValue style and alias tracking', async () => {
		const code =
			"import { t as tt } from '@/i18n'; tt('app.pages.main.total', { defaultValue: '{{count}} items', count: 1, foo: 2 })";
		const res = await runRule('interpolation-params', code);
		expect(res.messages).toHaveLength(2);
		expect(res.messages.map((m) => m.message).join('|')).toContain('未提供该参数');
		expect(res.messages.map((m) => m.message).join('|')).toContain('未使用该参数');
	});

	it('interpolation-params ignores when no interpolation tokens', async () => {
		const res = await runRule('interpolation-params', "t('app.pages.main.total', 'plain text', { count: 1 })");
		expect(res.messages).toHaveLength(0);
	});

	it('interpolation-params tracks useTranslation alias destructuring', async () => {
		const code =
			"import { useTranslation as useT } from 'react-i18next'; const { t: tx } = useT(); tx('app.pages.main.total', '{{count}} items', { count: 1 })";
		const res = await runRule('interpolation-params', code);
		expect(res.messages).toHaveLength(1);
		expect(res.messages[0]?.message).toContain('未提供该参数');
	});

	it('interpolation-params handles plain useTranslation import and object pattern noise', async () => {
		const code =
			"import { useTranslation } from 'react-i18next'; const { i18n, t } = useTranslation(); t('app.pages.main.total', '{{count}} items', { count: 1 })";
		const res = await runRule('interpolation-params', code);
		expect(res.messages).toHaveLength(1);
		expect(res.messages[0]?.message).toContain('未提供该参数');
	});

	it('no-literal-string respects autoFix false and tag/attr filters', async () => {
		const code = 'export const X=()=> <script title="标题">欢迎</script>';
		const res = await runRule('no-literal-string', code, {
			filePath: 'src/pages/main/index.tsx',
			options: { sourceRoot: 'src', autoFix: false },
		});
		expect(res.messages).toHaveLength(0);
		expect(res.output).toBeUndefined();
	});

	it('no-literal-string handles existing t alias and duplicate import-fix guard', async () => {
		const code = "import { t as tt } from '@/i18n'; export const X=()=> <div><p>文案一</p><p>文案二</p></div>";
		const res = await runRule('no-literal-string', code, {
			filePath: 'src/pages/main/index.tsx',
			options: { sourceRoot: 'src', fixPrefix: 'app' },
			fix: true,
		});
		expect(res.messages).toHaveLength(0);
		expect(res.output).toContain('{tt(');
	});

	it('no-literal-string inserts import after existing imports', async () => {
		const code = "import React from 'react'; export const X=()=> <p>欢迎</p>";
		const res = await runRule('no-literal-string', code, {
			filePath: 'src/pages/main/index.tsx',
			options: { sourceRoot: 'src', fixPrefix: 'app', i18nImportSource: '@/i18n' },
			fix: true,
		});
		expect(res.messages).toHaveLength(0);
		expect(res.output).toContain("import React from 'react';\nimport { t } from '@/i18n';");
	});

	it('no-literal-string tracks t from useTranslation alias', async () => {
		const code =
			"import { useTranslation as useT } from 'react-i18next'; export const X=()=>{ const { t: tx } = useT(); return <p>欢迎</p>; }";
		const res = await runRule('no-literal-string', code, {
			filePath: 'src/pages/main/index.tsx',
			options: { sourceRoot: 'src', fixPrefix: 'app' },
			fix: true,
		});
		expect(res.messages).toHaveLength(0);
		expect(res.output).toContain('{tx(');
	});

	it('no-literal-string handles useTranslation with object pattern non-t props', async () => {
		const code =
			"import { useTranslation } from 'react-i18next'; export const X=()=>{ const { i18n, t } = useTranslation(); return <p>你好</p>; }";
		const res = await runRule('no-literal-string', code, {
			filePath: 'src/pages/main/index.tsx',
			options: { sourceRoot: 'src', fixPrefix: 'app' },
			fix: true,
		});
		expect(res.messages).toHaveLength(0);
		expect(res.output).toContain('{t(');
	});

	it('require-default-value resolves useTranslation alias with default option style', async () => {
		const code =
			"import { useTranslation as useT } from 'react-i18next'; const { t: tx } = useT(); tx('app.pages.main.submit', { defaultValue: '提交' })";
		const res = await runRule('require-default-value', code, {
			options: { defaultValuePolicy: 'forbidden' },
		});
		expect(res.messages).toHaveLength(1);
		expect(res.messages[0]?.message).toContain('不允许配置默认值');
	});

	it('invalid-structure does not report valid key', async () => {
		const res = await runRule('invalid-structure', "t('app.pages.main.submit')");
		expect(res.messages).toHaveLength(0);
	});
});
