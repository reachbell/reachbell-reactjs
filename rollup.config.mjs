import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.tsx',
  output: [
    { file: 'dist/index.cjs', format: 'cjs', sourcemap: true, exports: 'named' },
    { file: 'dist/index.mjs', format: 'esm', sourcemap: true },
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
  ],
};
