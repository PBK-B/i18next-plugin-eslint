import { describe, expect, it } from 'vitest';
import { runRule } from './utils/eslint-runner';

describe('fine-grained branch cases', () => {
	it('invalid-char skips valid key and can report without fix', async () => {
		const valid = await runRule('invalid-char', "t('app.pages.main.submit')");
		expect(valid.messages).toHaveLength(0);

		const noFix = await runRule('invalid-char', "t('bad/pages/Title')", {
			options: { allowedPrefixes: ['app'] },
			fix: true,
		});
		expect(noFix.messages).toHaveLength(1);
		expect(noFix.output).toBeUndefined();
	});

	it('invalid-prefix skips when allow-list is not configured', async () => {
		const res = await runRule('invalid-prefix', "t('demo.pages.home.submit')");
		expect(res.messages).toHaveLength(0);
	});

	it('invalid-segment skips valid key and can report without fix', async () => {
		const valid = await runRule('invalid-segment', "t('app.pages.main.submit')");
		expect(valid.messages).toHaveLength(0);

		const noFix = await runRule('invalid-segment', "t('bad.pages.Main.submit')", {
			options: { allowedPrefixes: ['app'] },
			fix: true,
		});
		expect(noFix.messages).toHaveLength(1);
		expect(noFix.output).toBeUndefined();
	});

	it('invalid-layer can report with null fix when prefixes reject fixed key', async () => {
		const res = await runRule('invalid-layer', "t('bad.pages.other.submit')", {
			filePath: 'src/pages/main/index.tsx',
			options: { sourceRoot: 'src', allowedPrefixes: ['app'] },
			fix: true,
		});
		expect(res.messages).toHaveLength(1);
		expect(res.output).toBeUndefined();
	});

	it('duplicate-suffix can report with null fix when prefixes reject result', async () => {
		const code = "t('bad.pages.main.index.submit'); t('bad.pages.main.dialog.submit')";
		const res = await runRule('duplicate-suffix', code, {
			options: { allowedPrefixes: ['app'] },
			fix: true,
		});
		expect(res.messages).toHaveLength(1);
		expect(res.output).toBeUndefined();
	});

	it('require-default-value supports legacy requireDefaultValue switch and member call', async () => {
		const forbiddenByLegacy = await runRule('require-default-value', "obj.t('app.pages.main.submit', '提交')", {
			options: { requireDefaultValue: false },
		});
		expect(forbiddenByLegacy.messages).toHaveLength(1);

		const allowedByLegacy = await runRule('require-default-value', "obj.t('app.pages.main.submit')", {
			options: { requireDefaultValue: false },
		});
		expect(allowedByLegacy.messages).toHaveLength(0);
	});

	it('require-default-value runs default policy path when no options provided', async () => {
		const res = await runRule('require-default-value', "t('app.pages.main.submit')");
		expect(res.messages).toHaveLength(1);
		expect(res.messages[0]?.messageId).toBe('missingDefaultValue');
	});

	it('interpolation-params skips when defaultValue or options are missing', async () => {
		const noOptions = await runRule('interpolation-params', "t('app.pages.main.total', '{{name}}')");
		expect(noOptions.messages).toHaveLength(0);

		const noDefaultValue = await runRule('interpolation-params', "t('app.pages.main.total', { count: 1 })");
		expect(noDefaultValue.messages).toHaveLength(0);
	});

	it('interpolation-params ignores reserved option keys and non-tracked hook alias value', async () => {
		const ignoreReserved = await runRule('interpolation-params', "t('app.pages.main.total', '{{name}}', { name: 1, ns: 'x' })");
		expect(ignoreReserved.messages).toHaveLength(0);

		const ignoreTOptions = await runRule(
			'interpolation-params',
			"t('app.pages.main.total', '{{name}}', { name: 1, returnDetails: true, lng: 'zh-CN', interpolation: { escapeValue: false }, replace: { x: 1 } })",
		);
		expect(ignoreTOptions.messages).toHaveLength(0);

		const aliasNotTracked = await runRule(
			'interpolation-params',
			"import { useTranslation as useT } from 'react-i18next'; const { t: tx = t } = useT(); tx('app.pages.main.total', '{{name}}', { name: 1 })",
		);
		expect(aliasNotTracked.messages).toHaveLength(0);
	});

	it('interpolation-params supports custom ignoredOptionKeys', async () => {
		const res = await runRule('interpolation-params', "t('app.pages.main.total', '{{name}}', { name: 1, customMeta: 'x' })", {
			options: { ignoredOptionKeys: ['customMeta'] },
		});
		expect(res.messages).toHaveLength(0);
	});

	it('no-literal-string reports without fix when autoFix is false', async () => {
		const res = await runRule('no-literal-string', 'export const X=()=> <p>欢迎</p>', {
			filePath: 'src/pages/main/index.tsx',
			options: { sourceRoot: 'src', autoFix: false },
			fix: true,
		});
		expect(res.messages).toHaveLength(1);
		expect(res.output).toBeUndefined();
	});

	it('no-literal-string skips for member tag names and ignored attrs/tags', async () => {
		const memberTag = await runRule('no-literal-string', 'const X=()=> <UI.Text>欢迎</UI.Text>', {
			filePath: 'src/pages/main/index.tsx',
			options: { sourceRoot: 'src' },
		});
		expect(memberTag.messages).toHaveLength(0);

		const ignoredTag = await runRule('no-literal-string', 'const X=()=> <code>欢迎</code>', {
			filePath: 'src/pages/main/index.tsx',
			options: { sourceRoot: 'src' },
		});
		expect(ignoredTag.messages).toHaveLength(0);

		const ignoredAttr = await runRule('no-literal-string', "const X=()=> <img title='标题' />", {
			filePath: 'src/pages/main/index.tsx',
			options: { sourceRoot: 'src', ignoredAttributes: ['title'] },
		});
		expect(ignoredAttr.messages).toHaveLength(0);
	});

	it('no-literal-string uses default options path and skips non-natural-language text', async () => {
		const code = 'export const X=()=> <p>123...</p>';
		const res = await runRule('no-literal-string', code, {
			filePath: 'src/pages/main/index.tsx',
		});
		expect(res.messages).toHaveLength(0);
	});

	it('no-literal-string returns null for unsupported attribute value shapes', async () => {
		const code = 'const X=()=> <img alt={name} />';
		const res = await runRule('no-literal-string', code, {
			filePath: 'src/pages/main/index.tsx',
		});
		expect(res.messages).toHaveLength(0);
	});

	it('no-literal-string hits import-fix guard with multiple literals and no import', async () => {
		const code = 'export const X=()=> <div><p>文案一</p><p>文案二</p></div>';
		const res = await runRule('no-literal-string', code, {
			filePath: 'src/pages/main/index.tsx',
			options: { sourceRoot: 'src', fixPrefix: 'app', i18nImportSource: '@/i18n' },
			fix: true,
		});
		expect(res.messages).toHaveLength(0);
		expect(res.output).toContain("import { t } from '@/i18n';");
		expect(res.output).toContain('literal_');
	});
});
