import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchSharedChatForMetadata } from '@/lib/shares/backend-share-client';

describe('fetchSharedChatForMetadata', () => {
  beforeEach(() => {
    // 실제 환경의 API_BASE_URL은 /api를 포함하지 않는다. 접두사는 생성된 URL 빌더가 붙인다.
    vi.stubEnv('API_BASE_URL', 'https://backend.example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('생성된 URL 빌더 경로로 백엔드를 호출하고 본문을 반환한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ storyTitle: '제목' }), { status: 200 }),
      );

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchSharedChatForMetadata('abc')).resolves.toEqual({
      storyTitle: '제목',
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://backend.example.com/api/v1/shares/abc',
    );
  });

  it('베이스 URL 끝의 슬래시가 경로와 겹치지 않는다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 200 }));

    vi.stubEnv('API_BASE_URL', 'https://backend.example.com/');
    vi.stubGlobal('fetch', fetchMock);

    await fetchSharedChatForMetadata('abc');

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://backend.example.com/api/v1/shares/abc',
    );
  });

  it('404는 null로 정규화한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 404 })),
    );

    await expect(fetchSharedChatForMetadata('abc')).resolves.toBeNull();
  });

  it('네트워크가 실패해도 throw하지 않고 null을 반환한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

    await expect(fetchSharedChatForMetadata('abc')).resolves.toBeNull();
  });

  it('API_BASE_URL이 없으면 호출하지 않고 null을 반환한다', async () => {
    const fetchMock = vi.fn();

    vi.stubEnv('API_BASE_URL', '');
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchSharedChatForMetadata('abc')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
