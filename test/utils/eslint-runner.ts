import { ESLint } from 'eslint';
import plugin from '../../src/core/plugin';

export interface LintRunResult {
	messages: Awaited<ReturnType<ESLint['lintText']>>[number]['messages'];
	output?: string;
}

export async function runRule(
	ruleName: string,
	code: string,
	{
		filePath = 'src/pages/main/index.jsx',
		options,
		fix = false,
	}: {
		filePath?: string;
		options?: Record<string, unknown>;
		fix?: boolean;
	} = {},
): Promise<LintRunResult> {
	const ruleConfig = options === undefined ? 'error' : ['error', options];

	const eslint = new ESLint({
		overrideConfigFile: true,
		ignore: false,
		fix,
		overrideConfig: [
			{
				files: ['**/*.{js,jsx,ts,tsx}'],
				languageOptions: {
					ecmaVersion: 2022,
					sourceType: 'module',
					parserOptions: {
						ecmaFeatures: {
							jsx: true,
						},
					},
				},
				plugins: {
					'i18n-key': plugin,
				},
				rules: {
					[`i18n-key/${ruleName}`]: ruleConfig,
				},
			},
		],
	});

	const [result] = await eslint.lintText(code, { filePath });
	return {
		messages: result.messages,
		output: result.output,
	};
}
