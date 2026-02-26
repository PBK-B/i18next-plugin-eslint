import { DEFAULT_ALLOWED_PREFIXES, createCommonVisitors, isValidKey, normalizeAllowedPrefixes, withFix } from './helpers';
import { baseSchema } from './schemas';

export const invalidPrefixRule = {
	meta: {
		type: 'problem',
		fixable: 'code',
		docs: { description: 'Validate i18n key prefix allow-list' },
		schema: [baseSchema],
		messages: {
			invalidPrefix: 'The prefix "{{prefix}}" in i18n key "{{key}}" is not in the allowed list: {{prefixes}}.',
		},
	},
	create(context: any) {
		const options = context.options[0] ?? {};
		const allowedPrefixes = normalizeAllowedPrefixes(options.allowedPrefixes ?? DEFAULT_ALLOWED_PREFIXES);
		return createCommonVisitors(context, (node, key) => {
			const segments = key.split('.');
			if (segments.length === 0 || !Array.isArray(allowedPrefixes) || allowedPrefixes.length === 0) return;
			const prefix = segments[0];
			if (allowedPrefixes.includes(prefix)) return;
			const nextKey = [allowedPrefixes[0], ...segments.slice(1)].join('.');
			const fix = isValidKey(nextKey, allowedPrefixes) ? withFix(node, nextKey) : null;
			context.report({
				node,
				messageId: 'invalidPrefix',
				data: { key, prefix, prefixes: allowedPrefixes.join(', ') },
				fix,
			});
		});
	},
};
