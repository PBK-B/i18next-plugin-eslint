import {
	DEFAULT_ALLOWED_PREFIXES,
	DEFAULT_SHARED_LAYERS,
	DEFAULT_SOURCE_ROOT,
	createCommonVisitors,
	getExpectedLayer,
	isValidKey,
	normalizeAllowedPrefixes,
	withFix,
} from './helpers';
import { baseSchema } from './schemas';

export const invalidLayerRule = {
	meta: {
		type: 'problem',
		fixable: 'code',
		docs: { description: 'Validate i18n key layer against file path' },
		schema: [baseSchema],
		messages: {
			invalidLayer: 'The layer "{{layer}}" in i18n key "{{key}}" does not match the file path; expected "{{expected}}".',
		},
	},
	create(context: any) {
		const options = context.options[0] ?? {};
		const sourceRoot = options.sourceRoot ?? DEFAULT_SOURCE_ROOT;
		const sharedLayers = new Set((options.sharedLayers ?? DEFAULT_SHARED_LAYERS).map((item: any) => String(item)));
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
