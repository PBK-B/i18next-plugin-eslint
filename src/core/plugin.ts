/*
 * @Author: Bin
 * @Date: 2026-02-26
 * @FilePath: /i18next-plugin-eslint/i18n-key-format.js
 */
const DEFAULT_ALLOWED_PREFIXES = undefined;
const DEFAULT_SOURCE_ROOT = '';
const DEFAULT_SHARED_LAYERS = [];
const RECOMMENDED_ACCEPTED_TAGS = [
	'a',
	'abbr',
	'address',
	'article',
	'aside',
	'bdi',
	'bdo',
	'blockquote',
	'button',
	'caption',
	'cite',
	'code',
	'data',
	'dd',
	'del',
	'details',
	'dfn',
	'dialog',
	'div',
	'dt',
	'em',
	'figcaption',
	'footer',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'header',
	'img',
	'ins',
	'kbd',
	'label',
	'legend',
	'li',
	'main',
	'mark',
	'nav',
	'option',
	'output',
	'p',
	'pre',
	'q',
	's',
	'samp',
	'section',
	'small',
	'span',
	'strong',
	'sub',
	'summary',
	'sup',
	'td',
	'textarea',
	'th',
	'time',
	'title',
	'var',
];
const RECOMMENDED_ACCEPTED_ATTRIBUTES = [
	'abbr',
	'accesskey',
	'alt',
	'aria-description',
	'aria-label',
	'aria-placeholder',
	'aria-roledescription',
	'aria-valuetext',
	'content',
	'label',
	'placeholder',
	'summary',
	'title',
];
const DEFAULT_IGNORED_ATTRIBUTES = ['classname', 'key', 'id', 'style', 'href', 'i18nkey', 'defaults', 'type', 'target'];
const DEFAULT_IGNORED_TAGS = ['script', 'style', 'code', 'trans', 'translation'];

function normalizeAllowedPrefixes(value) {
	if (!Array.isArray(value)) return undefined;
	return value;
}

function toSnakeCase(value) {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.replace(/[-\s]+/g, '_')
		.toLowerCase();
}

function normalizeSegment(segment) {
	let normalized = toSnakeCase(segment).replace(/[^a-z0-9_]+/g, '_');
	normalized = normalized.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
	if (!normalized) return 'key';
	if (!/^[a-z]/.test(normalized)) return `k_${normalized}`;
	return normalized;
}

function normalizeKey(key) {
	let normalized = key
		.trim()
		.replace(/[\\/]+/g, '.')
		.toLowerCase();
	normalized = normalized
		.replace(/[^a-z0-9._]+/g, '_')
		.replace(/\.{2,}/g, '.')
		.replace(/^\.+|\.+$/g, '');
	const rawSegments = normalized ? normalized.split('.') : [];
	const segments = rawSegments.map((part) => normalizeSegment(part));
	return segments.join('.');
}

function escapeForQuote(value, quote) {
	return value.replace(/\\/g, '\\\\').replaceAll(quote, `\\${quote}`);
}

function toLiteralText(node, value) {
	if (node.type === 'TemplateLiteral') {
		return `\`${value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}\``;
	}

	const raw = typeof node.raw === 'string' ? node.raw : null;
	const quote = raw && (raw.startsWith('"') || raw.startsWith("'")) ? raw[0] : "'";
	return `${quote}${escapeForQuote(value, quote)}${quote}`;
}

function isValidSegment(segment) {
	return /^[a-z][a-z0-9_]*$/.test(segment);
}

function isValidKey(key, allowedPrefixes) {
	if (!/^[a-z0-9._]+$/.test(key)) return false;
	const segments = key.split('.');
	if (segments.length < 3) return false;
	for (const segment of segments) {
		if (!isValidSegment(segment)) return false;
	}
	if (Array.isArray(allowedPrefixes) && allowedPrefixes.length > 0 && !allowedPrefixes.includes(segments[0])) return false;
	return true;
}

function getExpectedLayer(filename, sourceRoot) {
	const normalizedFile = filename.replace(/\\/g, '/');
	const normalizedRoot = sourceRoot.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
	let relative;

	if (normalizedRoot === '' || normalizedRoot === '.') {
		const normalizedCwd = process.cwd().replace(/\\/g, '/').replace(/\/+$/g, '');
		const cwdPrefix = `${normalizedCwd}/`;
		relative = normalizedFile.startsWith(cwdPrefix) ? normalizedFile.slice(cwdPrefix.length) : normalizedFile;
	} else {
		const marker = `/${normalizedRoot}/`;
		const idx = normalizedFile.lastIndexOf(marker);
		if (idx === -1) return null;
		relative = normalizedFile.slice(idx + marker.length);
	}

	const extMatch = relative.match(/\.([^./]+)$/);
	if (!extMatch) return null;

	const withoutExt = relative.slice(0, -extMatch[0].length);
	const layer = withoutExt
		.split('/')
		.filter(Boolean)
		.map((part) => normalizeSegment(part))
		.join('.');

	return layer || null;
}

