import { DEFAULT_ALLOWED_PREFIXES, createCommonVisitors, isValidKey, isValidSegment, normalizeAllowedPrefixes, normalizeKey, withFix } from './helpers';
import { baseSchema } from './schemas';

export const invalidSegmentRule = {
	meta: {
		type: 'problem',
		fixable: 'code',
		docs: { description: 'Validate i18n key segment naming' },
		schema: [baseSchema],
		messages: {
			invalidSegment: 'The segment "{{segment}}" in i18n key "{{key}}" is invalid (must be lowercase snake_case and cannot start with a number).',
		},
	},
	create(context: any) {
		const options = context.options[0] ?? {};
		const allowedPrefixes = normalizeAllowedPrefixes(options.allowedPrefixes ?? DEFAULT_ALLOWED_PREFIXES);
		return createCommonVisitors(context, (node, key) => {
			const segments = key.split('.');
			for (const segment of segments) {
				if (isValidSegment(segment)) continue;
				const normalized = normalizeKey(key);
				const fix = normalized !== key && isValidKey(normalized, allowedPrefixes) ? withFix(node, normalized) : null;
				context.report({ node, messageId: 'invalidSegment', data: { key, segment }, fix });
				return;
			}
		});
	},
};
