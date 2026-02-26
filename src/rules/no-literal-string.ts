import {
	DEFAULT_ALLOWED_PREFIXES,
	DEFAULT_IGNORED_ATTRIBUTES,
	DEFAULT_IGNORED_TAGS,
	DEFAULT_SOURCE_ROOT,
	RECOMMENDED_ACCEPTED_ATTRIBUTES,
	RECOMMENDED_ACCEPTED_TAGS,
	getExpectedLayer,
	getStringLiteralAttributeValue,
	hasNaturalLanguageText,
	isUrlOrPath,
	normalizeAllowedPrefixes,
	normalizeSegment,
} from './helpers';
import { lintSchema } from './schemas';

export const noLiteralStringRule = {
	meta: {
		type: 'problem',
		fixable: 'code',
		docs: { description: 'Disallow hardcoded natural-language strings in JSX' },
		schema: [lintSchema],
		messages: {
			hardcodedText: '检测到硬编码文案 "{{text}}"，请使用 i18n key。',
		},
	},
	create(context: any) {
		const options = context.options[0] ?? {};
		const autoFix = options.autoFix !== false;

		const i18nImportSource = typeof options.i18nImportSource === 'string' ? options.i18nImportSource : '@/i18n';
		const sourceRoot = typeof options.sourceRoot === 'string' ? options.sourceRoot : DEFAULT_SOURCE_ROOT;
		const allowedPrefixes = normalizeAllowedPrefixes(options.allowedPrefixes ?? DEFAULT_ALLOWED_PREFIXES);
		const defaultFixPrefix = typeof options.fixPrefix === 'string' && options.fixPrefix.trim() ? normalizeSegment(options.fixPrefix) : null;
		const prefix = defaultFixPrefix ?? (Array.isArray(allowedPrefixes) && allowedPrefixes.length > 0 ? allowedPrefixes[0] : 'i18n');
		const expectedLayer = getExpectedLayer(context.filename, sourceRoot) ?? 'common';
		const suffixCountMap = new Map();
		const trackedTNames = new Set();
		const useTranslationNames = new Set(['useTranslation']);
		let lastImportNode = null;
		let importFixPlanned = false;

		const acceptedAttributes = new Set(
			(Array.isArray(options.acceptedAttributes) ? options.acceptedAttributes : RECOMMENDED_ACCEPTED_ATTRIBUTES).map((item: any) => String(item).toLowerCase()),
		);
		const acceptedTags = new Set((Array.isArray(options.acceptedTags) ? options.acceptedTags : RECOMMENDED_ACCEPTED_TAGS).map((item: any) => String(item).toLowerCase()));
		const ignoredAttributes = new Set((options.ignoredAttributes ?? DEFAULT_IGNORED_ATTRIBUTES).map((item: any) => String(item).toLowerCase()));
		const ignoredTags = new Set((options.ignoredTags ?? DEFAULT_IGNORED_TAGS).map((item: any) => String(item).toLowerCase()));

		function getTagName(openingElement: any) {
			if (!openingElement || openingElement.name.type !== 'JSXIdentifier') return null;
			return openingElement.name.name.toLowerCase();
		}

		function getCallName() {
			if (trackedTNames.has('t')) return 't';
			const first = trackedTNames.values().next();
			if (!first.done) return first.value;
			return null;
		}

		function toSingleQuotedText(value: string) {
			return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
		}

		function createKeyFromText(text: string) {
			const normalized = normalizeSegment(text);
			const baseSuffix = normalized === 'key' ? 'literal_text' : `literal_${normalized}`;
			const count = (suffixCountMap.get(baseSuffix) ?? 0) + 1;
			suffixCountMap.set(baseSuffix, count);
			const suffix = count === 1 ? baseSuffix : `${baseSuffix}_${count}`;
			return `${prefix}.${expectedLayer}.${suffix}`;
		}

		function buildFix(_nodeForReport: any, text: string, replaceNode: any, keepWhitespace = false) {
			if (!autoFix) return null;

			const callName = getCallName();
			const needsImport = callName == null;
			if (needsImport && importFixPlanned) return null;

			const key = createKeyFromText(text);
			const valueExpr = `${needsImport ? 't' : callName}(${toSingleQuotedText(key)}, ${toSingleQuotedText(text)})`;
			let replacement = `{${valueExpr}}`;
			if (keepWhitespace && replaceNode.type === 'JSXText') {
				const raw = replaceNode.value;
				const leading = raw.match(/^\s*/)?.[0] ?? '';
				const trailing = raw.match(/\s*$/)?.[0] ?? '';
				replacement = `${leading}{${valueExpr}}${trailing}`;
			}

			return (fixer: any) => {
				const fixes = [fixer.replaceText(replaceNode, replacement)];
				if (needsImport) {
					importFixPlanned = true;
					const importText = `import { t } from '${i18nImportSource}';\n`;
					if (lastImportNode) {
						fixes.push(fixer.insertTextAfter(lastImportNode, `\n${importText}`));
					} else {
						fixes.push(fixer.insertTextBeforeRange([0, 0], importText));
					}
				}
				return fixes;
			};
		}

		return {
			ImportDeclaration(node: any) {
				lastImportNode = node;
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

			JSXText(node: any) {
				const text = node.value.trim();
				if (!text || !hasNaturalLanguageText(text)) return;
				if (text.length <= 1 || text === '...' || isUrlOrPath(text) || !Number.isNaN(Number(text)) || text.startsWith('{{')) return;
				const parent = node.parent;
				if (!parent || parent.type !== 'JSXElement') return;
				const tagName = getTagName(parent.openingElement);
				if (!tagName) return;
				if (!acceptedTags.has(tagName)) return;
				if (ignoredTags.has(tagName)) return;
				context.report({ node, messageId: 'hardcodedText', data: { text }, fix: buildFix(node, text, node, true) });
			},

			JSXAttribute(node: any) {
				if (node.name.type !== 'JSXIdentifier') return;
				const attrName = node.name.name.toLowerCase();
				if (!acceptedAttributes.has(attrName)) return;
				if (ignoredAttributes.has(attrName)) return;

				const value = getStringLiteralAttributeValue(node);
				if (!value) return;
				const text = value.trim();
				if (!text || !hasNaturalLanguageText(text)) return;
				if (text === '...' || isUrlOrPath(text) || !Number.isNaN(Number(text)) || text.startsWith('{{')) return;

				const parent = node.parent;
				if (!parent || parent.type !== 'JSXOpeningElement') return;
				const tagName = getTagName(parent);
				if (!tagName) return;
				if (!acceptedTags.has(tagName)) return;
				if (ignoredTags.has(tagName)) return;

				context.report({ node, messageId: 'hardcodedText', data: { text }, fix: buildFix(node, text, node.value) });
			},
		};
	},
};
