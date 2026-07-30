import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateMetadata } from '@/app/(share)/share/[shareId]/page';
import {
  fetchSharedChatForMetadata,
  fetchStoryThumbnailForMetadata,
} from '@/lib/shares/backend-share-client';

vi.mock('@/lib/shares/backend-share-client', () => ({
  fetchSharedChatForMetadata: vi.fn(),
  fetchStoryThumbnailForMetadata: vi.fn(),
}));

const fetchSharedChatMock = vi.mocked(fetchSharedChatForMetadata);
const fetchStoryThumbnailMock = vi.mocked(fetchStoryThumbnailForMetadata);

describe('공유 채팅 메타데이터', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('유효한 공유본은 검색 색인을 허용한다', async () => {
    fetchSharedChatMock.mockResolvedValue({
      storyId: 'story-id',
      storyTitle: '공유 스토리',
      prologue: '프롤로그',
    });
    fetchStoryThumbnailMock.mockResolvedValue(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ shareId: 'share-id' }),
    });

    expect(metadata.robots).toBeUndefined();
  });

  it('조회할 수 없는 공유 URL은 검색 색인을 막는다', async () => {
    fetchSharedChatMock.mockResolvedValue(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ shareId: 'missing-share' }),
    });

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
