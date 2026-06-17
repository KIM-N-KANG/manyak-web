import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

const keywordSectionSource = () =>
  read('src/features/stories/new/components/story-keyword-step-section.tsx');

const keywordCategoryPanelSource = () =>
  read('src/features/stories/new/components/story-keyword-category-panel.tsx');

const addKeywordDialogSource = () =>
  read('src/features/stories/new/components/add-keyword-dialog.tsx');

const storyKeywordHookSource = () =>
  read('src/features/stories/new/hooks/use-story-keyword-step.ts');

const addKeywordDialogHookSource = () =>
  read('src/features/stories/new/hooks/use-add-keyword-dialog.ts');

const tagCategoryUtilsSource = () =>
  read('src/features/stories/new/utils/tag-categories.ts');

const loadingButtonContentSource = () =>
  read('src/features/stories/new/components/loading-button-content.tsx');

const constantsSource = () => read('src/features/stories/new/constants.ts');

test('story keyword step fetches simple story tags and renders selectable toggle chips by category', () => {
  const sectionSource = keywordSectionSource();
  const panelSource = keywordCategoryPanelSource();
  const hookSource = storyKeywordHookSource();
  const utilsSource = tagCategoryUtilsSource();
  const constantSource = constantsSource();

  assert.match(sectionSource, /^'use client';/);
  assert.match(sectionSource, /useStoryKeywordStep/);
  assert.match(sectionSource, /StoryKeywordCategoryPanel/);
  assert.match(hookSource, /useGetSimpleStoryTags/);
  assert.doesNotMatch(hookSource, /useGenerateSimpleStorylines/);
  assert.match(
    panelSource,
    /import \{ ToggleChip \} from '@\/components\/ui\/toggle-chip';/,
  );
  assert.match(utilsSource, /tag\.category === category/);
  assert.match(constantSource, /GENRE/);
  assert.match(constantSource, /PROTAGONIST/);
  assert.match(constantSource, /SUPPORTING_CHARACTER/);
  assert.match(panelSource, /<ToggleChip/);
  assert.match(panelSource, /pressed=\{isSelected/);
  assert.match(panelSource, /onPressedChange=\{\(pressed\) =>/);
});

test('story keyword step uses skeleton chips while keywords are loading', () => {
  const panelSource = keywordCategoryPanelSource();
  const constantSource = constantsSource();
  const widthClassMatch = constantSource.match(
    /export const SKELETON_TAG_CHIP_WIDTH_CLASSES = \[([\s\S]*?)\] as const;/,
  );

  assert.match(
    panelSource,
    /import \{ Skeleton \} from '@\/components\/ui\/skeleton';/,
  );
  assert.match(panelSource, /isLoadingTags/);
  assert.ok(widthClassMatch);

  const widthClasses = [...widthClassMatch[1].matchAll(/'([^']+)'/g)].map(
    ([, className]) => className,
  );

  assert.equal(widthClasses.length, 8);
  assert.equal(new Set(widthClasses).size, widthClasses.length);
  assert.match(panelSource, /SKELETON_TAG_CHIP_WIDTH_CLASSES\.map/);
  assert.match(panelSource, /<Skeleton/);
  assert.match(panelSource, /className=\{`h-10 \$\{widthClass\}`\}/);
  assert.match(panelSource, /aria-hidden="true"/);
  assert.doesNotMatch(panelSource, /className="h-10 w-20"/);
  assert.doesNotMatch(panelSource, /키워드를 불러오고 있어요/);
});

test('story keyword step enables storyline generation only after required categories are selected', () => {
  const sectionSource = keywordSectionSource();
  const hookSource = storyKeywordHookSource();

  assert.match(hookSource, /selectedTagIdsByCategory\.GENRE\.length > 0/);
  assert.match(hookSource, /selectedTagIdsByCategory\.PROTAGONIST\.length > 0/);
  assert.match(hookSource, /const canGenerateStoryline =/);
  assert.match(
    sectionSource,
    /disabled=\{!canGenerateStoryline \|\| isGeneratingStoryline\}/,
  );
});

test('story keyword step swaps the generate button label for a spinner while storylines are loading', () => {
  const sectionSource = keywordSectionSource();
  const loadingSource = loadingButtonContentSource();

  assert.match(
    loadingSource,
    /import \{ Spinner \} from '@\/components\/ui\/spinner';/,
  );
  assert.match(sectionSource, /className="relative"/);
  assert.match(sectionSource, /<LoadingButtonContent/);
  assert.match(
    loadingSource,
    /className=\{isLoading \? 'invisible' : undefined\}/,
  );
  assert.match(loadingSource, /isLoading && <Spinner/);
  assert.match(loadingSource, /aria-label=\{loadingLabel\}/);
  assert.match(sectionSource, /loadingLabel="스토리라인 생성 중"/);
});

test('story keyword step disables every keyword toggle chip while storylines are pending', () => {
  const panelSource = keywordCategoryPanelSource();

  assert.match(
    panelSource,
    /const isKeywordChipDisabled =\s*isGeneratingStoryline \|\|\s*\(!isSelected && isMaxSelectionReached\);/,
  );

  const disabledChipMatches = [
    ...panelSource.matchAll(/disabled=\{isKeywordChipDisabled\}/g),
  ];

  assert.equal(disabledChipMatches.length, 2);
});

test('story keyword step sends selected predefined and custom tags to the funnel without logging the response', () => {
  const source = storyKeywordHookSource();

  assert.match(source, /const request: GenerateSimpleStorylinesRequest/);
  assert.match(source, /onGenerateStoryline\(request\)/);
  assert.match(source, /selectedTagIds:/);
  assert.match(source, /customTags:/);
  assert.match(source, /category: keyword\.category/);
  assert.doesNotMatch(source, /onSuccess: \(response\) => \{/);
  assert.doesNotMatch(
    source,
    /console\.log\('스토리라인 생성 응답', response\);/,
  );
});

test('story keyword step lets users add a custom keyword to the active category and auto-selects it', () => {
  const sectionSource = keywordSectionSource();
  const panelSource = keywordCategoryPanelSource();
  const hookSource = storyKeywordHookSource();

  assert.match(sectionSource, /<StoryKeywordCategoryPanel/);
  assert.match(sectionSource, /onAddCustomKeyword=\{addCustomKeyword\}/);
  assert.match(panelSource, /<AddKeywordDialog/);
  assert.match(panelSource, /category=\{category\}/);
  assert.match(panelSource, /placeholder=\{placeholder\}/);
  assert.match(panelSource, /onAddKeyword=\{\(keyword\) =>/);
  assert.match(hookSource, /setCustomKeywordsByCategory/);
  assert.match(hookSource, /crypto\.randomUUID\(\)/);
  assert.match(hookSource, /selectedCustomKeywordIdsByCategory/);
});

test('add keyword dialog limits input to fifteen characters and submits the trimmed keyword', () => {
  const dialogSource = addKeywordDialogSource();
  const hookSource = addKeywordDialogHookSource();
  const constantSource = constantsSource();

  assert.match(dialogSource, /^'use client';/);
  assert.match(dialogSource, /open=\{open\}/);
  assert.match(dialogSource, /onOpenChange=\{setOpen\}/);
  assert.match(dialogSource, /onSubmit=\{handleSubmit\}/);
  assert.match(dialogSource, /placeholder=\{placeholder\}/);
  assert.match(dialogSource, /InputGroupTextarea/);
  assert.match(dialogSource, /InputGroupAddon/);
  assert.match(dialogSource, /InputGroupText/);
  assert.match(dialogSource, /maxLength=\{ADD_KEYWORD_MAX_LENGTH\}/);
  assert.match(dialogSource, /rows=\{1\}/);
  assert.match(dialogSource, /className="min-h-10"/);
  assert.match(dialogSource, /value=\{keyword\}/);
  assert.match(
    dialogSource,
    /\{keyword\.length\}\s*\/\s*\{ADD_KEYWORD_MAX_LENGTH\}/,
  );
  assert.doesNotMatch(dialogSource, /10자 이내로 입력해주세요/);
  assert.match(hookSource, /setKeyword\(event\.target\.value\.slice/);
  assert.match(hookSource, /ChangeEvent<HTMLTextAreaElement>/);
  assert.match(hookSource, /ADD_KEYWORD_MAX_LENGTH/);
  assert.match(hookSource, /const trimmedKeyword = keyword\.trim\(\)/);
  assert.match(hookSource, /onAddKeyword\(trimmedKeyword\)/);
  assert.match(hookSource, /isSubmitDisabled: keyword\.trim\(\)\.length === 0/);
  assert.match(dialogSource, /disabled=\{isSubmitDisabled\}/);
  assert.match(constantSource, /export const ADD_KEYWORD_MAX_LENGTH = 15;/);
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
