/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';
import ts from 'typescript';

function angularTs() {
  return {
    name: 'angular-ts',
    transform(code: string, id: string) {
      if (id.endsWith('.ts') && !id.includes('node_modules')) {
        const result = ts.transpileModule(code, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
            useDefineForClassFields: false,
          }
        });
        return {
          code: result.outputText,
          map: result.sourceMapText
        };
      }
      return null;
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [angularTs(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
