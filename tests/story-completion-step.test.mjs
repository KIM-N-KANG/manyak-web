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

test('story completion page shows loading copy and skeletons while completing story', () => {
  const text = source();

  assert.match(
    text,
    /import \{ Skeleton \} from '@\/components\/ui\/skeleton';/,
  );
  assert.match(text, /isCompletingStory/);
  assert.match(text, /스토리를 만들고 있어요/);
  assert.match(text, /잠시만 기다려 주세요/);
  assert.match(text, /모든 정보를 바탕으로 스토리를 구상하고 있어요/);
  assert.match(text, /aria-busy=\{isCompletingStory\}/);
  assert.match(text, /aria-label="스토리 완성 중"/);
  assert.match(text, /<StoryCompletionLoadingState \/>/);
});

test('story completion page fits below the shared story create header', () => {
  const text = source();

  assert.match(
    text,
    /<main\s+className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-none pb-16"/,
  );
  assert.match(text, /<section className="flex flex-1 flex-col">/);
  assert.doesNotMatch(text, /min-h-svh/);
  assert.doesNotMatch(text, /pt-20/);
});
