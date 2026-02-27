# Contributing

Thanks for your interest in contributing to `@i18next-plugin/eslint`.

## Development Setup

1. Install dependencies:

```bash
npm install
```

2. Run checks:

```bash
npm run test
```

This runs lint, typecheck, and unit tests.

## Common Commands

- `npm run lint` - Lint source files
- `npm run typecheck` - Run TypeScript checks
- `npm run test` - Run lint + typecheck + tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage
- `npm run build` - Build `dist` and type declarations

## Project Structure

- `src/rules/` - ESLint rule implementations and shared helpers
- `src/core/` - Plugin presets and config helpers
- `src/types.ts` - Public option and type definitions
- `dist/` - Build output (generated)
- `types/` - Generated declaration files

## Contribution Workflow

1. Create a branch from `master`.
2. Make focused changes with tests when behavior changes.
3. Run `npm run test` before opening a PR.
4. If you changed source files, run `npm run build` to refresh `dist` and `types`.
5. Open a PR with a clear summary of:
    - what changed
    - why it changed
    - how it was verified

## Rule Changes Checklist

When adding or changing a rule:

- Update rule implementation in `src/rules/`
- Add or update tests for valid and invalid cases
- Confirm fix behavior for fixable rules
- Keep rule messages clear and actionable
- Update docs (`README.md` and `README.zh-CN.md`) when behavior or options change

## Coding Guidelines

- Follow existing TypeScript style in the repository.
- Keep changes minimal and scoped.
- Prefer readable utilities over duplicated logic.
- Avoid introducing breaking changes unless discussed in an issue.

## Commit Messages

Use clear, descriptive commit messages. Suggested prefixes:

- `feat:` new functionality
- `fix:` bug fixes
- `docs:` documentation changes
- `refactor:` internal refactors
- `test:` test updates
- `chore:` maintenance tasks

## Reporting Issues

Please include:

- plugin version
- ESLint version
- minimal reproducible code snippet
- expected vs actual behavior
- current config snippet

Thanks again for helping improve this plugin.
