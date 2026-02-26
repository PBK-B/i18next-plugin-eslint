import { createI18nLintRulesConfig, createI18nRulesConfig } from './config';
import { rules } from '../rules';

const i18nKeyPlugin = {
	rules,
	configs: {
		recommended: {
			rules: {
				...createI18nRulesConfig('error'),
				...createI18nLintRulesConfig('warn'),
			},
		},
		strict: {
			rules: {
				...createI18nRulesConfig('error'),
				...createI18nLintRulesConfig('error'),
			},
		},
		relaxed: {
			rules: {
				...createI18nRulesConfig('warn'),
				...createI18nLintRulesConfig('warn'),
			},
		},
	},
};

export { createI18nRulesConfig, createI18nLintRulesConfig };
export default i18nKeyPlugin;
