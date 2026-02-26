export const baseSchema = {
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

export const lintSchema = {
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
