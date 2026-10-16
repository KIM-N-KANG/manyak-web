import { describe, expect, it } from 'vitest';

import type { PendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import type { StoryDraftCard } from '@/features/stories/_shared/utils/story-draft-response';
import { mergeDraftCards } from '@/features/studio/menu/utils/merge-draft-cards';

const card = (draftId: string, createdAt: string): StoryDraftCard => ({
  draftId,
  mode: 'GENERAL',
  stage: 'GENERAL_DRAFT',
  title: null,
  oneLineIntro: null,
  thumbnailUrl: null,
  version: 1,
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
