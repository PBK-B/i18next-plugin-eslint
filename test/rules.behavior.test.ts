import { describe, expect, it } from 'vitest';
import { runRule } from './utils/eslint-runner';

describe('behavior rules', () => {
	it('require-default-value: required policy reports missing default', async () => {
		const res = await runRule('require-default-value', "t('app.pages.home.submit')", {
			options: { defaultValuePolicy: 'required' },
		});
		expect(res.messages).toHaveLength(1);
		expect(res.messages[0]?.message).toContain('未配置默认值');
	});

	it('require-default-value: forbidden policy reports existing default', async () => {
		const res = await runRule('require-default-value', "t('app.pages.home.submit', '提交')", {
			options: { defaultValuePolicy: 'forbidden' },
		});
		expect(res.messages).toHaveLength(1);
		expect(res.messages[0]?.message).toContain('不允许配置默认值');
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
		expect(res.messages.map((m) => m.message).join('|')).toContain('未提供该参数');
		expect(res.messages.map((m) => m.message).join('|')).toContain('未使用该参数');
	});

	it('interpolation-params honors disabled check option', async () => {
		const res = await runRule('interpolation-params', "t('app.pages.home.total', '{{count}} items', { total: 3 })", { options: { checkInterpolationParams: false } });
		expect(res.messages).toHaveLength(0);
	});
});
