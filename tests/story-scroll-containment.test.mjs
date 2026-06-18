import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('root app shell constrains scrolling to the mobile viewport frame', () => {
  const source = read('src/app/layout.tsx');

  assert.match(
    source,
    /<div className="mx-auto flex h-svh min-h-0 w-full max-w-md flex-col overflow-hidden bg-background">/,
  );
  assert.doesNotMatch(
    source,
    /<div className="mx-auto min-h-svh w-full max-w-md bg-background">/,
  );
});

test('global styles provide a utility that hides scrollbars without disabling scroll', () => {
  const source = read('src/app/globals.css');

  assert.match(source, /\.scrollbar-none\s*\{/);
  assert.match(source, /scrollbar-width:\s*none;/);
  assert.match(source, /-ms-overflow-style:\s*none;/);
  assert.match(source, /\.scrollbar-none::-webkit-scrollbar\s*\{/);
  assert.match(source, /display:\s*none;/);
});

test('main route group scrolls only the content below the header', () => {
  const source = read('src/app/(main)/layout.tsx');

  assert.match(
    source,
    /<div className="flex h-svh min-h-0 flex-col overflow-hidden">/,
  );
  assert.match(
    source,
    /<div\s+className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-none pb-16"[\s\S]*>\s*\{children\}\s*<\/div>/,
  );
  assert.match(
    source,
    /<MainHeader[\s\S]*\/>[\s\S]*overflow-y-auto scrollbar-none/,
  );
  assert.doesNotMatch(source, /min-h-svh flex-col pb-16/);
});

test('story detail scrolls only the content below the header', () => {
  const source = read(
    'src/features/stories/detail/components/story-detail.tsx',
  );
  const headerSource = read(
    'src/features/stories/detail/components/story-detail-header.tsx',
  );

  assert.match(
    source,
    /<div className="flex h-svh min-h-0 flex-col overflow-hidden">/,
  );
  assert.match(
    source,
    /<main\s+className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto scrollbar-none p-4 pb-20"[\s\S]*>/,
  );
  assert.doesNotMatch(source, /min-h-svh/);
  assert.doesNotMatch(headerSource, /window\.addEventListener\('scroll'/);
  assert.doesNotMatch(headerSource, /window\.scrollY/);
});
