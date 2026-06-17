import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = () =>
  readFileSync(
    'src/features/stories/new/components/story-additional-info-step-section.tsx',
    'utf8',
  );

test('additional info step shows the selected storyline and AI help questions', () => {
  const text = source();

  assert.match(text, /^'use client';/);
  assert.match(text, /font-maruburi/);
  assert.match(text, /helpQuestions/);
  assert.match(text, /AI 추천 질문/);
  assert.match(text, /스토리를 더 풍성하게 만들/);
});

test('additional info step lets users add up to three optional inputs with delete buttons', () => {
  const text = source();

  assert.match(text, /ADDITIONAL_INFO_MAX_COUNT/);
  assert.match(text, /ADDITIONAL_INFO_MAX_LENGTH/);
  assert.match(text, /useState/);
  assert.match(text, /handleAddAdditionalInfo/);
  assert.match(text, /handleRemoveAdditionalInfo/);
  assert.match(text, /handleAdditionalInfoChange/);
  assert.match(text, /crypto\.randomUUID\(\)/);
  assert.match(text, /slice\(0, ADDITIONAL_INFO_MAX_LENGTH\)/);
  assert.match(text, /aria-label=\{`추가 정보 \$\{index \+ 1\} 삭제`\}/);
  assert.match(text, /정보 추가/);
});

test('additional info step can complete a story without additional info', () => {
  const text = source();

  assert.match(text, /onCompleteStory/);
  assert.match(text, /trim\(\)/);
  assert.match(text, /filter\(Boolean\)/);
  assert.match(text, /스토리 완성하기/);
  assert.match(text, /3 \/ 3/);
});
