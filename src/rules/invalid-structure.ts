import { createCommonVisitors } from './helpers';
import { baseSchema } from './schemas';

export const invalidStructureRule = {
	meta: {
		type: 'problem',
		docs: { description: 'Validate i18n key structure' },
		schema: [baseSchema],
		messages: {
			invalidStructure: 'i18n key "{{key}}" must follow ${prefix}.${layer}.${suffix} and contain at least 3 segments.',
		},
	},
	create(context: any) {
		return createCommonVisitors(context, (node, key) => {
			if (key.split('.').length >= 3) return;
			context.report({ node, messageId: 'invalidStructure', data: { key } });
		});
	},
};
