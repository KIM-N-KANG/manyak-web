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
