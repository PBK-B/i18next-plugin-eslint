import { describe, expect, it } from 'vitest';
import {
	DEFAULT_ALLOWED_PREFIXES,
	DEFAULT_IGNORED_ATTRIBUTES,
	DEFAULT_IGNORED_TAGS,
	DEFAULT_SHARED_LAYERS,
	DEFAULT_SOURCE_ROOT,
	RECOMMENDED_ACCEPTED_ATTRIBUTES,
	RECOMMENDED_ACCEPTED_TAGS,
	createCommonVisitors,
	escapeForQuote,
	extractInterpolationKeys,
	findDefaultValueNode,
	getExpectedLayer,
	getObjectExpression,
	getObjectPropertyMap,
	getStaticPropertyName,
	getStaticStringFromNode,
	getStringLiteralAttributeValue,
	getStringValue,
	hasNaturalLanguageText,
	isI18nTranslateCall,
	isUrlOrPath,
	isValidKey,
	isValidSegment,
	normalizeAllowedPrefixes,
	normalizeKey,
	normalizeSegment,
	toLiteralText,
	toSnakeCase,
} from '../src/rules/helpers';

describe('helpers constants', () => {
	it('exposes default and recommended constants', () => {
		expect(DEFAULT_ALLOWED_PREFIXES).toBeUndefined();
		expect(DEFAULT_SOURCE_ROOT).toBe('');
		expect(DEFAULT_SHARED_LAYERS).toEqual([]);
		expect(DEFAULT_IGNORED_ATTRIBUTES).toContain('classname');
		expect(DEFAULT_IGNORED_TAGS).toContain('script');
		expect(RECOMMENDED_ACCEPTED_ATTRIBUTES).toContain('title');
		expect(RECOMMENDED_ACCEPTED_TAGS).toContain('span');
	});
});

describe('helpers string and key transforms', () => {
	it('normalizes prefixes and casing', () => {
		expect(normalizeAllowedPrefixes(['a'])).toEqual(['a']);
		expect(normalizeAllowedPrefixes('a')).toBeUndefined();
		expect(toSnakeCase('MyKey Value')).toBe('my_key_value');
		expect(normalizeSegment('123 Value')).toBe('k_123_value');
		expect(normalizeSegment('___')).toBe('key');
		expect(normalizeKey(' App/Main.Title@Name ')).toBe('app.main.title_name');
	});

	it('validates segments and keys', () => {
		expect(isValidSegment('abc_1')).toBe(true);
		expect(isValidSegment('1abc')).toBe(false);
		expect(isValidKey('app.pages.home.title', ['app'])).toBe(true);
		expect(isValidKey('bad.pages.home.title', ['app'])).toBe(false);
		expect(isValidKey('app.bad', ['app'])).toBe(false);
	});

	it('escapes and renders literals', () => {
		expect(escapeForQuote("a'b", "'")).toBe("a\\'b");
		const literalNode = { type: 'Literal', raw: '"old"' };
		expect(toLiteralText(literalNode, 'next"key')).toBe('"next\\"key"');
		const tplNode = { type: 'TemplateLiteral' };
		expect(toLiteralText(tplNode, 'a${b}`c')).toBe('`a\\${b}\\`c`');
	});
});

