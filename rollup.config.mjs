import typescript from '@rollup/plugin-typescript';
import { copyFileSync } from 'node:fs';

/**
 * One declaration file per module condition (same content), so TypeScript
 * with node16/nodenext doesn't treat the CJS entry as ESM-typed.
 */
const perConditionTypes = () => ({
  name: 'per-condition-types',
  writeBundle: { sequential: true, order: 'post', handler() {
    copyFileSync('dist/index.d.ts', 'dist/index.d.mts');
    copyFileSync('dist/index.d.ts', 'dist/index.d.cts');
  } },
});

export default {
  input: 'src/index.tsx',
  output: [
    { file: 'dist/index.cjs', format: 'cjs', sourcemap: true, exports: 'named', banner: '"use client";' },
    { file: 'dist/index.mjs', format: 'esm', sourcemap: true, banner: '"use client";' },
  ],
  // react + @reachbell/sdk come from the consumer's bundle.
  external: ['react', 'react/jsx-runtime', '@reachbell/sdk'],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist',
      rootDir: 'src',
      sourceMap: true,
    }),
    perConditionTypes(),
  ],
};
