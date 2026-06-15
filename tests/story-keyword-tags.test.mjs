import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

const keywordSectionSource = () =>
  read('src/features/stories/new/components/story-keyword-step-section.tsx');

const addKeywordDialogSource = () =>
  read('src/features/stories/new/components/add-keyword-dialog.tsx');

test('story keyword step fetches simple story tags and renders selectable toggle chips by category', () => {
  const source = keywordSectionSource();

  assert.match(source, /^'use client';/);
  assert.match(source, /useGetSimpleStoryTags/);
  assert.match(source, /useGenerateSimpleStorylines/);
  assert.match(
    source,
    /import \{ ToggleChip \} from '@\/components\/ui\/toggle-chip';/,
  );
  assert.match(source, /tag\.category === category/);
  assert.match(source, /GENRE/);
  assert.match(source, /PROTAGONIST/);
  assert.match(source, /SUPPORTING_CHARACTER/);
  assert.match(source, /<ToggleChip/);
  assert.match(source, /pressed=\{isSelected/);
  assert.match(source, /onPressedChange=\{\(pressed\) =>/);
});

test('story keyword step uses skeleton chips while keywords are loading', () => {
  const source = keywordSectionSource();
  const widthClassMatch = source.match(
    /const SKELETON_TAG_CHIP_WIDTH_CLASSES = \[([\s\S]*?)\] as const;/,
  );

  assert.match(
    source,
    /import \{ Skeleton \} from '@\/components\/ui\/skeleton';/,
  );
  assert.match(source, /simpleStoryTags\.isLoading/);
  assert.ok(widthClassMatch);

  const widthClasses = [...widthClassMatch[1].matchAll(/'([^']+)'/g)].map(
    ([, className]) => className,
  );

  assert.equal(widthClasses.length, 8);
  assert.equal(new Set(widthClasses).size, widthClasses.length);
  assert.match(source, /SKELETON_TAG_CHIP_WIDTH_CLASSES\.map/);
  assert.match(source, /<Skeleton/);
  assert.match(source, /className=\{`h-10 \$\{widthClass\}`\}/);
  assert.match(source, /aria-hidden="true"/);
  assert.doesNotMatch(source, /className="h-10 w-20"/);
  assert.doesNotMatch(source, /키워드를 불러오고 있어요/);
});

test('story keyword step enables storyline generation only after required categories are selected', () => {
  const source = keywordSectionSource();

  assert.match(source, /selectedTagIdsByCategory\.GENRE\.length > 0/);
  assert.match(source, /selectedTagIdsByCategory\.PROTAGONIST\.length > 0/);
  assert.match(source, /const canGenerateStoryline =/);
  assert.match(
    source,
    /disabled=\{!canGenerateStoryline \|\| generateStorylines\.isPending\}/,
  );
});

test('story keyword step sends selected predefined and custom tags to the storyline API and logs the response', () => {
  const source = keywordSectionSource();

  assert.match(source, /generateStorylines\.mutate\(\{/);
  assert.match(source, /selectedTagIds:/);
  assert.match(source, /customTags:/);
  assert.match(source, /category: keyword\.category/);
  assert.match(source, /onSuccess: \(response\) => \{/);
  assert.match(source, /console\.log\('스토리라인 생성 응답', response\);/);
});

test('story keyword step lets users add a custom keyword to the active category and auto-selects it', () => {
  const source = keywordSectionSource();

  assert.match(source, /<AddKeywordDialog/);
  assert.match(source, /category=\{category\}/);
  assert.match(source, /onAddKeyword=\{\(keyword\) =>/);
  assert.match(source, /setCustomKeywordsByCategory/);
  assert.match(source, /crypto\.randomUUID\(\)/);
  assert.match(source, /selectedCustomKeywordIdsByCategory/);
});

test('add keyword dialog limits input to ten characters and submits the trimmed keyword', () => {
  const source = addKeywordDialogSource();

  assert.match(source, /^'use client';/);
  assert.match(source, /open=\{open\}/);
  assert.match(source, /onOpenChange=\{setOpen\}/);
  assert.match(source, /onSubmit=\{handleSubmit\}/);
  assert.match(source, /maxLength=\{10\}/);
  assert.match(source, /value=\{keyword\}/);
  assert.match(source, /setKeyword\(event\.target\.value\.slice\(0, 10\)\)/);
  assert.match(source, /const trimmedKeyword = keyword\.trim\(\)/);
  assert.match(source, /onAddKeyword\(trimmedKeyword\)/);
  assert.match(source, /disabled=\{keyword\.trim\(\)\.length === 0\}/);
  assert.match(source, /직접 추가/);
});
