import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_STORY_LIST_QUERY } from '@/features/stories/list/constants';
import {
  fetchOriginalStoriesOnServer,
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
      'https://backend.example.com/api/v1/stories?filter=all&sort=latest',
    );
  });
});
