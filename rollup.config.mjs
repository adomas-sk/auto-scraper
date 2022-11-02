import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/index.ts',
  output: {
    file: 'target/bundle.js',
    format: 'es',
  },
  plugins: [
    nodeResolve({ preferBuiltins: true }),
    typescript(),
    commonjs({ include: /node_modules/, requireReturnsDefault: 'auto' }),
  ],
};
