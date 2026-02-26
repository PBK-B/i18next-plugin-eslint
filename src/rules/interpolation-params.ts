import { extractInterpolationKeys, getObjectExpression, getObjectPropertyMap, getStaticStringFromNode, isI18nTranslateCall } from './helpers';
import { baseSchema } from './schemas';

export const interpolationParamsRule = {
	meta: {
		type: 'problem',
		docs: { description: 'Check interpolation params in defaultValue and options' },
		schema: [baseSchema],
		messages: {
			missingInterpolation: 'i18n 默认文案中使用了插值参数 "{{name}}"，但 options 未提供该参数。',
			unusedInterpolation: 'i18n options 传入了 "{{name}}"，但默认文案未使用该参数。',
		},
	},
	create(context: any) {
		const options = context.options[0] ?? {};
		const checkInterpolationParams = options.checkInterpolationParams !== false;
		if (!checkInterpolationParams) return {};

		const trackedTNames = new Set(['t']);
		const useTranslationNames = new Set(['useTranslation']);
		const ignoredOptionKeys = new Set(['defaultValue', 'ns', 'count', 'context', 'ordinal', 'returnObjects', 'joinArrays', 'postProcess', 'fallbackLng']);

		function resolveDefaultValueAndOptions(callNode: any) {
			const arg1 = callNode.arguments[1];
			const arg2 = callNode.arguments[2];
			let defaultValue = getStaticStringFromNode(arg1);
			let optionsObject = getObjectExpression(arg2);

			const optionsFromArg1 = getObjectExpression(arg1);
			if (optionsFromArg1) {
				const propMap = getObjectPropertyMap(optionsFromArg1);
				const defaultValueNode = propMap.get('defaultValue');
				const resolved = getStaticStringFromNode(defaultValueNode);
				if (resolved != null) defaultValue = resolved;
				optionsObject = optionsFromArg1;
			}

			return { defaultValue, optionsObject };
		}

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
				const resolved = resolveDefaultValueAndOptions(node);
				if (!resolved.defaultValue || !resolved.optionsObject) return;

				const textParams = extractInterpolationKeys(resolved.defaultValue);
				if (textParams.size === 0) return;

				const optionProps = getObjectPropertyMap(resolved.optionsObject);
				const optionKeys = new Set<string>();
				for (const name of optionProps.keys()) {
					if (ignoredOptionKeys.has(name)) continue;
					optionKeys.add(name);
				}

				for (const key of textParams) {
					if (optionKeys.has(key)) continue;
					context.report({ node, messageId: 'missingInterpolation', data: { name: key } });
				}

				for (const key of optionKeys) {
					if (textParams.has(key)) continue;
					context.report({ node, messageId: 'unusedInterpolation', data: { name: key } });
				}
			},
		};
	},
};
