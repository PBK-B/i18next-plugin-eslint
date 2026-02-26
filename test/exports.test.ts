import { describe, expect, it } from 'vitest';
import plugin, { createI18nLintRulesConfig, createI18nRulesConfig } from '../src';

describe('public exports', () => {
	it('re-exports default plugin and config factories', () => {
		expect(plugin).toHaveProperty('rules');
		expect(typeof createI18nRulesConfig).toBe('function');
		expect(typeof createI18nLintRulesConfig).toBe('function');
	});

	it('recommended/strict/relaxed configs set expected severities', () => {
		expect(plugin.configs.recommended.rules['i18n-key/invalid-char'][0]).toBe('error');
		expect(plugin.configs.recommended.rules['i18n-key/no-literal-string'][0]).toBe('warn');
		expect(plugin.configs.strict.rules['i18n-key/no-literal-string'][0]).toBe('error');
		expect(plugin.configs.relaxed.rules['i18n-key/invalid-char'][0]).toBe('warn');
	});
});
