import { describe, expect, it } from 'vitest';

import type {
  PendingCreationRequest,
  StoryCompletionRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { mergeDraftCards } from '@/features/stories/_shared/utils/merge-draft-cards';
import type { StoryDraftCard } from '@/features/stories/_shared/utils/story-draft-response';

const card = (
  draftId: string,
  createdAt: string,
  version = 1,
): StoryDraftCard => ({
  draftId,
  mode: 'GENERAL',
  stage: 'GENERAL_DRAFT',
  title: null,
  oneLineIntro: null,
  thumbnailUrl: null,
  version,
  createdAt,
});

const keywordDraft = (
  requestId: string,
  createdAt?: string,
): PendingCreationRequest => ({
  stage: 'KEYWORD_DRAFT',
  requestId,
  createdAt,
  snapshot: {
    selectedGenreTagIds: [],
    customGenreTags: [],
    protagonist: {
      name: '',
      gender: 'MALE',
      selectedTagIds: [],
      customTags: [],
    },
    supportingCharacters: [],
  },
});

const ids = (items: ReturnType<typeof mergeDraftCards>) =>
  items.map((item) =>
    item.source === 'server'
      ? `server:${item.card.draftId}`
      : `local:${item.record.requestId}`,
  );

describe('mergeDraftCards', () => {
  it('서버와 로컬 초안을 처음 저장 시각 최신순으로 합친다', () => {
    const merged = mergeDraftCards(
      [keywordDraft('k1', '2026-10-16T02:00:00.000Z')],
      [
        card('s1', '2026-10-16T03:00:00.000000Z'),
        card('s2', '2026-10-16T01:00:00.000000Z'),
      ],
    );

    expect(ids(merged)).toEqual(['server:s1', 'local:k1', 'server:s2']);
  });

  it('같은 ID가 서버와 로컬에 모두 있으면 서버 초안 하나만 남긴다', () => {
    const merged = mergeDraftCards(
      [keywordDraft('same', '2026-10-16T05:00:00.000Z')],
      [card('same', '2026-10-16T01:00:00.000000Z')],
    );

    expect(ids(merged)).toEqual(['server:same']);
  });

  const generating: PendingCreationRequest = {
    stage: 'STORYLINE_GENERATION',
    requestId: 'g1',
    createdAt: '2026-10-16T02:00:00.000Z',
    generationRequest: {
      requestId: 'g1',
      genreTagIds: [1],
      protagonist: {
        name: null,
        gender: null,
        featureTagIds: [],
        customTags: [],
      },
      supportingCharacters: [],
    },
    draftId: 'linked',
    draftVersion: 1,
  };

  it('기기 안 진행 기록이 가리키는 서버 초안은 숨기고 기기 안 기록에 숨긴 초안 ID를 싣는다', () => {
    const merged = mergeDraftCards(
      [generating],
      [
        card('linked', '2026-10-16T02:00:00.000000Z'),
        card('s1', '2026-10-16T01:00:00.000000Z'),
      ],
    );

    expect(ids(merged)).toEqual(['local:g1', 'server:s1']);
    expect(merged[0]).toMatchObject({ hiddenServerDraftId: 'linked' });
  });

  it('기기 안 기록보다 새로 저장된 서버 초안은 숨기지 않는다', () => {
    const merged = mergeDraftCards(
      [generating],
      [card('linked', '2026-10-16T03:00:00.000000Z', 2)],
    );

    expect(ids(merged)).toEqual(['server:linked', 'local:g1']);
    expect(merged[1]).not.toHaveProperty('hiddenServerDraftId');
  });

  it('완성 기록이 가리키는 서버 초안은 그 기록 뒤에 저장되지 않았을 때만 숨긴다', () => {
    const completion = {
      stage: 'STORY_COMPLETION',
      requestId: 'c1',
      draftId: 'linked',
      draftVersion: 1,
    } as StoryCompletionRecord;

    expect(
      ids(
        mergeDraftCards(
          [],
          [card('linked', '2026-10-16T02:00:00.000000Z')],
          [completion],
        ),
      ),
    ).toEqual([]);
    expect(
      ids(
        mergeDraftCards(
          [],
          [card('linked', '2026-10-16T02:00:00.000000Z', 2)],
          [completion],
        ),
      ),
    ).toEqual(['server:linked']);
  });

  it('시각이 없는 로컬 레코드는 맨 뒤에 원래 순서대로 둔다', () => {
    const merged = mergeDraftCards(
      [
        keywordDraft('old-a'),
        keywordDraft('k1', '2026-10-16T02:00:00.000Z'),
        keywordDraft('old-b'),
      ],
      [card('s1', '2026-10-16T01:00:00.000000Z')],
    );

    expect(ids(merged)).toEqual([
      'local:k1',
      'server:s1',
      'local:old-a',
      'local:old-b',
    ]);
  });
});
