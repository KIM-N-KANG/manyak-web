import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = () =>
  readFileSync(
    'src/features/stories/new/components/storyline-select-step-section.tsx',
    'utf8',
  );
const constantsSource = () =>
  readFileSync('src/features/stories/new/constants.ts', 'utf8');
const storylineTextSource = () =>
  readFileSync(
    'src/features/stories/new/components/storyline-text.tsx',
    'utf8',
  );

test('storyline select step renders generated storylines in selectable tabs', () => {
  const text = source();

  assert.match(text, /^'use client';/);
  assert.match(text, /Tabs/);
  assert.match(text, /TabsList/);
  assert.match(text, /TabsTrigger/);
  assert.match(text, /TabsContent/);
  assert.match(text, /storylines\.map/);
  assert.match(text, /activeStorylineIndex/);
  assert.match(text, /onActiveStorylineIndexChange/);
});

test('storyline select step displays storyline text with MaruBuri font and has required CTAs', () => {
  const text = source();
  const constantText = constantsSource();
  const storylineText = storylineTextSource();

  assert.match(text, /StorylineText/);
  assert.match(storylineText, /font-maruburi/);
  assert.match(text, /마음에 드는/);
  assert.match(text, /스토리라인을 선택해주세요/);
  assert.match(constantText, /'storyline-select': '2 \/ 3'/);
  assert.match(text, /variant="secondary"/);
  assert.match(text, /다시 만들기/);
  assert.match(text, /이 스토리라인 선택하기/);
  assert.match(text, /onRegenerateStorylines/);
  assert.match(text, /onSelectStoryline/);
});

test('storyline text breaks long generated stories into readable lines', () => {
  const storylineText = storylineTextSource();

  assert.match(storylineText, /getStorylineLines/);
  assert.match(storylineText, /STORYLINE_EXPLICIT_LINE_BREAK_PATTERN/);
  assert.match(storylineText, /STORYLINE_SENTENCE_BREAK_PATTERN/);
  assert.match(storylineText, /lines\.map/);
  assert.match(storylineText, /<p key=/);
  assert.match(
    storylineText,
    /className="flex flex-col gap-3 font-maruburi text-base leading-loose"/,
  );
  assert.doesNotMatch(
    storylineText,
    /<p className="font-maruburi text-base leading-loose">\{children\}<\/p>/,
  );
});

test('storyline select step keeps the title and tabs fixed while tab panels scroll', () => {
  const text = source();

  assert.doesNotMatch(text, /@\/components\/ui\/scroll-area/);
  assert.match(
    text,
    /<main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-16">/,
  );
  assert.match(
    text,
    /<section className="flex min-h-0 flex-1 flex-col overflow-hidden">/,
  );
  assert.match(text, /className="min-h-0 flex-1 overflow-hidden"/);
  assert.match(text, /className="min-h-0"/);
  assert.match(text, /<div className="h-full overflow-y-auto">/);
  assert.match(text, /<div className="px-4 pb-4">/);
  assert.doesNotMatch(text, /<ScrollArea/);
});
