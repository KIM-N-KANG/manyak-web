import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const loadApiProxyRoute = async () => {
  const source = readFileSync('src/app/api/[...path]/route.ts', 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;

  return import(moduleUrl);
};

const routeContext = (path) => ({
  params: Promise.resolve({ path }),
});

test('api proxy route exposes dynamic node handlers', async () => {
  const route = await loadApiProxyRoute();

  assert.equal(route.runtime, 'nodejs');
  assert.equal(route.dynamic, 'force-dynamic');
  assert.equal(typeof route.GET, 'function');
  assert.equal(typeof route.POST, 'function');
  assert.equal(typeof route.PUT, 'function');
  assert.equal(typeof route.PATCH, 'function');
  assert.equal(typeof route.DELETE, 'function');
});

test('api proxy forwards GET requests without body and preserves query strings', async () => {
  const route = await loadApiProxyRoute();
  const originalFetch = globalThis.fetch;
  const previousApiBaseUrl = process.env.API_BASE_URL;
  let capturedRequest;

  process.env.API_BASE_URL = 'http://backend.test';
  globalThis.fetch = async (url, init) => {
    capturedRequest = { url, init };

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const response = await route.GET(
      new Request('http://localhost:3000/api/v1/stories?cursor=10', {
        headers: {
          host: 'localhost:3000',
          'x-request-id': 'test-request',
        },
      }),
      routeContext(['v1', 'stories']),
    );

    assert.equal(response.status, 200);
    assert.equal(await response.text(), '{"ok":true}');
  } finally {
    globalThis.fetch = originalFetch;
    process.env.API_BASE_URL = previousApiBaseUrl;
  }

  assert.equal(
    capturedRequest.url,
    'http://backend.test/api/v1/stories?cursor=10',
  );
  assert.equal(capturedRequest.init.method, 'GET');
  assert.equal(capturedRequest.init.body, undefined);
  assert.equal(capturedRequest.init.cache, 'no-store');
  assert.equal(new Headers(capturedRequest.init.headers).has('host'), false);
  assert.equal(
    new Headers(capturedRequest.init.headers).get('x-request-id'),
    'test-request',
  );
});

test('api proxy forwards mutation bodies and maps proxy paths onto API_BASE_URL prefixes', async () => {
  const route = await loadApiProxyRoute();
  const originalFetch = globalThis.fetch;
  const previousApiBaseUrl = process.env.API_BASE_URL;
  let capturedRequest;

  process.env.API_BASE_URL = 'http://backend.test/api/v1';
  globalThis.fetch = async (url, init) => {
    capturedRequest = { url, init };

    return new Response('created', {
      status: 201,
      headers: { 'Content-Type': 'text/plain' },
    });
  };

  try {
    const response = await route.POST(
      new Request('http://localhost:3000/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          host: 'localhost:3000',
        },
        body: JSON.stringify({ title: '테스트' }),
      }),
      routeContext(['stories']),
    );

    assert.equal(response.status, 201);
    assert.equal(await response.text(), 'created');
  } finally {
    globalThis.fetch = originalFetch;
    process.env.API_BASE_URL = previousApiBaseUrl;
  }

  assert.equal(capturedRequest.url, 'http://backend.test/api/v1/stories');
  assert.equal(capturedRequest.init.method, 'POST');
  assert.equal(capturedRequest.init.cache, 'no-store');
  assert.equal(new Headers(capturedRequest.init.headers).has('host'), false);
  assert.equal(
    new TextDecoder().decode(capturedRequest.init.body),
    '{"title":"테스트"}',
  );
});

test('api proxy returns 500 when API_BASE_URL is missing', async () => {
  const route = await loadApiProxyRoute();
  const originalFetch = globalThis.fetch;
  const previousApiBaseUrl = process.env.API_BASE_URL;
  let fetchCalled = false;

  delete process.env.API_BASE_URL;
  globalThis.fetch = async () => {
    fetchCalled = true;

    return new Response(null);
  };

  try {
    const response = await route.GET(
      new Request('http://localhost:3000/api/stories'),
      routeContext(['stories']),
    );

    assert.equal(response.status, 500);
    assert.equal(await response.json(), 'API_BASE_URL is not configured.');
  } finally {
    globalThis.fetch = originalFetch;
    process.env.API_BASE_URL = previousApiBaseUrl;
  }

  assert.equal(fetchCalled, false);
});
