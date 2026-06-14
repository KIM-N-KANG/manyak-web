import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const storyPageSource = () =>
  readFileSync('src/app/(main)/stories/page.tsx', 'utf8');

const appPathSource = () => readFileSync('src/constants/app-path.ts', 'utf8');

test('story page renders a centered empty state with a story creation CTA', () => {
  const source = storyPageSource();

  assert.match(source, /next\/link/);
  assert.match(source, /Button/);
  assert.match(source, /APP_PATH\.CREATOR\.STORY/);
  assert.match(source, /PlusSignIcon/);
  assert.match(source, /아직 만든 스토리가 없어요/);
  assert.match(source, /3단계로 간단하게 스토리를 만들어보세요/);
  assert.match(source, /스토리 만들기/);
  assert.match(source, /items-center/);
  assert.match(source, /justify-center/);
  assert.match(source, /text-center/);
});

test('app paths include the stories and creator routes used by story pages', () => {
  const source = appPathSource();

  assert.match(source, /MAIN[\s\S]*STORIES:\s*'\/stories'/);
  assert.match(source, /MAIN[\s\S]*CHATS:\s*'\/chats'/);
  assert.match(source, /CREATOR/);
  assert.match(source, /STORY:\s*'\/stories\/new'/);
});
