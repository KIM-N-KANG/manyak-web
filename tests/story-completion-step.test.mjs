import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = () =>
  readFileSync(
    'src/features/stories/new/components/story-completion-section.tsx',
    'utf8',
  );

test('story completion page links users back to StoriesPage and exposes the chat CTA', () => {
  const text = source();

  assert.match(text, /next\/link/);
  assert.match(text, /APP_PATH\.MAIN\.STORIES/);
  assert.match(text, /variant="secondary"/);
  assert.match(text, /내 스토리로 이동하기/);
  assert.match(text, /채팅 시작하기/);
  assert.match(text, /스토리가 완성되었어요!/);
  assert.match(text, /채팅으로 이야기를 이어가보세요/);
});
