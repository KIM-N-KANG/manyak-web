import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateMetadata } from '@/app/(story)/stories/[id]/page';
import { fetchStoryThumbnailForMetadata } from '@/lib/shares/backend-share-client';
import { fetchOriginalStoriesOnServer } from '@/lib/stories/backend-story-client';

vi.mock('@/lib/stories/backend-story-client', () => ({
  fetchOriginalStoriesOnServer: vi.fn(),
}));
vi.mock('@/lib/shares/backend-share-client', () => ({
  fetchStoryThumbnailForMetadata: vi.fn(),
}));

const fetchOriginalsMock = vi.mocked(fetchOriginalStoriesOnServer);
const fetchThumbnailMock = vi.mocked(fetchStoryThumbnailForMetadata);

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe('스토리 상세 메타데이터', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchThumbnailMock.mockResolvedValue(null);
  });

  it('오리지널 스토리는 색인을 허용하고 제목·소개·대표 URL을 싣는다', async () => {
    fetchOriginalsMock.mockResolvedValue([
      {
        id: 'orig',
        title: '용의 계곡',
        oneLineIntro: '잃어버린 용을 찾는 모험',
      },
    ]);
    fetchThumbnailMock.mockResolvedValue('https://cdn.example.com/t.webp');

    const metadata = await generateMetadata(params('orig'));

    expect(metadata.robots).toBeUndefined();
    expect(metadata.title).toBe('용의 계곡');
    expect(metadata.description).toBe('잃어버린 용을 찾는 모험');
    expect(metadata.alternates?.canonical).toBe('/stories/orig');
    expect(metadata.openGraph?.images).toEqual([
      'https://cdn.example.com/t.webp',
    ]);
    expect(fetchThumbnailMock).toHaveBeenCalledWith('orig');
  });

  it('오리지널 목록에 없는 스토리는 색인을 막고 상세를 조회하지 않는다', async () => {
    fetchOriginalsMock.mockResolvedValue([{ id: 'orig', title: '오리지널' }]);

    const metadata = await generateMetadata(params('user-story'));

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toBeUndefined();
    expect(fetchThumbnailMock).not.toHaveBeenCalled();
  });

  it('오리지널 목록을 읽지 못하면 판별할 수 없으므로 색인을 막는다', async () => {
    fetchOriginalsMock.mockResolvedValue(null);

    const metadata = await generateMetadata(params('orig'));

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
