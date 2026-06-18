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
const idSource = () =>
  readFileSync('src/features/stories/new/utils/create-client-id.ts', 'utf8');
const constantsSource = () =>
  readFileSync('src/features/stories/new/constants.ts', 'utf8');
const textContentSource = () =>
  readFileSync('src/components/common/text-content.tsx', 'utf8');

test('additional info step shows the selected storyline and AI help questions', () => {
  const text = source();
  const textContent = textContentSource();

  assert.match(text, /^'use client';/);
  assert.match(text, /TextContent/);
  assert.match(text, /font="maruburi"/);
  assert.match(textContent, /font-maruburi/);
  assert.match(text, /helpQuestions/);
  assert.match(text, /AI 추천 질문/);
  assert.match(text, /스토리라인에 더하고 싶은/);
});

test('additional info step lets users add up to three optional inputs with delete buttons', () => {
  const text = source();
  const hookText = hookSource();
  const idText = idSource();

  assert.match(text, /useAdditionalInfos/);
  assert.match(text, /ADDITIONAL_INFO_MAX_COUNT/);
  assert.match(text, /ADDITIONAL_INFO_MAX_LENGTH/);
  assert.match(hookText, /useState/);
  assert.match(hookText, /addAdditionalInfo/);
  assert.match(hookText, /removeAdditionalInfo/);
  assert.match(hookText, /changeAdditionalInfo/);
  assert.match(hookText, /createClientId\(\)/);
  assert.match(idText, /globalThis\.crypto\?\.randomUUID/);
  assert.match(idText, /Date\.now\(\)/);
  assert.match(idText, /Math\.random\(\)/);
  assert.match(hookText, /slice\(0, ADDITIONAL_INFO_MAX_LENGTH\)/);
  assert.match(text, /aria-label=\{`추가 정보 \$\{index \+ 1\} 삭제`\}/);
  assert.match(text, /정보 추가/);

  const addInfoClickIndex = text.indexOf('onClick={addAdditionalInfo}');
  const addInfoButton = text.slice(
    text.lastIndexOf('<Button', addInfoClickIndex),
    text.indexOf('>', addInfoClickIndex) + 1,
  );

  assert.notEqual(addInfoClickIndex, -1);
  assert.doesNotMatch(addInfoButton, /aria-hidden/);
  assert.doesNotMatch(addInfoButton, /aria-label/);
});

test('additional info step starts with one empty input that users can delete', () => {
  const text = source();
  const hookText = hookSource();

  assert.match(hookText, /createEmptyAdditionalInfo/);
  assert.match(
    hookText,
    /useState<AdditionalInfoInput\[\]>\(\s*\(\) => \[\s*createEmptyAdditionalInfo\(\),?\s*\]/,
  );
  assert.match(text, /aria-label=\{`추가 정보 \$\{index \+ 1\} 삭제`\}/);
});

test('additional info textareas start as a single line', () => {
  const text = source();

  assert.match(text, /<InputGroupTextarea/);
  assert.match(text, /rows=\{1\}/);
  assert.match(text, /className="min-h-10"/);
});

test('additional info textareas show a simple placeholder', () => {
  const text = source();

  assert.match(
    text,
    /placeholder="예: 주인공은 오래전 친구를 배신한 비밀을 숨기고 있다"/,
  );
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

test('additional info step scrolls the whole step content between header and footer', () => {
  const text = source();

  assert.doesNotMatch(text, /@\/components\/ui\/scroll-area/);
  assert.match(
    text,
    /<main className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-16">/,
  );
  assert.match(text, /<section className="flex flex-col">/);
  assert.doesNotMatch(
    text,
    /<div className="min-h-0 flex-1 overflow-y-auto p-4">/,
  );
  assert.match(text, /<div className="p-4">/);
  assert.match(text, /<div className="flex flex-col gap-8">/);
  assert.doesNotMatch(text, /<ScrollArea/);
});
