import { duplicateSuffixRule } from './duplicate-suffix';
import { interpolationParamsRule } from './interpolation-params';
import { invalidCharRule } from './invalid-char';
import { invalidLayerRule } from './invalid-layer';
import { invalidPrefixRule } from './invalid-prefix';
import { invalidSegmentRule } from './invalid-segment';
import { invalidStructureRule } from './invalid-structure';
import { noLiteralStringRule } from './no-literal-string';
import { preferInterpolationRule } from './prefer-interpolation';
import { requireDefaultValueRule } from './require-default-value';

export const rules = {
	'invalid-char': invalidCharRule,
	'invalid-structure': invalidStructureRule,
	'invalid-segment': invalidSegmentRule,
	'invalid-prefix': invalidPrefixRule,
	'invalid-layer': invalidLayerRule,
	'duplicate-suffix': duplicateSuffixRule,
	'require-default-value': requireDefaultValueRule,
	'no-literal-string': noLiteralStringRule,
	'interpolation-params': interpolationParamsRule,
	'prefer-interpolation': preferInterpolationRule,
};
