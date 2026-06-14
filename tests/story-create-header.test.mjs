import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const headerSource = () =>
  readFileSync(
    'src/features/stories/new/components/story-create-header.tsx',
    'utf8',
  );

test('story create header back button uses browser history', () => {
  const source = headerSource();

  assert.match(source, /^'use client';/);
  assert.match(source, /useRouter/);
  assert.match(source, /router\.back\(\)/);
  assert.doesNotMatch(source, /next\/link/);
  assert.doesNotMatch(source, /APP_PATH\.MAIN\.STORIES/);
  assert.match(source, /aria-label="이전 페이지로 돌아가기 버튼"/);
});
