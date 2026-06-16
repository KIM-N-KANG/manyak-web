import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

const keywordSectionSource = () =>
  read('src/features/stories/new/components/story-keyword-step-section.tsx');

const addKeywordDialogSource = () =>
  read('src/features/stories/new/components/add-keyword-dialog.tsx');

const storyKeywordHookSource = () =>
  read('src/features/stories/new/hooks/use-story-keyword-step.ts');

const addKeywordDialogHookSource = () =>
  read('src/features/stories/new/hooks/use-add-keyword-dialog.ts');

const constantsSource = () => read('src/features/stories/new/constants.ts');

test('story keyword step fetches simple story tags and renders selectable toggle chips by category', () => {
  const sectionSource = keywordSectionSource();
  const hookSource = storyKeywordHookSource();
  const constantSource = constantsSource();

  assert.match(sectionSource, /^'use client';/);
  assert.match(sectionSource, /useStoryKeywordStep/);
  assert.match(hookSource, /useGetSimpleStoryTags/);
  assert.match(hookSource, /useGenerateSimpleStorylines/);
  assert.match(
    sectionSource,
    /import \{ ToggleChip \} from '@\/components\/ui\/toggle-chip';/,
  );
  assert.match(hookSource, /tag\.category === category/);
  assert.match(constantSource, /GENRE/);
  assert.match(constantSource, /PROTAGONIST/);
  assert.match(constantSource, /SUPPORTING_CHARACTER/);
  assert.match(sectionSource, /<ToggleChip/);
  assert.match(sectionSource, /pressed=\{isSelected/);
  assert.match(sectionSource, /onPressedChange=\{\(pressed\) =>/);
});

test('story keyword step uses skeleton chips while keywords are loading', () => {
  const sectionSource = keywordSectionSource();
  const constantSource = constantsSource();
  const widthClassMatch = constantSource.match(
    /export const SKELETON_TAG_CHIP_WIDTH_CLASSES = \[([\s\S]*?)\] as const;/,
  );

  assert.match(
    sectionSource,
    /import \{ Skeleton \} from '@\/components\/ui\/skeleton';/,
  );
  assert.match(sectionSource, /simpleStoryTags\.isLoading/);
  assert.ok(widthClassMatch);

  const widthClasses = [...widthClassMatch[1].matchAll(/'([^']+)'/g)].map(
    ([, className]) => className,
  );

  assert.equal(widthClasses.length, 8);
  assert.equal(new Set(widthClasses).size, widthClasses.length);
  assert.match(sectionSource, /SKELETON_TAG_CHIP_WIDTH_CLASSES\.map/);
  assert.match(sectionSource, /<Skeleton/);
  assert.match(sectionSource, /className=\{`h-10 \$\{widthClass\}`\}/);
  assert.match(sectionSource, /aria-hidden="true"/);
  assert.doesNotMatch(sectionSource, /className="h-10 w-20"/);
  assert.doesNotMatch(sectionSource, /키워드를 불러오고 있어요/);
});

test('story keyword step enables storyline generation only after required categories are selected', () => {
  const sectionSource = keywordSectionSource();
  const hookSource = storyKeywordHookSource();

  assert.match(hookSource, /selectedTagIdsByCategory\.GENRE\.length > 0/);
  assert.match(hookSource, /selectedTagIdsByCategory\.PROTAGONIST\.length > 0/);
  assert.match(hookSource, /const canGenerateStoryline =/);
  assert.match(
    sectionSource,
    /disabled=\{!canGenerateStoryline \|\| generateStorylines\.isPending\}/,
  );
});

test('story keyword step swaps the generate button label for a spinner while storylines are loading', () => {
  const sectionSource = keywordSectionSource();

  assert.match(
    sectionSource,
    /import \{ Spinner \} from '@\/components\/ui\/spinner';/,
  );
  assert.match(sectionSource, /className="relative"/);
  assert.match(
    sectionSource,
    /className=\{\s*generateStorylines\.isPending \? 'invisible' : undefined\s*\}/,
  );
  assert.match(sectionSource, /generateStorylines\.isPending && \(/);
  assert.match(sectionSource, /<Spinner/);
  assert.match(sectionSource, /aria-label="스토리라인 생성 중"/);
});

test('story keyword step disables every keyword toggle chip while storylines are pending', () => {
  const sectionSource = keywordSectionSource();

  assert.match(
    sectionSource,
    /const isKeywordChipDisabled =\s*generateStorylines\.isPending \|\|\s*\(!isSelected && isMaxSelectionReached\);/,
  );

  const disabledChipMatches = [
    ...sectionSource.matchAll(/disabled=\{isKeywordChipDisabled\}/g),
  ];

  assert.equal(disabledChipMatches.length, 2);
});

test('story keyword step sends selected predefined and custom tags to the storyline API and logs the response', () => {
  const source = storyKeywordHookSource();

  assert.match(source, /generateStorylines\.mutate\(\{/);
  assert.match(source, /selectedTagIds:/);
  assert.match(source, /customTags:/);
  assert.match(source, /category: keyword\.category/);
  assert.match(source, /onSuccess: \(response\) => \{/);
  assert.match(source, /console\.log\('스토리라인 생성 응답', response\);/);
});

test('story keyword step lets users add a custom keyword to the active category and auto-selects it', () => {
  const sectionSource = keywordSectionSource();
  const hookSource = storyKeywordHookSource();

  assert.match(sectionSource, /<AddKeywordDialog/);
  assert.match(sectionSource, /category=\{category\}/);
  assert.match(sectionSource, /placeholder=\{placeholder\}/);
  assert.match(sectionSource, /onAddKeyword=\{\(keyword\) =>/);
  assert.match(hookSource, /setCustomKeywordsByCategory/);
  assert.match(hookSource, /crypto\.randomUUID\(\)/);
  assert.match(hookSource, /selectedCustomKeywordIdsByCategory/);
});

test('add keyword dialog limits input to ten characters and submits the trimmed keyword', () => {
  const dialogSource = addKeywordDialogSource();
  const hookSource = addKeywordDialogHookSource();
  const constantSource = constantsSource();

  assert.match(dialogSource, /^'use client';/);
  assert.match(dialogSource, /open=\{open\}/);
  assert.match(dialogSource, /onOpenChange=\{setOpen\}/);
  assert.match(dialogSource, /onSubmit=\{handleSubmit\}/);
  assert.match(dialogSource, /placeholder=\{placeholder\}/);
  assert.match(dialogSource, /maxLength=\{ADD_KEYWORD_MAX_LENGTH\}/);
  assert.match(dialogSource, /value=\{keyword\}/);
  assert.match(hookSource, /setKeyword\(event\.target\.value\.slice/);
  assert.match(hookSource, /ADD_KEYWORD_MAX_LENGTH/);
  assert.match(hookSource, /const trimmedKeyword = keyword\.trim\(\)/);
  assert.match(hookSource, /onAddKeyword\(trimmedKeyword\)/);
  assert.match(hookSource, /isSubmitDisabled: keyword\.trim\(\)\.length === 0/);
  assert.match(dialogSource, /disabled=\{isSubmitDisabled\}/);
  assert.match(constantSource, /export const ADD_KEYWORD_MAX_LENGTH = 10;/);
  assert.match(constantSource, /placeholder: '예: 타임루프, 영지물, 먼치킨'/);
  assert.match(
    constantSource,
    /placeholder: '예: 사랑에 서툰, 타인을 믿지 못하는'/,
  );
  assert.match(
    constantSource,
    /placeholder: '예: 상냥해서 더 위험한, 어딘가 망가진'/,
  );
  assert.match(dialogSource, /키워드 추가/);
});
