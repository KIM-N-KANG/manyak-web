import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = () =>
  readFileSync(
    'src/features/stories/new/components/story-additional-info-step-section.tsx',
    'utf8',
  );
const hookSource = () =>
  readFileSync(
    'src/features/stories/new/hooks/use-additional-infos.ts',
    'utf8',
  );
const constantsSource = () =>
  readFileSync('src/features/stories/new/constants.ts', 'utf8');
const storylineTextSource = () =>
  readFileSync(
    'src/features/stories/new/components/storyline-text.tsx',
    'utf8',
  );

test('additional info step shows the selected storyline and AI help questions', () => {
  const text = source();
  const storylineText = storylineTextSource();

  assert.match(text, /^'use client';/);
  assert.match(text, /StorylineText/);
  assert.match(storylineText, /font-maruburi/);
  assert.match(text, /helpQuestions/);
  assert.match(text, /AI 추천 질문/);
  assert.match(text, /스토리를 더 풍성하게 만들/);
});

test('additional info step lets users add up to three optional inputs with delete buttons', () => {
  const text = source();
  const hookText = hookSource();

  assert.match(text, /useAdditionalInfos/);
  assert.match(text, /ADDITIONAL_INFO_MAX_COUNT/);
  assert.match(text, /ADDITIONAL_INFO_MAX_LENGTH/);
  assert.match(hookText, /useState/);
  assert.match(hookText, /addAdditionalInfo/);
  assert.match(hookText, /removeAdditionalInfo/);
  assert.match(hookText, /changeAdditionalInfo/);
  assert.match(hookText, /crypto\.randomUUID\(\)/);
  assert.match(hookText, /slice\(0, ADDITIONAL_INFO_MAX_LENGTH\)/);
  assert.match(text, /aria-label=\{`추가 정보 \$\{index \+ 1\} 삭제`\}/);
  assert.match(text, /정보 추가/);
});

test('additional info step can complete a story without additional info', () => {
  const text = source();
  const hookText = hookSource();
  const constantText = constantsSource();

  assert.match(text, /onCompleteStory/);
  assert.match(text, /getSubmittedAdditionalInfos/);
  assert.match(hookText, /trim\(\)/);
  assert.match(hookText, /filter\(Boolean\)/);
  assert.match(text, /스토리 완성하기/);
  assert.match(constantText, /'additional-info': '3 \/ 3'/);
});

test('additional info step lets users go back to storyline selection', () => {
  const text = source();

  assert.match(text, /onBackToStorylineSelect/);
  assert.match(text, /variant="secondary"/);
  assert.match(text, /다시 선택하기/);
  assert.match(text, /onClick=\{onBackToStorylineSelect\}/);
});

test('additional info step keeps the title fixed while the content below it scrolls', () => {
  const text = source();

  assert.doesNotMatch(text, /@\/components\/ui\/scroll-area/);
  assert.match(
    text,
    /<main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-16">/,
  );
  assert.match(
    text,
    /<section className="flex min-h-0 flex-1 flex-col gap-8 overflow-hidden p-4">/,
  );
  assert.match(text, /<div className="min-h-0 flex-1 overflow-y-auto">/);
  assert.match(text, /<div className="flex flex-col gap-8">/);
  assert.doesNotMatch(text, /<ScrollArea/);
});
