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
		languageOptions,
	}: {
		filePath?: string;
		options?: Record<string, unknown>;
		fix?: boolean;
		languageOptions?: Record<string, unknown>;
	} = {},
): Promise<LintRunResult> {
	const ruleConfig = (options === undefined ? 'error' : ['error', options]) as any;
	const mergedLanguageOptions = {
		ecmaVersion: 2022,
		sourceType: 'module',
		parserOptions: {
			ecmaFeatures: {
				jsx: true,
			},
		},
		...languageOptions,
	};

	const eslint = new ESLint({
		overrideConfigFile: true,
		ignore: false,
		fix,
		overrideConfig: [
			{
				files: ['**/*.{js,jsx,ts,tsx,vue}'],
				languageOptions: mergedLanguageOptions,
				plugins: {
					'i18n-key': plugin,
				},
				rules: {
					[`i18n-key/${ruleName}`]: ruleConfig,
				},
			},
		],
	} as any);

	const [result] = await eslint.lintText(code, { filePath });
	return {
		messages: result.messages,
		output: result.output,
	};
}
