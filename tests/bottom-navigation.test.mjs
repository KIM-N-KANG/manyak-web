import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const navSource = () =>
  readFileSync('src/components/layout/bottom-navigation-bar.tsx', 'utf8');

const layoutSource = () => readFileSync('src/app/(main)/layout.tsx', 'utf8');

test('bottom navigation has requested items, routes, icons, and styles', () => {
  const source = navSource();

  assert.match(source, /HugeiconsIcon/);
  assert.match(source, /ClipboardIcon/);
  assert.match(source, /ChatFeedback01Icon/);
  assert.doesNotMatch(source, /@remixicon\/react/);
  assert.doesNotMatch(source, /Fill/);
  assert.doesNotMatch(source, /Line/);
  assert.match(source, /APP_PATH\.MAIN\.STORIES/);
  assert.match(source, /APP_PATH\.MAIN\.CHATS/);
  assert.match(source, /replace/);
  assert.match(source, /label: '스토리'/);
  assert.match(source, /label: '채팅'/);
  assert.match(source, /h-16/);
  assert.match(source, /border-t/);
  assert.match(source, /font-semibold text-foreground/);
  assert.match(source, /text-foreground-tertiary/);
});

test('bottom navigation route group layout renders children and navigation', () => {
  const source = layoutSource();

  assert.match(source, /children/);
  assert.match(source, /BottomNavigationBar/);
  assert.match(source, /pb-16/);
});
