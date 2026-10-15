import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'orval';

import { stabilizeOperationIds } from './tools/orval/stabilize-operation-ids';

loadEnvConfig(process.cwd());

const apiBaseUrl = process.env.API_BASE_URL?.replace(/\/+$/, '');

if (!apiBaseUrl) {
  throw new Error('API_BASE_URL is not configured.');
}

const OPENAPI_URL = `${apiBaseUrl}/v3/api-docs`;

export default defineConfig({
  api: {
    input: {
      target: OPENAPI_URL,
      override: { transformer: stabilizeOperationIds },
    },
    output: {
      mode: 'tags-split',
      target: 'src/api/generated/endpoints',
      schemas: 'src/api/generated/models',
      client: 'react-query',
      clean: true,
      override: {
        mutator: {
          path: 'src/api/mutator/custom-instance.ts',
          name: 'customInstance',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
  zod: {
    input: {
      target: OPENAPI_URL,
      override: { transformer: stabilizeOperationIds },
    },
    output: {
      mode: 'single',
      target: 'src/api/generated/zod/index.ts',
      client: 'zod',
      clean: true,
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});
