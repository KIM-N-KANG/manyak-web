import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchOriginalStoriesOnServer } from '@/lib/stories/backend-story-client';

describe('fetchOriginalStoriesOnServer', () => {
  beforeEach(() => {
    vi.stubEnv('API_BASE_URL', 'https://backend.example.com/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('생성된 URL 빌더 경로로 백엔드를 호출하고 목록을 반환한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify([{ id: 's1' }]), { status: 200 }),
      );

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchOriginalStoriesOnServer()).resolves.toEqual([
      { id: 's1' },
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://backend.example.com/api/v1/stories/originals',
    );
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
