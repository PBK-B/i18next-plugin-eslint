import { describe, expect, it } from 'vitest';
import { runRule } from './utils/eslint-runner';

describe('key-format rules', () => {
	it('invalid-char reports and fixes key chars', async () => {
		const res = await runRule('invalid-char', "t('app.pages.Main.Title@Name')", {
			options: { allowedPrefixes: ['app'] },
			fix: true,
		});
		expect(res.messages).toHaveLength(0);
		expect(res.output).toContain("t('app.pages.main.title_name')");
	});

	it('invalid-structure reports short key', async () => {
		const res = await runRule('invalid-structure', "t('only_two')");
		expect(res.messages[0]?.message).toContain('至少包含 3 段');
	});

	it('invalid-segment reports and fixes segment style', async () => {
		const res = await runRule('invalid-segment', "t('app.pages.Main.user-profile')", {
			options: { allowedPrefixes: ['app'] },
			fix: true,
		});
		expect(res.messages).toHaveLength(0);
		expect(res.output).toContain("t('app.pages.main.user_profile')");
	});

	it('invalid-prefix reports and fixes by allow list', async () => {
		const res = await runRule('invalid-prefix', "t('demo.pages.home.submit')", {
			options: { allowedPrefixes: ['app'] },
			fix: true,
		});
		expect(res.messages).toHaveLength(0);
		expect(res.output).toContain("t('app.pages.home.submit')");
	});

	it('invalid-layer reports and fixes based on file path', async () => {
		const res = await runRule('invalid-layer', "t('app.pages.other.submit')", {
			filePath: 'src/pages/main/index.tsx',
			options: { sourceRoot: 'src', allowedPrefixes: ['app'] },
			fix: true,
		});
		expect(res.messages).toHaveLength(0);
		expect(res.output).toContain("t('app.pages.main.index.submit')");
	});

	it('duplicate-suffix reports and fixes second duplicate', async () => {
		const code = "t('app.pages.main.index.submit'); t('app.pages.main.dialog.submit')";
		const res = await runRule('duplicate-suffix', code, {
			options: { allowedPrefixes: ['app'] },
			fix: true,
		});
		expect(res.messages).toHaveLength(0);
		expect(res.output).toContain('submit_2');
	});
});
