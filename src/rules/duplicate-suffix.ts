import { DEFAULT_ALLOWED_PREFIXES, createCommonVisitors, isValidKey, normalizeAllowedPrefixes, withFix } from './helpers';
import { baseSchema } from './schemas';

export const duplicateSuffixRule = {
	meta: {
		type: 'problem',
		fixable: 'code',
		docs: { description: 'Disallow duplicate i18n key suffix in one file' },
		schema: [baseSchema],
		messages: {
			duplicateSuffix: '同一文件中 i18n key 后缀 "{{suffix}}" 重复（首次出现在第 {{line}} 行）。',
		},
	},
	create(context: any) {
		const options = context.options[0] ?? {};
		const allowedPrefixes = normalizeAllowedPrefixes(options.allowedPrefixes ?? DEFAULT_ALLOWED_PREFIXES);
		const suffixLineMap = new Map();
		const suffixCountMap = new Map();

		return createCommonVisitors(context, (node, key) => {
			const segments = key.split('.');
			if (segments.length < 3) return;
			const suffix = segments[segments.length - 1];

			if (!suffixLineMap.has(suffix)) {
				suffixLineMap.set(suffix, node.loc.start.line);
				suffixCountMap.set(suffix, 1);
				return;
			}

			const currentCount = (suffixCountMap.get(suffix) ?? 1) + 1;
			suffixCountMap.set(suffix, currentCount);
			const fixedKey = [...segments.slice(0, -1), `${suffix}_${currentCount}`].join('.');
			const fix = isValidKey(fixedKey, allowedPrefixes) ? withFix(node, fixedKey) : null;

			context.report({
				node,
				messageId: 'duplicateSuffix',
				data: {
					suffix,
					line: String(suffixLineMap.get(suffix)),
				},
				fix,
			});
		});
	},
};
