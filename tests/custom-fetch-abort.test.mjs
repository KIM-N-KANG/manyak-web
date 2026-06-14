import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const loadCustomFetch = async () => {
  const source = readFileSync('src/lib/custom-fetch.ts', 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;

  return import(moduleUrl);
};

const successfulResponse = {
  ok: true,
  status: 204,
};

test('custom fetch handles already-aborted signals before starting requests', async () => {
  const { customFetch } = await loadCustomFetch();
  const abortController = new AbortController();
  const originalFetch = globalThis.fetch;
  let requestSignal;

  abortController.abort('cancelled');

  globalThis.fetch = async (_url, init) => {
    requestSignal = init.signal;

    return successfulResponse;
  };

  try {
    await customFetch.get('/stories', {
      signal: abortController.signal,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(requestSignal.aborted, true);
  assert.equal(requestSignal.reason, 'cancelled');
});

test('custom fetch removes abort listeners after requests settle', async () => {
  const { customFetch } = await loadCustomFetch();
  const originalFetch = globalThis.fetch;
  const addCalls = [];
  const removeCalls = [];
  const externalSignal = {
    aborted: false,
    addEventListener(type, listener, options) {
      addCalls.push({ type, listener, options });
    },
    removeEventListener(type, listener) {
      removeCalls.push({ type, listener });
    },
  };

  globalThis.fetch = async () => successfulResponse;

  try {
    await customFetch.get('/stories', {
      signal: externalSignal,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(addCalls.length, 1);
  assert.equal(addCalls[0].type, 'abort');
  assert.equal(addCalls[0].options.once, true);
  assert.equal(removeCalls.length, 1);
  assert.equal(removeCalls[0].type, 'abort');
  assert.equal(removeCalls[0].listener, addCalls[0].listener);
});
