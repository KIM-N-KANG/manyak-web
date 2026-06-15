import { defineConfig } from 'orval';

const OPENAPI_URL = 'http://localhost:8080/v3/api-docs';

export default defineConfig({
  manyakApi: {
    input: {
      target: OPENAPI_URL,
    },
    output: {
      mode: 'tags-split',
      target: 'src/services/generated/api/index.ts',
      schemas: 'src/services/generated/api/model',
      client: 'react-query',
      clean: true,
      override: {
        mutator: {
          path: 'src/services/mutator/custom-instance.ts',
          name: 'customInstance',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
  manyakApiZod: {
    input: {
      target: OPENAPI_URL,
    },
    output: {
      mode: 'single',
      target: 'src/services/generated/zod/index.ts',
      client: 'zod',
      clean: true,
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});
