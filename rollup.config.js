import replace from '@rollup/plugin-replace';
import typescript from 'rollup-plugin-typescript2';
import { readFileSync, writeFileSync } from 'node:fs';
import { URL } from 'node:url';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default {
	input: {
		index: 'src/index.ts',
	},
	output: [
		{
			dir: 'dist/cjs',
			preserveModules: true,
			format: 'cjs',
			exports: 'named',
		},
		{
			dir: 'dist/esm',
			preserveModules: true,
			format: 'es',
			exports: 'named',
		},
	],
	external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
	plugins: [
		replace({
			__packageName: pkg.name,
			__packageVersion__: pkg.version,
			preventAssignment: true,
		}),
		typescript(),
		{
			name: 'post-build-steps',
			writeBundle() {
				writeFileSync('dist/cjs/package.json', '{"type":"commonjs"}\n');
			},
		},
	],
};