function getStringValue(node) {
	if (!node) return null;
	if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
	if (node.type === 'TemplateLiteral' && node.expressions.length === 0 && node.quasis.length === 1) {
		return node.quasis[0].value.cooked ?? node.quasis[0].value.raw;
	}
	return null;
}

function isI18nTranslateCall(node, trackedTNames) {
	if (node.callee.type === 'Identifier') return trackedTNames.has(node.callee.name);
	if (node.callee.type === 'MemberExpression' && !node.callee.computed) {
		return node.callee.property.type === 'Identifier' && node.callee.property.name === 't';
	}
	return false;
}

function createCommonVisitors(context, onKey) {
	const trackedTNames = new Set(['t']);
	const useTranslationNames = new Set(['useTranslation']);

	return {
		ImportDeclaration(node) {
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

		VariableDeclarator(node) {
			if (!node.init || node.init.type !== 'CallExpression') return;
			if (node.init.callee.type !== 'Identifier' || !useTranslationNames.has(node.init.callee.name)) return;
			if (node.id.type !== 'ObjectPattern') return;

			for (const prop of node.id.properties) {
				if (prop.type !== 'Property') continue;
				if (prop.key.type !== 'Identifier' || prop.key.name !== 't') continue;
				if (prop.value.type === 'Identifier') trackedTNames.add(prop.value.name);
			}
		},

		CallExpression(node) {
			if (!isI18nTranslateCall(node, trackedTNames)) return;
			const key = getStringValue(node.arguments[0]);
			if (key == null) return;
			onKey(node.arguments[0], key);
		},
	};
}

function withFix(node, nextKey) {
	return (fixer) => fixer.replaceText(node, toLiteralText(node, nextKey));
}

function getObjectExpression(node) {
	if (!node) return null;
	if (node.type === 'ObjectExpression') return node;
	return null;
}

function getStaticPropertyName(prop) {
	if (!prop || prop.type !== 'Property') return null;
	if (prop.computed) return null;
	if (prop.key.type === 'Identifier') return prop.key.name;
	if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') return prop.key.value;
	return null;
}

function getStaticStringFromNode(node) {
	if (!node) return null;
	if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
	if (node.type === 'TemplateLiteral' && node.expressions.length === 0 && node.quasis.length === 1) {
		return node.quasis[0].value.cooked ?? node.quasis[0].value.raw;
	}
	return null;
}

function getStringLiteralAttributeValue(node) {
	if (!node || node.type !== 'JSXAttribute' || !node.value) return null;
	if (node.value.type === 'Literal' && typeof node.value.value === 'string') return node.value.value;
	if (node.value.type === 'JSXExpressionContainer') return getStaticStringFromNode(node.value.expression);
	return null;
}

function hasNaturalLanguageText(value) {
	return /[A-Za-z\u00C0-\u024F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/.test(value);
}

function isUrlOrPath(value) {
	return /^(https?:\/\/|\/|\.\/|\.\.\/|#|mailto:|tel:)/i.test(value);
}

function extractInterpolationKeys(text) {
	const keys = new Set();
	const pattern = /{{\s*([a-zA-Z_][\w.]*)\s*}}/g;
	for (const match of text.matchAll(pattern)) {
		if (match[1]) keys.add(match[1]);
	}
	return keys;
}

function getObjectPropertyMap(objectExpr) {
	const map = new Map();
	if (!objectExpr || objectExpr.type !== 'ObjectExpression') return map;
	for (const prop of objectExpr.properties) {
		if (prop.type !== 'Property') continue;
		const name = getStaticPropertyName(prop);
		if (!name) continue;
		map.set(name, prop.value);
	}
	return map;
}

function findDefaultValueNode(callNode) {
	const arg1 = callNode.arguments[1];
	const arg2 = callNode.arguments[2];

	if (arg1) {
		if (arg1.type === 'ObjectExpression') {
			for (const prop of arg1.properties) {
				if (prop.type !== 'Property') continue;
				const name = getStaticPropertyName(prop);
				if (name === 'defaultValue') return prop.value;
			}
		} else {
			return arg1;
		}
	}

	if (arg2 && arg2.type === 'ObjectExpression') {
		for (const prop of arg2.properties) {
			if (prop.type !== 'Property') continue;
			const name = getStaticPropertyName(prop);
			if (name === 'defaultValue') return prop.value;
		}
	}

	return null;
}

const baseSchema = {
	type: 'object',
	properties: {
		allowedPrefixes: {
			anyOf: [
				{
					type: 'array',
					items: { type: 'string' },
				},
				{ type: 'null' },
			],
		},
		sourceRoot: {
			type: 'string',
		},
		sharedLayers: {
			type: 'array',
			items: { type: 'string' },
		},
		checkInterpolationParams: {
			type: 'boolean',
		},
		requireDefaultValue: {
			anyOf: [{ type: 'boolean' }, { enum: ['required', 'forbidden'] }],
		},
		defaultValuePolicy: {
			type: 'string',
			enum: ['required', 'forbidden'],
		},
		disabledRules: {
			type: 'array',
			items: {
				type: 'string',
				enum: ['invalid-char', 'invalid-structure', 'invalid-segment', 'invalid-prefix', 'invalid-layer', 'duplicate-suffix', 'require-default-value'],
			},
		},
	},
	additionalProperties: true,
};

const lintSchema = {
	type: 'object',
	properties: {
		allowedPrefixes: {
			anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }],
		},
		sourceRoot: {
			type: 'string',
		},
		sharedLayers: {
			type: 'array',
			items: { type: 'string' },
		},
		checkInterpolationParams: {
			type: 'boolean',
		},
		requireDefaultValue: {
			anyOf: [{ type: 'boolean' }, { enum: ['required', 'forbidden'] }],
		},
		defaultValuePolicy: {
			type: 'string',
			enum: ['required', 'forbidden'],
		},
		disabledRules: {
			type: 'array',
			items: {
				type: 'string',
				enum: ['invalid-char', 'invalid-structure', 'invalid-segment', 'invalid-prefix', 'invalid-layer', 'duplicate-suffix', 'require-default-value'],
			},
		},
		acceptedAttributes: {
			type: 'array',
			items: { type: 'string' },
		},
		acceptedTags: {
			type: 'array',
			items: { type: 'string' },
		},
		ignoredAttributes: {
			type: 'array',
			items: { type: 'string' },
		},
		ignoredTags: {
			type: 'array',
			items: { type: 'string' },
		},
		autoFix: {
			type: 'boolean',
		},
		fixPrefix: {
			type: 'string',
		},
		i18nImportSource: {
			type: 'string',
		},
	},
	additionalProperties: true,
};

const invalidCharRule = {
	meta: {
		type: 'problem',
		fixable: 'code',
		docs: { description: 'Validate i18n key characters' },
		schema: [baseSchema],
		messages: {
			invalidChar: 'i18n key "{{key}}" 只能包含小写字母、数字、下划线和点。',
		},
	},
	create(context) {
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

const invalidStructureRule = {
	meta: {
		type: 'problem',
		docs: { description: 'Validate i18n key structure' },
		schema: [baseSchema],
		messages: {
			invalidStructure: 'i18n key "{{key}}" 必须满足 ${prefix}.${layer}.${suffix}，至少包含 3 段。',
		},
	},
	create(context) {
		return createCommonVisitors(context, (node, key) => {
			if (key.split('.').length >= 3) return;
			context.report({ node, messageId: 'invalidStructure', data: { key } });
		});
	},
};

const invalidSegmentRule = {
	meta: {
		type: 'problem',
		fixable: 'code',
		docs: { description: 'Validate i18n key segment naming' },
		schema: [baseSchema],
		messages: {
			invalidSegment: 'i18n key "{{key}}" 的分段 "{{segment}}" 不符合命名规范（需小写 snake_case，且不能以数字开头）。',
		},
	},
	create(context) {
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

const invalidPrefixRule = {
	meta: {
		type: 'problem',
		fixable: 'code',
		docs: { description: 'Validate i18n key prefix allow-list' },
		schema: [baseSchema],
		messages: {
			invalidPrefix: 'i18n key "{{key}}" 的 prefix "{{prefix}}" 不在允许列表中：{{prefixes}}。',
		},
	},
	create(context) {
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

const invalidLayerRule = {
	meta: {
		type: 'problem',
		fixable: 'code',
		docs: { description: 'Validate i18n key layer against file path' },
		schema: [baseSchema],
		messages: {
			invalidLayer: 'i18n key "{{key}}" 的 layer "{{layer}}" 与文件路径要求不一致，期望 "{{expected}}"。',
		},
	},
	create(context) {
		const options = context.options[0] ?? {};
		const sourceRoot = options.sourceRoot ?? DEFAULT_SOURCE_ROOT;
		const sharedLayers = new Set((options.sharedLayers ?? DEFAULT_SHARED_LAYERS).map((item) => String(item)));
		const expectedLayer = getExpectedLayer(context.filename, sourceRoot);
		const allowedPrefixes = normalizeAllowedPrefixes(options.allowedPrefixes ?? DEFAULT_ALLOWED_PREFIXES);

		if (!expectedLayer) return {};

		return createCommonVisitors(context, (node, key) => {
			const segments = key.split('.');
			if (segments.length < 3) return;
			const layer = segments.slice(1, -1).join('.');
			if (sharedLayers.has(layer) || layer === expectedLayer) return;

			const fixedKey = [segments[0], expectedLayer, segments[segments.length - 1]].join('.');
			const fix = isValidKey(fixedKey, allowedPrefixes) ? withFix(node, fixedKey) : null;
			context.report({ node, messageId: 'invalidLayer', data: { key, layer, expected: expectedLayer }, fix });
		});
	},
};

const duplicateSuffixRule = {
	meta: {
		type: 'problem',
		fixable: 'code',
		docs: { description: 'Disallow duplicate i18n key suffix in one file' },
		schema: [baseSchema],
		messages: {
			duplicateSuffix: '同一文件中 i18n key 后缀 "{{suffix}}" 重复（首次出现在第 {{line}} 行）。',
		},
	},
	create(context) {
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

const requireDefaultValueRule = {
	meta: {
		type: 'problem',
		docs: { description: 'Require default value in i18n translate calls' },
		schema: [baseSchema],
		messages: {
			missingDefaultValue: 'i18n key "{{key}}" 未配置默认值，请为 t() 调用提供默认文案。',
			forbiddenDefaultValue: 'i18n key "{{key}}" 不允许配置默认值，请移除 t() 调用中的默认文案。',
		},
	},
	create(context) {
		const options = context.options[0] ?? {};
		const defaultValuePolicy = typeof options.defaultValuePolicy === 'string' ? options.defaultValuePolicy : options.requireDefaultValue === false ? 'forbidden' : 'required';

		const trackedTNames = new Set(['t']);
		const useTranslationNames = new Set(['useTranslation']);

		return {
			ImportDeclaration(node) {
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

			VariableDeclarator(node) {
				if (!node.init || node.init.type !== 'CallExpression') return;
				if (node.init.callee.type !== 'Identifier' || !useTranslationNames.has(node.init.callee.name)) return;
				if (node.id.type !== 'ObjectPattern') return;

				for (const prop of node.id.properties) {
					if (prop.type !== 'Property') continue;
					if (prop.key.type !== 'Identifier' || prop.key.name !== 't') continue;
					if (prop.value.type === 'Identifier') trackedTNames.add(prop.value.name);
				}
			},

			CallExpression(node) {
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

const noLiteralStringRule = {
	meta: {
		type: 'problem',
		fixable: 'code',
		docs: { description: 'Disallow hardcoded natural-language strings in JSX' },
		schema: [lintSchema],
		messages: {
			hardcodedText: '检测到硬编码文案 "{{text}}"，请使用 i18n key。',
		},
	},
	create(context) {
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
			(Array.isArray(options.acceptedAttributes) ? options.acceptedAttributes : RECOMMENDED_ACCEPTED_ATTRIBUTES).map((item) => String(item).toLowerCase()),
		);
		const acceptedTags = new Set((Array.isArray(options.acceptedTags) ? options.acceptedTags : RECOMMENDED_ACCEPTED_TAGS).map((item) => String(item).toLowerCase()));
		const ignoredAttributes = new Set((options.ignoredAttributes ?? DEFAULT_IGNORED_ATTRIBUTES).map((item) => String(item).toLowerCase()));
		const ignoredTags = new Set((options.ignoredTags ?? DEFAULT_IGNORED_TAGS).map((item) => String(item).toLowerCase()));

		function getTagName(openingElement) {
			if (!openingElement || openingElement.name.type !== 'JSXIdentifier') return null;
			return openingElement.name.name.toLowerCase();
		}

		function getCallName() {
			if (trackedTNames.has('t')) return 't';
			const first = trackedTNames.values().next();
			if (!first.done) return first.value;
			return null;
		}

		function toSingleQuotedText(value) {
			return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
		}

		function createKeyFromText(text) {
			const normalized = normalizeSegment(text);
			const baseSuffix = normalized === 'key' ? 'literal_text' : `literal_${normalized}`;
			const count = (suffixCountMap.get(baseSuffix) ?? 0) + 1;
			suffixCountMap.set(baseSuffix, count);
			const suffix = count === 1 ? baseSuffix : `${baseSuffix}_${count}`;
			return `${prefix}.${expectedLayer}.${suffix}`;
		}

		function buildFix(nodeForReport, text, replaceNode, keepWhitespace = false) {
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

			return (fixer) => {
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
			ImportDeclaration(node) {
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

			VariableDeclarator(node) {
				if (!node.init || node.init.type !== 'CallExpression') return;
				if (node.init.callee.type !== 'Identifier' || !useTranslationNames.has(node.init.callee.name)) return;
				if (node.id.type !== 'ObjectPattern') return;

				for (const prop of node.id.properties) {
					if (prop.type !== 'Property') continue;
					if (prop.key.type !== 'Identifier' || prop.key.name !== 't') continue;
					if (prop.value.type === 'Identifier') trackedTNames.add(prop.value.name);
				}
			},

			JSXText(node) {
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

			JSXAttribute(node) {
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

const interpolationParamsRule = {
	meta: {
		type: 'problem',
		docs: { description: 'Check interpolation params in defaultValue and options' },
		schema: [baseSchema],
		messages: {
			missingInterpolation: 'i18n 默认文案中使用了插值参数 "{{name}}"，但 options 未提供该参数。',
			unusedInterpolation: 'i18n options 传入了 "{{name}}"，但默认文案未使用该参数。',
		},
	},
	create(context) {
		const options = context.options[0] ?? {};
		const checkInterpolationParams = options.checkInterpolationParams !== false;
		if (!checkInterpolationParams) return {};

		const trackedTNames = new Set(['t']);
		const useTranslationNames = new Set(['useTranslation']);
		const ignoredOptionKeys = new Set(['defaultValue', 'ns', 'count', 'context', 'ordinal', 'returnObjects', 'joinArrays', 'postProcess', 'fallbackLng']);

		function resolveDefaultValueAndOptions(callNode) {
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
			ImportDeclaration(node) {
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

			VariableDeclarator(node) {
				if (!node.init || node.init.type !== 'CallExpression') return;
				if (node.init.callee.type !== 'Identifier' || !useTranslationNames.has(node.init.callee.name)) return;
				if (node.id.type !== 'ObjectPattern') return;

				for (const prop of node.id.properties) {
					if (prop.type !== 'Property') continue;
					if (prop.key.type !== 'Identifier' || prop.key.name !== 't') continue;
					if (prop.value.type === 'Identifier') trackedTNames.add(prop.value.name);
				}
			},

			CallExpression(node) {
				if (!isI18nTranslateCall(node, trackedTNames)) return;
				const resolved = resolveDefaultValueAndOptions(node);
				if (!resolved.defaultValue || !resolved.optionsObject) return;

				const textParams = extractInterpolationKeys(resolved.defaultValue);
				if (textParams.size === 0) return;

				const optionProps = getObjectPropertyMap(resolved.optionsObject);
				const optionKeys = new Set();
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

export function createI18nRulesConfig(level = 'error', options = {}) {
	return {
		'i18n-key/invalid-char': [level, options],
		'i18n-key/invalid-structure': [level, options],
		'i18n-key/invalid-segment': [level, options],
		'i18n-key/invalid-prefix': [level, options],
		'i18n-key/invalid-layer': [level, options],
		'i18n-key/duplicate-suffix': [level, options],
		'i18n-key/require-default-value': [level, options],
	};
}

export function createI18nLintRulesConfig(level = 'warn', options = {}) {
	return {
		'i18n-key/no-literal-string': [level, options],
		'i18n-key/interpolation-params': [level, options],
	};
}

const rules = {
	'invalid-char': invalidCharRule,
	'invalid-structure': invalidStructureRule,
	'invalid-segment': invalidSegmentRule,
	'invalid-prefix': invalidPrefixRule,
	'invalid-layer': invalidLayerRule,
	'duplicate-suffix': duplicateSuffixRule,
	'require-default-value': requireDefaultValueRule,
	'no-literal-string': noLiteralStringRule,
	'interpolation-params': interpolationParamsRule,
};

const i18nKeyPlugin = {
	rules,
	configs: {
		recommended: {
			rules: {
				...createI18nRulesConfig('error'),
				...createI18nLintRulesConfig('warn'),
			},
		},
		strict: {
			rules: {
				...createI18nRulesConfig('error'),
				...createI18nLintRulesConfig('error'),
			},
		},
		relaxed: {
			rules: {
				...createI18nRulesConfig('warn'),
				...createI18nLintRulesConfig('warn'),
			},
		},
	},
};

export default i18nKeyPlugin;
