import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['test/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary'],
			include: ['src/core/**/*.ts', 'src/rules/**/*.ts'],
			thresholds: {
				lines: 95,
				functions: 95,
				branches: 95,
				statements: 95,
			},
		},
	},
});
