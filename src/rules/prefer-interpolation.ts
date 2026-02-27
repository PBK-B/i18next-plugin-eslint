import { findDefaultValueNode, getStaticStringFromNode, isI18nTranslateCall } from './helpers';
import { baseSchema } from './schemas';

function collectPlusOperands(node: any, bucket: any[]) {
	if (!node || node.type !== 'BinaryExpression' || node.operator !== '+') {
		bucket.push(node);
		return;
	}

	collectPlusOperands(node.left, bucket);
	collectPlusOperands(node.right, bucket);
}

function isDynamicStringConcatenation(node: any) {
	if (!node || node.type !== 'BinaryExpression' || node.operator !== '+') return false;
	const operands: any[] = [];
	collectPlusOperands(node, operands);
	if (operands.length < 2) return false;

	let hasDynamicOperand = false;
	for (const operand of operands) {
		if (getStaticStringFromNode(operand) == null) {
			hasDynamicOperand = true;
			break;
		}
	}

	return hasDynamicOperand;
}

function isDynamicTemplateString(node: any) {
	if (!node || node.type !== 'TemplateLiteral') return false;
	return node.expressions.length > 0;
}

function containsTranslateCall(node: any, trackedTNames: Set<string>): boolean {
	if (!node || typeof node !== 'object') return false;
	if (node.type === 'CallExpression' && isI18nTranslateCall(node, trackedTNames)) return true;

	for (const key of Object.keys(node)) {
		if (key === 'parent' || key === 'loc' || key === 'range') continue;
		const value = (node as any)[key];
		if (!value) continue;
		if (Array.isArray(value)) {
			for (const item of value) {
				if (containsTranslateCall(item, trackedTNames)) return true;
			}
			continue;
		}

		if (containsTranslateCall(value, trackedTNames)) return true;
	}

	return false;
}

function containsConcatWithTranslate(node: any, trackedTNames: Set<string>): boolean {
	if (!node || typeof node !== 'object') return false;
	if (node.type === 'BinaryExpression' && node.operator === '+' && containsTranslateCall(node, trackedTNames)) return true;

	for (const key of Object.keys(node)) {
		if (key === 'parent' || key === 'loc' || key === 'range') continue;
		const value = (node as any)[key];
		if (!value) continue;
		if (Array.isArray(value)) {
			for (const item of value) {
				if (containsConcatWithTranslate(item, trackedTNames)) return true;
			}
			continue;
		}

		if (containsConcatWithTranslate(value, trackedTNames)) return true;
	}

	return false;
}

function isStringConcatCall(node: any, trackedTNames: Set<string>) {
	if (!node || node.type !== 'CallExpression') return false;
	if (!node.callee || node.callee.type !== 'MemberExpression' || node.callee.computed) return false;
	if (node.callee.property.type !== 'Identifier' || node.callee.property.name !== 'concat') return false;
	return containsTranslateCall(node, trackedTNames);
}

function isJoinConcatCall(node: any, trackedTNames: Set<string>) {
	if (!node || node.type !== 'CallExpression') return false;
	if (!node.callee || node.callee.type !== 'MemberExpression' || node.callee.computed) return false;
	if (node.callee.property.type !== 'Identifier' || node.callee.property.name !== 'join') return false;
	if (!node.callee.object || node.callee.object.type !== 'ArrayExpression') return false;
	const separator = node.arguments[0];
	if (separator && getStaticStringFromNode(separator) == null) return false;
	if (separator && getStaticStringFromNode(separator) !== '') return false;
	return containsTranslateCall(node, trackedTNames);
}

export const preferInterpolationRule = {
	meta: {
		type: 'suggestion',
		docs: { description: 'Prefer i18n interpolation placeholders over string concatenation in default text' },
		schema: [baseSchema],
		messages: {
			preferInterpolation: 'Default text uses string concatenation. Prefer interpolation placeholders (for example "{{name}}") and pass values through options.',
			avoidConcatOnTResult:
				'Translation result is concatenated with other text/variables. Prefer interpolation placeholders (for example "{{name}}") inside the translation default text.',
		},
	},
	create(context: any) {
		const trackedTNames = new Set(['t']);
		const useTranslationNames = new Set(['useTranslation']);
		const expressionVisitors = {
			BinaryExpression(node: any) {
				if (node.operator !== '+') return;
				if (node.parent?.type === 'BinaryExpression' && node.parent.operator === '+') return;
				if (!containsTranslateCall(node, trackedTNames)) return;
				context.report({ node, messageId: 'avoidConcatOnTResult' });
			},

			TemplateLiteral(node: any) {
				if (node.expressions.length === 0) return;
				const hasTranslateCall = node.expressions.some((item: any) => containsTranslateCall(item, trackedTNames));
				if (!hasTranslateCall) return;
				const hasConcatExpression = node.expressions.some((item: any) => containsConcatWithTranslate(item, trackedTNames));
				if (hasConcatExpression) return;
				const hasTextFragment = node.quasis.some((item: any) => {
					const raw = item?.value?.raw ?? '';
					const cooked = item?.value?.cooked ?? '';
					return raw !== '' || cooked !== '';
				});
				if (!hasTextFragment && node.expressions.length === 1) return;
				context.report({ node, messageId: 'avoidConcatOnTResult' });
			},

			AssignmentExpression(node: any) {
				if (node.operator !== '+=') return;
				if (!containsTranslateCall(node.right, trackedTNames)) return;
				context.report({ node, messageId: 'avoidConcatOnTResult' });
			},

			CallExpression(node: any) {
				if (isI18nTranslateCall(node, trackedTNames)) {
					const defaultValueNode = findDefaultValueNode(node);
					if (isDynamicStringConcatenation(defaultValueNode) || isDynamicTemplateString(defaultValueNode)) {
						context.report({ node: defaultValueNode, messageId: 'preferInterpolation' });
					}
					return;
				}

				if (isStringConcatCall(node, trackedTNames) || isJoinConcatCall(node, trackedTNames)) {
					context.report({ node, messageId: 'avoidConcatOnTResult' });
				}
			},
		};

		const scriptVisitors = {
			...expressionVisitors,

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
		};

		const parserServices = context.sourceCode?.parserServices;
		if (parserServices?.defineTemplateBodyVisitor) {
			return parserServices.defineTemplateBodyVisitor(expressionVisitors, scriptVisitors);
		}

		return scriptVisitors;
	},
};
