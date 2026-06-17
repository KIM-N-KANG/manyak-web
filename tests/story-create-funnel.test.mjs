import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

const pageSource = () => read('src/app/(create)/stories/new/page.tsx');
const funnelSource = () =>
  read('src/features/stories/new/components/story-create-funnel.tsx');
const keywordSectionSource = () =>
  read('src/features/stories/new/components/story-keyword-step-section.tsx');
const keywordHookSource = () =>
  read('src/features/stories/new/hooks/use-story-keyword-step.ts');
const storageSource = () =>
  read('src/features/stories/new/utils/story-id-storage.ts');

test('new story page delegates the client-side funnel to StoryCreateFunnel', () => {
  const source = pageSource();

  assert.match(source, /StoryCreateFunnel/);
  assert.doesNotMatch(source, /StoryCreateTitle/);
  assert.doesNotMatch(source, /StoryKeywordStepSection/);
});

test('story create funnel orchestrates storyline generation, selection, creation, and completion steps', () => {
  const source = funnelSource();

  assert.match(source, /^'use client';/);
  assert.match(source, /useGenerateSimpleStorylines/);
  assert.match(source, /useCreateSimpleStory/);
  assert.match(source, /StoryKeywordStepSection/);
  assert.match(source, /StorylineSelectStepSection/);
  assert.match(source, /StoryAdditionalInfoStepSection/);
  assert.match(source, /StoryCompletionSection/);
  assert.match(source, /generationRequest/);
  assert.match(source, /handleRegenerateStorylines/);
  assert.match(source, /simpleCreationId/);
  assert.match(source, /storylineId/);
  assert.match(source, /additionalInfos/);
  assert.match(source, /saveCreatedStoryId/);
});

test('story keyword step builds a storyline request and lets the funnel own the mutation result', () => {
  const sectionSource = keywordSectionSource();
  const hookSource = keywordHookSource();

  assert.match(sectionSource, /onGenerateStoryline/);
  assert.match(sectionSource, /isGeneratingStoryline/);
  assert.match(hookSource, /GenerateSimpleStorylinesRequest/);
  assert.match(hookSource, /onGenerateStoryline\(request\)/);
  assert.doesNotMatch(hookSource, /useGenerateSimpleStorylines/);
});

test('created story ids are stored as a de-duplicated localStorage list', () => {
  const source = storageSource();

  assert.match(source, /CREATED_STORY_IDS_STORAGE_KEY/);
  assert.match(source, /localStorage\.getItem/);
  assert.match(source, /localStorage\.setItem/);
  assert.match(source, /JSON\.parse/);
  assert.match(source, /JSON\.stringify/);
  assert.match(
    source,
    /filter\(\(savedStoryId\) => savedStoryId !== storyId\)/,
  );
});
