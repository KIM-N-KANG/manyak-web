import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const headerPath = 'src/components/layout/main-header.tsx';

const headerSource = () => readFileSync(headerPath, 'utf8');

const layoutSource = () => readFileSync('src/app/(main)/layout.tsx', 'utf8');

test('main header exposes route-aware page title with requested styles', () => {
  assert.ok(existsSync(headerPath), 'MainHeader component file should exist');

  const source = headerSource();

  assert.match(source, /usePathname/);
  assert.match(source, /useEffect/);
  assert.match(source, /useState/);
  assert.match(source, /APP_PATH\.MAIN\.STORIES/);
  assert.match(source, /APP_PATH\.MAIN\.CHATS/);
  assert.match(source, /'스토리'/);
  assert.match(source, /'채팅'/);
  assert.match(source, /scrollY\s*>\s*0/);
  assert.match(source, /h-16/);
  assert.match(source, /px-4/);
  assert.match(source, /sticky/);
  assert.match(source, /top-0/);
  assert.match(source, /z-50/);
  assert.match(source, /bg-background/);
  assert.match(source, /border-b/);
  assert.match(source, /border-transparent/);
  assert.match(source, /border-border/);
  assert.match(source, /transition-colors/);
  assert.match(source, /text-xl/);
  assert.match(source, /items-center/);
});

test('main route group layout renders the main header above children', () => {
  const source = layoutSource();

  assert.match(source, /MainHeader/);
  assert.match(source, /<MainHeader \/>[\s\S]*\{children\}/);
});
