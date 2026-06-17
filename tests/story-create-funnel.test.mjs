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

test('story create funnel lets users return from additional info to storyline selection', () => {
  const source = funnelSource();

  assert.match(source, /handleBackToStorylineSelect/);
  assert.match(source, /setStep\('storyline-select'\)/);
  assert.match(
    source,
    /onBackToStorylineSelect=\{handleBackToStorylineSelect\}/,
  );
});

test('story create funnel requires back confirmation after storylines are generated', () => {
  const source = funnelSource();

  assert.match(source, /const shouldConfirmBack = step !== 'keyword';/);
  assert.match(source, /requiresBackConfirmation=\{shouldConfirmBack\}/);
});

test('story create funnel constrains the viewport so step sections own scrolling', () => {
  const source = funnelSource();

  assert.match(
    source,
    /<div className="flex h-svh min-h-0 flex-col overflow-hidden">/,
  );
});

test('story keyword step keeps the title and tabs fixed while tab panels scroll', () => {
  const source = keywordSectionSource();

  assert.match(
    source,
    /import \{ ScrollArea \} from '@\/components\/ui\/scroll-area';/,
  );
  assert.match(
    source,
    /<main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-16">/,
  );
  assert.match(
    source,
    /<section className="flex min-h-0 flex-1 flex-col overflow-hidden">/,
  );
  assert.match(source, /className="min-h-0 flex-1 overflow-hidden"/);
  assert.match(
    source,
    /<TabsContent\s+key=\{category\}\s+value=\{category\}\s+className="min-h-0">/,
  );
  assert.match(source, /<ScrollArea className="h-full">/);
  assert.doesNotMatch(source, /overflow-y-auto/);
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
