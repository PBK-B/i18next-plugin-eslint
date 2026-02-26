export const DEFAULT_ALLOWED_PREFIXES = undefined;
export const DEFAULT_SOURCE_ROOT = '';
export const DEFAULT_SHARED_LAYERS: string[] = [];

export const RECOMMENDED_ACCEPTED_TAGS = [
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

export const RECOMMENDED_ACCEPTED_ATTRIBUTES = [
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

export const DEFAULT_IGNORED_ATTRIBUTES = ['classname', 'key', 'id', 'style', 'href', 'i18nkey', 'defaults', 'type', 'target'];
export const DEFAULT_IGNORED_TAGS = ['script', 'style', 'code', 'trans', 'translation'];

export function normalizeAllowedPrefixes(value: unknown) {
	if (!Array.isArray(value)) return undefined;
	return value;
}

export function toSnakeCase(value: string) {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.replace(/[-\s]+/g, '_')
		.toLowerCase();
}

export function normalizeSegment(segment: string) {
	let normalized = toSnakeCase(segment).replace(/[^a-z0-9_]+/g, '_');
	normalized = normalized.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
	if (!normalized) return 'key';
	if (!/^[a-z]/.test(normalized)) return `k_${normalized}`;
	return normalized;
}

export function normalizeKey(key: string) {
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

export function escapeForQuote(value: string, quote: string) {
	return value.replace(/\\/g, '\\\\').replaceAll(quote, `\\${quote}`);
}

export function toLiteralText(node: any, value: string) {
	if (node.type === 'TemplateLiteral') {
		return `\`${value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}\``;
	}

	const raw = typeof node.raw === 'string' ? node.raw : null;
	const quote = raw && (raw.startsWith('"') || raw.startsWith("'")) ? raw[0] : "'";
	return `${quote}${escapeForQuote(value, quote)}${quote}`;
}

export function isValidSegment(segment: string) {
	return /^[a-z][a-z0-9_]*$/.test(segment);
}

export function isValidKey(key: string, allowedPrefixes: string[] | undefined) {
	if (!/^[a-z0-9._]+$/.test(key)) return false;
	const segments = key.split('.');
	if (segments.length < 3) return false;
	for (const segment of segments) {
		if (!isValidSegment(segment)) return false;
	}
	if (Array.isArray(allowedPrefixes) && allowedPrefixes.length > 0 && !allowedPrefixes.includes(segments[0])) return false;
	return true;
}

export function getExpectedLayer(filename: string, sourceRoot: string) {
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

export function getStringValue(node: any) {
	if (!node) return null;
	if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
	if (node.type === 'TemplateLiteral' && node.expressions.length === 0 && node.quasis.length === 1) {
		return node.quasis[0].value.cooked ?? node.quasis[0].value.raw;
	}
	return null;
}

export function isI18nTranslateCall(node: any, trackedTNames: Set<string>) {
	if (node.callee.type === 'Identifier') return trackedTNames.has(node.callee.name);
	if (node.callee.type === 'MemberExpression' && !node.callee.computed) {
		return node.callee.property.type === 'Identifier' && node.callee.property.name === 't';
	}
	return false;
}

export function createCommonVisitors(context: any, onKey: (node: any, key: string) => void) {
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
			onKey(node.arguments[0], key);
		},
	};
}

export function withFix(node: any, nextKey: string) {
	return (fixer: any) => fixer.replaceText(node, toLiteralText(node, nextKey));
}

export function getObjectExpression(node: any) {
	if (!node) return null;
	if (node.type === 'ObjectExpression') return node;
	return null;
}

export function getStaticPropertyName(prop: any) {
	if (!prop || prop.type !== 'Property') return null;
	if (prop.computed) return null;
	if (prop.key.type === 'Identifier') return prop.key.name;
	if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') return prop.key.value;
	return null;
}

export function getStaticStringFromNode(node: any) {
	if (!node) return null;
	if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
	if (node.type === 'TemplateLiteral' && node.expressions.length === 0 && node.quasis.length === 1) {
		return node.quasis[0].value.cooked ?? node.quasis[0].value.raw;
	}
	return null;
}

export function getStringLiteralAttributeValue(node: any) {
	if (!node || node.type !== 'JSXAttribute' || !node.value) return null;
	if (node.value.type === 'Literal' && typeof node.value.value === 'string') return node.value.value;
	if (node.value.type === 'JSXExpressionContainer') return getStaticStringFromNode(node.value.expression);
	return null;
}

export function hasNaturalLanguageText(value: string) {
	return /[A-Za-z\u00C0-\u024F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/.test(value);
}

export function isUrlOrPath(value: string) {
	return /^(https?:\/\/|\/|\.\/|\.\.\/|#|mailto:|tel:)/i.test(value);
}

export function extractInterpolationKeys(text: string) {
	const keys = new Set<string>();
	const pattern = /{{\s*([a-zA-Z_][\w.]*)\s*}}/g;
	for (const match of text.matchAll(pattern)) {
		if (match[1]) keys.add(match[1]);
	}
	return keys;
}

export function getObjectPropertyMap(objectExpr: any) {
	const map = new Map<string, any>();
	if (!objectExpr || objectExpr.type !== 'ObjectExpression') return map;
	for (const prop of objectExpr.properties) {
		if (prop.type !== 'Property') continue;
		const name = getStaticPropertyName(prop);
		if (!name) continue;
		map.set(name, prop.value);
	}
	return map;
}

export function findDefaultValueNode(callNode: any) {
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
