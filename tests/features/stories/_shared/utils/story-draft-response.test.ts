import { describe, expect, it } from 'vitest';

import {
  readDraftSaveError,
  readStoryDraftCards,
  readStoryDraftDetail,
} from '@/features/stories/_shared/utils/story-draft-response';
import { FetchError } from '@/lib/api-error';

const CARD = {
  kind: 'DRAFT',
  draftId: '16410000-0000-4000-8000-000000000001',
  mode: 'GENERAL',
  stage: 'GENERAL_DRAFT',
  title: '노선도에 없는 역',
  oneLineIntro: null,
  thumbnailUrl: 'https://cdn.test/thumbnails/uploaded/drafts/u/a.jpg',
  version: 2,
  createdAt: '2026-10-16T01:00:00Z',
  updatedAt: '2026-10-16T02:00:00Z',
};

describe('readStoryDraftCards', () => {
  it('초안 항목만 남기고 요약을 읽는다', () => {
    const cards = readStoryDraftCards([
      CARD,
      {
        kind: 'CREATION_REQUEST',
        requestId: 'r-1',
        stage: 'STORYLINE_GENERATION',
        createdAt: '2026-10-16T03:00:00Z',
      },
      { ...CARD, draftId: 'missing-version', version: '1' },
      { ...CARD, draftId: 'bad-mode', mode: 'OTHER' },
      { ...CARD, draftId: 'no-created-at', createdAt: undefined },
      { ...CARD, draftId: 'bad-stage', stage: 'STORYLINE_GENERATION' },
    ]);

    expect(cards).toEqual([
      {
        draftId: CARD.draftId,
        mode: 'GENERAL',
        stage: 'GENERAL_DRAFT',
        title: '노선도에 없는 역',
        oneLineIntro: null,
        thumbnailUrl: CARD.thumbnailUrl,
        version: 2,
        createdAt: CARD.createdAt,
      },
    ]);
  });

  it('요약이 문자열이 아니면 null로 읽는다', () => {
    const [card] = readStoryDraftCards([{ ...CARD, title: 3 }]);

    expect(card.title).toBeNull();
  });

  it('배열이 아니면 빈 목록이다', () => {
    expect(readStoryDraftCards({ items: [CARD] })).toEqual([]);
  });
});

describe('readStoryDraftDetail', () => {
  const DETAIL = {
    ...CARD,
    kind: undefined,
    schemaVersion: 1,
    payload: { texts: { title: '노선도에 없는 역' } },
    generationRequestId: null,
    imageUrls: {
      'thumbnails/uploaded/drafts/u/a.jpg': 'https://cdn.test/a.jpg',
      broken: 3,
    },
    generation: null,
  };

  it('상세의 payload와 문자열 이미지 URL만 읽는다', () => {
    expect(readStoryDraftDetail(DETAIL)).toEqual({
      draftId: CARD.draftId,
      mode: 'GENERAL',
      stage: 'GENERAL_DRAFT',
      title: '노선도에 없는 역',
      oneLineIntro: null,
      thumbnailUrl: CARD.thumbnailUrl,
      version: 2,
      createdAt: CARD.createdAt,
      schemaVersion: 1,
      payload: { texts: { title: '노선도에 없는 역' } },
      imageUrls: {
        'thumbnails/uploaded/drafts/u/a.jpg': 'https://cdn.test/a.jpg',
      },
      generationRequestId: null,
      generation: null,
    });
  });

  it('연결한 생성 요청과 그 복구 조회 결과를 읽는다', () => {
    const detail = readStoryDraftDetail({
      ...DETAIL,
      mode: 'SIMPLE',
      stage: 'STORY_DRAFT',
      generationRequestId: 'g-1',
      generation: {
        stage: 'STORYLINE_GENERATION',
        status: 'COMPLETED',
        result: { storylines: [] },
      },
    });

    expect(detail?.generationRequestId).toBe('g-1');
    expect(detail?.generation).toEqual({
      status: 'COMPLETED',
      result: { storylines: [] },
    });
  });

  it('생성 결과의 상태를 읽을 수 없으면 연결 결과를 null로 읽는다', () => {
    expect(
      readStoryDraftDetail({ ...DETAIL, generation: { result: {} } })
        ?.generation,
    ).toBeNull();
  });

  it('이미지 URL 맵이 없으면 빈 객체다', () => {
    expect(
      readStoryDraftDetail({ ...DETAIL, imageUrls: undefined })?.imageUrls,
    ).toEqual({});
  });

  it('payload가 객체가 아니면 읽지 않는다', () => {
    expect(readStoryDraftDetail({ ...DETAIL, payload: [] })).toBeNull();
    expect(readStoryDraftDetail({ ...DETAIL, payload: null })).toBeNull();
  });

  it('스키마 버전이 숫자가 아니면 읽지 않는다', () => {
    expect(readStoryDraftDetail({ ...DETAIL, schemaVersion: '1' })).toBeNull();
  });
});

describe('readDraftSaveError', () => {
  it('버전 충돌은 서버의 현재 버전과 함께 읽는다', () => {
    const error = new FetchError('', 409, {
      code: 'DRAFT_VERSION_CONFLICT',
      details: [
        { field: 'version', message: '3' },
        { field: 'updatedAt', message: '2026-10-16T00:00:00Z' },
      ],
    });

    expect(readDraftSaveError(error)).toEqual({
      kind: 'conflict',
      version: 3,
    });
  });

  it('충돌인데 현재 버전을 알 수 없으면 실패로 본다', () => {
    const error = new FetchError('', 409, { code: 'DRAFT_VERSION_CONFLICT' });

    expect(readDraftSaveError(error)).toEqual({ kind: 'failed' });
  });

  it('개수 상한과 용량 초과를 구분한다', () => {
    expect(
      readDraftSaveError(
        new FetchError('', 400, { code: 'DRAFT_LIMIT_EXCEEDED' }),
      ),
    ).toEqual({ kind: 'limit' });
    expect(
      readDraftSaveError(
        new FetchError('', 400, { code: 'DRAFT_PAYLOAD_TOO_LARGE' }),
      ),
    ).toEqual({ kind: 'tooLarge' });
  });

  it('그 밖의 오류는 실패다', () => {
    expect(readDraftSaveError(new TypeError('Failed to fetch'))).toEqual({
      kind: 'failed',
    });
    expect(
      readDraftSaveError(new FetchError('', 500, { code: 'INTERNAL' })),
    ).toEqual({ kind: 'failed' });
  });
});
