import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_STORY_LIST_QUERY } from '@/features/stories/list/constants';
import {
  fetchOriginalStoriesOnServer,
  fetchOriginalStoryOnServer,
  fetchPublicStoriesOnServer,
} from '@/lib/stories/backend-story-client';

describe('fetchOriginalStoriesOnServer', () => {
  beforeEach(() => {
    vi.stubEnv('API_BASE_URL', 'https://backend.example.com/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('filter=original 목록을 커서가 끝날 때까지 이어 읽는다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ items: [{ id: 's1' }], nextCursor: 'c1' }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ items: [{ id: 's2' }], nextCursor: null }),
          { status: 200 },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchOriginalStoriesOnServer()).resolves.toEqual([
      { id: 's1' },
      { id: 's2' },
    ]);
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      'https://backend.example.com/api/v1/stories?filter=original&sort=latest&limit=50',
      'https://backend.example.com/api/v1/stories?filter=original&sort=latest&limit=50&cursor=c1',
    ]);
  });

  it('중간 페이지가 실패하면 일부 목록 대신 null을 반환한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ items: [{ id: 's1' }], nextCursor: 'c1' }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(new Response('', { status: 500 })),
    );

    await expect(fetchOriginalStoriesOnServer()).resolves.toBeNull();
  });

  it('실패 응답·네트워크 오류는 throw하지 않고 null을 반환한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 500 })),
    );
    await expect(fetchOriginalStoriesOnServer()).resolves.toBeNull();

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
    await expect(fetchOriginalStoriesOnServer()).resolves.toBeNull();
  });

  it('API_BASE_URL이 없으면 호출하지 않고 null을 반환한다', async () => {
    const fetchMock = vi.fn();

    vi.stubEnv('API_BASE_URL', '');
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchOriginalStoriesOnServer()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('fetchPublicStoriesOnServer', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('필터·정렬을 쿼리로 실어 첫 페이지를 반환한다', async () => {
    const page = { items: [{ id: 's1' }], nextCursor: 'c1' };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(page), { status: 200 }));

    vi.stubEnv('API_BASE_URL', 'https://backend.example.com');
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchPublicStoriesOnServer(DEFAULT_STORY_LIST_QUERY),
    ).resolves.toEqual(page);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://backend.example.com/api/v1/stories?filter=all&sort=popular',
    );
  });
});

describe('fetchOriginalStoryOnServer', () => {
  const detail = {
    id: 'orig',
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    title: '용의 계곡',
    description: '공개 소개',
    author: { id: 7, nickname: '마냑' },
    isOwner: true,
    isLiked: true,
    reachedEndings: ['개인 엔딩'],
    lorebooks: [{ content: '숨겨진 설정' }],
    mainEvents: ['미공개 사건'],
    characters: [{ name: '용', description: '공개 인물 소개', secret: '숨김' }],
    startSettings: [
      {
        id: 'start',
        name: '계곡',
        startSituation: '공개 상황',
        prologue: '프롤로그',
        endings: [
          {
            name: '공개 엔딩 이름',
            requirement: { achievementCondition: '비밀 조건' },
            epilogue: '에필로그',
          },
        ],
      },
    ],
  };

  beforeEach(() => vi.stubEnv('API_BASE_URL', 'https://backend.example.com/'));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const mockDetail = (body: object, status = 200) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ items: [{ id: 'orig' }] }))
      .mockResolvedValueOnce(Response.json(body, { status }));

    vi.stubGlobal('fetch', fetchMock);

    return fetchMock;
  };

  it('화면의 공개 필드만 추리고 인증 없이 캐시하지 않는 상세 요청을 사용한다', async () => {
    const fetchMock = mockDetail(detail);
    const result = await fetchOriginalStoryOnServer('orig');

    expect(result).toMatchObject({
      title: detail.title,
      description: detail.description,
      author: { nickname: '마냑' },
    });
    expect(result?.startSettings).toEqual([
      {
        id: 'start',
        name: '계곡',
        startSituation: '공개 상황',
        endings: [{ name: '공개 엔딩 이름' }],
      },
    ]);
    expect(result?.characters).toEqual([
      { name: '용', description: '공개 인물 소개' },
    ]);

    for (const key of [
      'isOwner',
      'isLiked',
      'reachedEndings',
      'lorebooks',
      'mainEvents',
    ]) {
      expect(result).not.toHaveProperty(key);
    }

    expect(result?.author).not.toHaveProperty('id');
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://backend.example.com/api/v1/stories/orig',
    );
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ cache: 'no-store' });
    expect(fetchMock.mock.calls[1][1]).not.toHaveProperty('headers');
  });

  it.each([[], null])(
    '목록에서 오리지널을 확인하지 못하면 상세를 읽지 않는다: %j',
    async (items) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          items ? Response.json({ items }) : new Response('', { status: 503 }),
        );

      vi.stubGlobal('fetch', fetchMock);
      expect(await fetchOriginalStoryOnServer('orig')).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each([401, 403, 404, 500, 503])(
    '상세 %i는 미존재로 확정하지 않고 클라이언트 조회로 넘긴다',
    async (status) => {
      mockDetail({}, status);
      expect(await fetchOriginalStoryOnServer('orig')).toBeNull();
    },
  );

  it.each([
    { visibility: 'PRIVATE' },
    { status: 'DRAFT' },
    { id: 'other' },
    { visibility: undefined },
  ])(
    '목록이 오래됐거나 상세가 유효하지 않으면 노출하지 않는다: %j',
    async (override) => {
      mockDetail({ ...detail, ...override });
      expect(await fetchOriginalStoryOnServer('orig')).toBeNull();
    },
  );

  it('네트워크 실패나 잘못된 JSON도 클라이언트에서 복구한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ items: [{ id: 'orig' }] }))
      .mockRejectedValueOnce(new Error('network'));

    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchOriginalStoryOnServer('orig')).toBeNull();
    fetchMock
      .mockResolvedValueOnce(Response.json({ items: [{ id: 'orig' }] }))
      .mockResolvedValueOnce(new Response('invalid JSON'));
    expect(await fetchOriginalStoryOnServer('orig')).toBeNull();
  });
});
