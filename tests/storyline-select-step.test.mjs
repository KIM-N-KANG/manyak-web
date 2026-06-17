import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = () =>
  readFileSync(
    'src/features/stories/new/components/storyline-select-step-section.tsx',
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

  assert.match(text, /font-maruburi/);
  assert.match(text, /마음에 드는/);
  assert.match(text, /스토리라인을 선택해주세요/);
  assert.match(text, /2 \/ 3/);
  assert.match(text, /variant="secondary"/);
  assert.match(text, /다시 만들기/);
  assert.match(text, /이 스토리라인 선택하기/);
  assert.match(text, /onRegenerateStorylines/);
  assert.match(text, /onSelectStoryline/);
});

test('storyline select step keeps the title and tabs fixed while tab panels scroll', () => {
  const text = source();

  assert.match(
    text,
    /import \{ ScrollArea \} from '@\/components\/ui\/scroll-area';/,
  );
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
  assert.match(text, /<ScrollArea className="h-full">/);
  assert.match(text, /<div className="px-4 pb-4">/);
  assert.doesNotMatch(text, /overflow-y-auto/);
});
