import { createCommonVisitors } from './helpers';
import { baseSchema } from './schemas';

export const invalidStructureRule = {
	meta: {
		type: 'problem',
		docs: { description: 'Validate i18n key structure' },
		schema: [baseSchema],
		messages: {
			invalidStructure: 'i18n key "{{key}}" 必须满足 ${prefix}.${layer}.${suffix}，至少包含 3 段。',
		},
	},
	create(context: any) {
		return createCommonVisitors(context, (node, key) => {
			if (key.split('.').length >= 3) return;
			context.report({ node, messageId: 'invalidStructure', data: { key } });
		});
	},
};
