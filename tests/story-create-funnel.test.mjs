import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

const pageSource = () => read('src/app/(create)/stories/new/page.tsx');
const funnelSource = () =>
  read('src/features/stories/new/components/story-create-funnel.tsx');
const funnelHookSource = () =>
  read('src/features/stories/new/hooks/use-story-create-funnel.ts');
const keywordSectionSource = () =>
  read('src/features/stories/new/components/story-keyword-step-section.tsx');
const keywordCategoryPanelSource = () =>
  read('src/features/stories/new/components/story-keyword-category-panel.tsx');
const keywordHookSource = () =>
  read('src/features/stories/new/hooks/use-story-keyword-step.ts');
const stepTitleSource = () =>
  read('src/features/stories/new/components/story-create-step-title.tsx');
const storageSource = () =>
  read('src/features/stories/new/utils/story-id-storage.ts');

test('new story page delegates the client-side funnel to StoryCreateFunnel', () => {
  const source = pageSource();

  assert.match(source, /StoryCreateFunnel/);
  assert.doesNotMatch(source, /StoryCreateStepTitle/);
  assert.doesNotMatch(source, /StoryKeywordStepSection/);
});

test('story create funnel orchestrates storyline generation, selection, creation, and completion steps', () => {
  const source = funnelSource();
  const hookSource = funnelHookSource();

  assert.match(source, /^'use client';/);
  assert.match(source, /useStoryCreateFunnel/);
  assert.match(source, /StoryKeywordStepSection/);
  assert.match(source, /StorylineSelectStepSection/);
  assert.match(source, /StoryAdditionalInfoStepSection/);
  assert.match(source, /StoryCompletionSection/);
  assert.match(hookSource, /useGenerateSimpleStorylines/);
  assert.match(hookSource, /useCreateSimpleStory/);
  assert.match(hookSource, /generationRequest/);
  assert.match(hookSource, /handleRegenerateStorylines/);
  assert.match(hookSource, /simpleCreationId/);
  assert.match(hookSource, /storylineId/);
  assert.match(hookSource, /additionalInfos/);
  assert.match(hookSource, /saveCreatedStoryId/);
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

test('story create funnel moves to storyline selection as soon as generation starts', () => {
  const hookSource = funnelHookSource();
  const handlerMatch = hookSource.match(
    /const handleGenerateStoryline = \(\s*request: GenerateSimpleStorylinesRequest,\s*\) => \{([\s\S]*?)\n  \};/,
  );

  assert.ok(handlerMatch);

  const handlerSource = handlerMatch[1];
  const moveToStorylineSelectIndex = handlerSource.indexOf(
    "setStep('storyline-select');",
  );
  const mutateIndex = handlerSource.indexOf(
    'generateStorylines.mutate({ data: request });',
  );

  assert.match(handlerSource, /setGenerationRequest\(request\);/);
  assert.match(handlerSource, /setGenerationResult\(null\);/);
  assert.match(handlerSource, /setActiveStorylineIndex\(0\);/);
  assert.match(handlerSource, /setSelectedStoryline\(null\);/);
  assert.ok(moveToStorylineSelectIndex >= 0);
  assert.ok(mutateIndex >= 0);
  assert.ok(moveToStorylineSelectIndex < mutateIndex);
});

test('story create funnel lets users return from additional info to storyline selection', () => {
  const source = funnelSource();
  const hookSource = funnelHookSource();

  assert.match(hookSource, /handleBackToStorylineSelect/);
  assert.match(hookSource, /setStep\('storyline-select'\)/);
  assert.match(
    source,
    /onBackToStorylineSelect=\{handleBackToStorylineSelect\}/,
  );
});

test('story create funnel requires back confirmation after storylines are generated', () => {
  const source = funnelSource();
  const hookSource = funnelHookSource();

  assert.match(hookSource, /const shouldConfirmBack = step !== 'keyword';/);
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
  const panelSource = keywordCategoryPanelSource();
  const titleSource = stepTitleSource();

  assert.match(source, /<StoryCreateStepTitle/);
  assert.match(
    source,
    /titleLines=\{\['만들고 싶은 스토리의', '키워드를 선택해주세요'\]\}/,
  );
  assert.match(titleSource, /titleLines\.map/);
  assert.match(titleSource, /text-xl font-semibold/);
  assert.match(titleSource, /text-foreground-secondary/);
  assert.doesNotMatch(panelSource, /@\/components\/ui\/scroll-area/);
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
  assert.match(source, /<StoryKeywordCategoryPanel/);
  assert.match(panelSource, /<div className="h-full overflow-y-auto">/);
  assert.doesNotMatch(source, /overflow-y-auto/);
  assert.doesNotMatch(panelSource, /<ScrollArea/);
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
