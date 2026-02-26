import { DEFAULT_ALLOWED_PREFIXES, createCommonVisitors, isValidKey, normalizeAllowedPrefixes, normalizeKey, withFix } from './helpers';
import { baseSchema } from './schemas';

export const invalidCharRule = {
	meta: {
		type: 'problem',
		fixable: 'code',
		docs: { description: 'Validate i18n key characters' },
		schema: [baseSchema],
		messages: {
			invalidChar: 'i18n key "{{key}}" 只能包含小写字母、数字、下划线和点。',
		},
	},
	create(context: any) {
		const options = context.options[0] ?? {};
		const allowedPrefixes = normalizeAllowedPrefixes(options.allowedPrefixes ?? DEFAULT_ALLOWED_PREFIXES);
		return createCommonVisitors(context, (node, key) => {
			if (/^[a-z0-9._]+$/.test(key)) return;
			const normalized = normalizeKey(key);
			const fix = normalized !== key && isValidKey(normalized, allowedPrefixes) ? withFix(node, normalized) : null;
			context.report({ node, messageId: 'invalidChar', data: { key }, fix });
		});
	},
};
