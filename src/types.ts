export type RuleLevel = 'off' | 'warn' | 'error';

export type DefaultValuePolicy = 'required' | 'forbidden';

export interface BaseI18nRuleOptions {
  allowedPrefixes?: string[] | null;
  sourceRoot?: string;
  sharedLayers?: string[];
  checkInterpolationParams?: boolean;
  requireDefaultValue?: boolean;
  defaultValuePolicy?: DefaultValuePolicy;
  disabledRules?: Array<
    | 'invalid-char'
    | 'invalid-structure'
    | 'invalid-segment'
    | 'invalid-prefix'
    | 'invalid-layer'
    | 'duplicate-suffix'
    | 'require-default-value'
  >;
}

export type I18nRuleOptions = BaseI18nRuleOptions;

export interface I18nLintRuleOptions extends BaseI18nRuleOptions {
  acceptedAttributes?: string[];
  acceptedTags?: string[];
  ignoredAttributes?: string[];
  ignoredTags?: string[];
  autoFix?: boolean;
  fixPrefix?: string;
  i18nImportSource?: string;
}
