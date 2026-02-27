import { describe, expect, it } from 'vitest';
import plugin, { createI18nLintRulesConfig, createI18nRulesConfig } from '../src/core/plugin';

describe('core plugin assembly', () => {
	it('exposes expected rules and configs', () => {
		expect(plugin).toHaveProperty('rules');
		expect(plugin).toHaveProperty('configs.recommended.rules');
		expect(plugin).toHaveProperty('configs.strict.rules');
		expect(plugin).toHaveProperty('configs.relaxed.rules');
		expect(Object.keys(plugin.rules)).toEqual([
			'invalid-char',
			'invalid-structure',
			'invalid-segment',
			'invalid-prefix',
			'invalid-layer',
			'duplicate-suffix',
			'require-default-value',
			'no-literal-string',
			'interpolation-params',
			'prefer-interpolation',
		]);
	});

	it('creates i18n rules config with level and options', () => {
		const options = { sourceRoot: 'src', allowedPrefixes: ['app'] };
		const config = createI18nRulesConfig('warn', options);
		expect(config['i18n-key/invalid-char']).toEqual(['warn', options]);
		expect(config['i18n-key/invalid-layer']).toEqual(['warn', options]);
		expect(Object.keys(config)).toHaveLength(7);
	});

	it('creates lint rules config with level and options', () => {
		const options = { autoFix: false, acceptedTags: ['p'] };
		const config = createI18nLintRulesConfig('error', options);
		expect(config['i18n-key/no-literal-string']).toEqual(['error', options]);
		expect(config['i18n-key/interpolation-params']).toEqual(['error', options]);
		expect(config['i18n-key/prefer-interpolation']).toEqual(['error', options]);
		expect(Object.keys(config)).toHaveLength(3);
	});
});
