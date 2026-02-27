import type { I18nLintRuleOptions, I18nRuleOptions, RuleLevel } from '../types';

export function createI18nRulesConfig(level: RuleLevel = 'error', options: I18nRuleOptions = {}) {
	return {
		'i18n-key/invalid-char': [level, options],
		'i18n-key/invalid-structure': [level, options],
		'i18n-key/invalid-segment': [level, options],
		'i18n-key/invalid-prefix': [level, options],
		'i18n-key/invalid-layer': [level, options],
		'i18n-key/duplicate-suffix': [level, options],
		'i18n-key/require-default-value': [level, options],
	};
}

export function createI18nLintRulesConfig(level: RuleLevel = 'warn', options: I18nLintRuleOptions = {}) {
	return {
		'i18n-key/no-literal-string': [level, options],
		'i18n-key/interpolation-params': [level, options],
		'i18n-key/prefer-interpolation': [level, options],
	};
}
