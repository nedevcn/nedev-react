import { defineConfig } from 'vite';
import * as babel from '@babel/core';
import myJsxCompiler from './src/framework/compiler.js';

// Custom Vite plugin to apply our Babel transform
function solidReactPlugin() {
  return {
    name: 'solid-react-transform',
    enforce: 'pre' as const,
    async transform(code: string, id: string) {
      if (!/\.[jt]sx?$/.test(id) || id.includes('node_modules')) {
        return null;
      }
      
      const result = await babel.transformAsync(code, {
        filename: id,
        presets: [
          '@babel/preset-typescript',
        ],
        plugins: [
          ['@babel/plugin-syntax-jsx'],
          [myJsxCompiler]
        ],
        babelrc: false,
        configFile: false,
      });

      // Now run standard JSX transform to turn `<div />` into `jsx("div", ...)`
      // using our custom jsxImportSource
      if (result?.code) {
         const jsxResult = await babel.transformAsync(result.code, {
             filename: id,
             plugins: [
                 ['@babel/plugin-transform-react-jsx', {
                     runtime: 'automatic',
                     importSource: '/src/framework' // points to our jsx-runtime
                 }]
             ],
             babelrc: false,
             configFile: false,
         });
         return {
            code: jsxResult?.code || code,
            map: jsxResult?.map
         };
      }
      return null;
    }
  };
}

export default defineConfig({
  plugins: [solidReactPlugin()]
});
