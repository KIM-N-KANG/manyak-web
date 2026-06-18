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
const typesSource = () =>
  readFileSync('src/features/stories/new/types.ts', 'utf8');
const storylineTabsSource = () =>
  readFileSync('src/features/stories/new/utils/storyline-tabs.ts', 'utf8');
const storylineSelectLoadingStateSource = () =>
  readFileSync(
    'src/features/stories/new/components/storyline-select-loading-state.tsx',
    'utf8',
  );
const storyTextSource = () =>
  readFileSync('src/features/stories/components/story-text.tsx', 'utf8');

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

test('storyline select step displays story text with MaruBuri font and has required CTAs', () => {
  const text = source();
  const constantText = constantsSource();
  const storyText = storyTextSource();

  assert.match(text, /StoryText/);
  assert.match(text, /font="maruburi"/);
  assert.match(storyText, /font-maruburi/);
  assert.match(text, /마음에 드는/);
  assert.match(text, /스토리라인을 선택해주세요/);
  assert.match(constantText, /'storyline-select': '2 \/ 3'/);
  assert.match(text, /variant="secondary"/);
  assert.match(text, /다시 만들기/);
  assert.match(text, /선택하기/);
  assert.match(text, /onRegenerateStorylines/);
  assert.match(text, /onSelectStoryline/);
});

test('storyline select step shows storyline text skeletons while storylines are loading', () => {
  const text = source();
  const constants = constantsSource();
  const loadingState = storylineSelectLoadingStateSource();

  assert.match(
    loadingState,
    /import \{ Skeleton \} from '@\/components\/ui\/skeleton';/,
  );
  assert.match(text, /const isLoadingStorylines = isRegeneratingStorylines;/);
  assert.match(text, /import \{ StorylineSelectLoadingState \}/);
  assert.match(loadingState, /function StorylineTextSkeleton/);
  assert.match(loadingState, /<StorylineTextSkeleton \/>/);
  assert.match(loadingState, /STORYLINE_SELECT_LOADING_LABEL/);
  assert.match(constants, /export const STORYLINE_SELECT_LOADING_LABEL/);
  assert.match(
    constants,
    /export const STORYLINE_SELECT_LOADING_TAB_COUNT = 3;/,
  );
  assert.match(
    constants,
    /export const STORYLINE_TEXT_SKELETON_WIDTH_CLASSES = \[/,
  );
  assert.match(text, /!isLoadingStorylines && storylines\.length === 0/);
});

test('storyline select step keeps shared constants, types, and utilities outside the component', () => {
  const text = source();
  const types = typesSource();
  const storylineTabs = storylineTabsSource();

  assert.match(
    text,
    /import type \{ StorylineSelectStepSectionProps \} from '\.\.\/types';/,
  );
  assert.match(types, /export type StorylineSelectStepSectionProps = \{/);
  assert.doesNotMatch(text, /type StorylineSelectStepSectionProps = \{/);
  assert.match(
    text,
    /import \{ getStorylineTabValue \} from '\.\.\/utils\/storyline-tabs';/,
  );
  assert.match(
    storylineTabs,
    /export const getStorylineTabValue = \(index: number\) => String\(index\);/,
  );
  assert.doesNotMatch(
    text,
    /const getStorylineTabValue = \(index: number\) => String\(index\);/,
  );
});

test('story text breaks long generated stories into readable lines', () => {
  const storyText = storyTextSource();

  assert.match(storyText, /getStoryTextLines/);
  assert.match(storyText, /STORY_TEXT_EXPLICIT_LINE_BREAK_PATTERN/);
  assert.match(storyText, /STORY_TEXT_SENTENCE_BREAK_PATTERN/);
  assert.match(storyText, /lines\.map/);
  assert.match(storyText, /<p key=/);
  assert.match(storyText, /className=\{cn\(/);
  assert.match(storyText, /'flex flex-col gap-\d text-base leading-loose'/);
  assert.match(storyText, /font === 'maruburi' && 'font-maruburi'/);
  assert.doesNotMatch(
    storyText,
    /<p className="font-maruburi text-base leading-loose">\{children\}<\/p>/,
  );
});

test('story text lets each consumer choose whether to use MaruBuri', () => {
  const storyText = storyTextSource();

  assert.match(storyText, /type StoryTextProps = \{/);
  assert.match(storyText, /font\?: 'default' \| 'maruburi';/);
  assert.match(storyText, /font = 'default'/);
  assert.doesNotMatch(storyText, /StorylineText/);
});

test('storyline select step scrolls the whole step content between header and footer', () => {
  const text = source();

  assert.doesNotMatch(text, /@\/components\/ui\/scroll-area/);
  assert.match(
    text,
    /<main className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-16">/,
  );
  assert.match(text, /<section className="flex flex-col">/);
  assert.doesNotMatch(text, /className="min-h-0 flex-1 overflow-hidden"/);
  assert.doesNotMatch(text, /className="min-h-0"/);
  assert.doesNotMatch(text, /<div className="h-full overflow-y-auto">/);
  assert.match(text, /<div className="p-4">/);
  assert.doesNotMatch(text, /<ScrollArea/);
});
