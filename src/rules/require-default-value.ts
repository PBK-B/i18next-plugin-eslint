import { findDefaultValueNode, getStringValue, isI18nTranslateCall } from './helpers';
import { baseSchema } from './schemas';

export const requireDefaultValueRule = {
	meta: {
		type: 'problem',
		docs: { description: 'Require default value in i18n translate calls' },
		schema: [baseSchema],
		messages: {
			missingDefaultValue: 'i18n key "{{key}}" 未配置默认值，请为 t() 调用提供默认文案。',
			forbiddenDefaultValue: 'i18n key "{{key}}" 不允许配置默认值，请移除 t() 调用中的默认文案。',
		},
	},
	create(context: any) {
		const options = context.options[0] ?? {};
		const defaultValuePolicy = typeof options.defaultValuePolicy === 'string' ? options.defaultValuePolicy : options.requireDefaultValue === false ? 'forbidden' : 'required';

		const trackedTNames = new Set(['t']);
		const useTranslationNames = new Set(['useTranslation']);

		return {
			ImportDeclaration(node: any) {
				for (const specifier of node.specifiers) {
					if (specifier.type !== 'ImportSpecifier') continue;
					if (specifier.imported.type === 'Identifier' && specifier.imported.name === 't') {
						trackedTNames.add(specifier.local.name);
					}
					if (specifier.imported.type === 'Identifier' && specifier.imported.name === 'useTranslation') {
						useTranslationNames.add(specifier.local.name);
					}
				}
			},

			VariableDeclarator(node: any) {
				if (!node.init || node.init.type !== 'CallExpression') return;
				if (node.init.callee.type !== 'Identifier' || !useTranslationNames.has(node.init.callee.name)) return;
				if (node.id.type !== 'ObjectPattern') return;

				for (const prop of node.id.properties) {
					if (prop.type !== 'Property') continue;
					if (prop.key.type !== 'Identifier' || prop.key.name !== 't') continue;
					if (prop.value.type === 'Identifier') trackedTNames.add(prop.value.name);
				}
			},

			CallExpression(node: any) {
				if (!isI18nTranslateCall(node, trackedTNames)) return;
				const key = getStringValue(node.arguments[0]);
				if (key == null) return;
				const defaultValueNode = findDefaultValueNode(node);
				if (defaultValuePolicy === 'required') {
					if (defaultValueNode) return;
					context.report({ node: node.arguments[0], messageId: 'missingDefaultValue', data: { key } });
					return;
				}

				if (defaultValuePolicy === 'forbidden' && defaultValueNode) {
					context.report({ node: defaultValueNode, messageId: 'forbiddenDefaultValue', data: { key } });
				}
			},
		};
	},
};