describe('helpers ast utils', () => {
	it('extracts expected layer from file path', () => {
		const file = `${process.cwd()}/src/pages/main/index.tsx`;
		expect(getExpectedLayer(file, '')).toBe('src.pages.main.index');
		expect(getExpectedLayer(file, 'src')).toBe('pages.main.index');
		expect(getExpectedLayer('foo/noext', 'src')).toBeNull();
	});

	it('reads string literals from nodes', () => {
		expect(getStringValue({ type: 'Literal', value: 'x' })).toBe('x');
		expect(getStringValue({ type: 'TemplateLiteral', expressions: [], quasis: [{ value: { cooked: 'y', raw: 'y' } }] })).toBe('y');
		expect(getStringValue({ type: 'Literal', value: 1 })).toBeNull();
		expect(getStaticStringFromNode({ type: 'Literal', value: 'z' })).toBe('z');
		expect(getStaticStringFromNode({ type: 'TemplateLiteral', expressions: [], quasis: [{ value: { raw: 'r' } }] })).toBe('r');
	});

	it('matches translate call forms', () => {
		expect(isI18nTranslateCall({ callee: { type: 'Identifier', name: 't' } }, new Set(['t']))).toBe(true);
		expect(isI18nTranslateCall({ callee: { type: 'MemberExpression', computed: false, property: { type: 'Identifier', name: 't' } } }, new Set(['x']))).toBe(true);
		expect(isI18nTranslateCall({ callee: { type: 'Identifier', name: 'x' } }, new Set(['t']))).toBe(false);
		expect(isI18nTranslateCall({ callee: { type: 'MemberExpression', computed: true, property: { type: 'Identifier', name: 't' } } }, new Set(['t']))).toBe(false);
	});

	it('handles object and jsx helpers', () => {
		expect(getObjectExpression({ type: 'ObjectExpression' })).toEqual({ type: 'ObjectExpression' });
		expect(getObjectExpression({ type: 'Literal' })).toBeNull();
		expect(getStaticPropertyName({ type: 'Property', computed: false, key: { type: 'Identifier', name: 'n' } })).toBe('n');
		expect(getStaticPropertyName({ type: 'Property', computed: false, key: { type: 'Literal', value: 'm' } })).toBe('m');
		expect(getStaticPropertyName({ type: 'Property', computed: true, key: { type: 'Identifier', name: 'n' } })).toBeNull();
		expect(getStaticPropertyName({ type: 'Property', computed: false, key: { type: 'Literal', value: 1 } })).toBeNull();

		expect(getStringLiteralAttributeValue({ type: 'JSXAttribute', value: { type: 'Literal', value: 'txt' } })).toBe('txt');
		expect(
			getStringLiteralAttributeValue({
				type: 'JSXAttribute',
				value: { type: 'JSXExpressionContainer', expression: { type: 'Literal', value: 'exp' } },
			}),
		).toBe('exp');
		expect(
			getStringLiteralAttributeValue({
				type: 'JSXAttribute',
				value: { type: 'JSXExpressionContainer', expression: { type: 'Identifier', name: 'x' } },
			}),
		).toBeNull();
	});

	it('handles natural language, paths and interpolation extraction', () => {
		expect(hasNaturalLanguageText('Hello')).toBe(true);
		expect(hasNaturalLanguageText('')).toBe(false);
		expect(isUrlOrPath('https://x')).toBe(true);
		expect(isUrlOrPath('title text')).toBe(false);
		expect(Array.from(extractInterpolationKeys('{{count}} - {{name}}'))).toEqual(['count', 'name']);
	});

	it('handles object property map and default value lookup', () => {
		const objectExpr = {
			type: 'ObjectExpression',
			properties: [
				{ type: 'Property', computed: false, key: { type: 'Identifier', name: 'defaultValue' }, value: { type: 'Literal', value: 'd' } },
				{ type: 'Property', computed: false, key: { type: 'Identifier', name: 'count' }, value: { type: 'Literal', value: 1 } },
			],
		};
		const map = getObjectPropertyMap(objectExpr);
		expect(map.get('count')).toEqual({ type: 'Literal', value: 1 });

		expect(findDefaultValueNode({ arguments: [{}, objectExpr] })).toEqual({ type: 'Literal', value: 'd' });
		expect(findDefaultValueNode({ arguments: [{}, { type: 'Literal', value: 's' }] })).toEqual({ type: 'Literal', value: 's' });
		expect(findDefaultValueNode({ arguments: [{}, undefined, objectExpr] })).toEqual({ type: 'Literal', value: 'd' });
	});

	it('creates common visitors and captures calls', () => {
		const reports: Array<{ key: string }> = [];
		const context = {};
		const visitors = createCommonVisitors(context, (_node, key) => {
			reports.push({ key });
		});

		visitors.ImportDeclaration({
			specifiers: [
				{ type: 'ImportSpecifier', imported: { type: 'Identifier', name: 't' }, local: { name: 'tt' } },
				{ type: 'ImportSpecifier', imported: { type: 'Identifier', name: 'useTranslation' }, local: { name: 'useT' } },
			],
		});

		visitors.VariableDeclarator({
			init: { type: 'CallExpression', callee: { type: 'Identifier', name: 'useT' } },
			id: {
				type: 'ObjectPattern',
				properties: [{ type: 'Property', key: { type: 'Identifier', name: 't' }, value: { type: 'Identifier', name: 'tx' } }],
			},
		});

		visitors.CallExpression({
			callee: { type: 'Identifier', name: 'tx' },
			arguments: [{ type: 'Literal', value: 'app.pages.home.title' }],
		});

		expect(reports).toEqual([{ key: 'app.pages.home.title' }]);
	});
});
