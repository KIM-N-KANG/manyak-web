import type { ResolvingMetadata } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import StoryDetailPage, {
  generateMetadata,
} from '@/app/(story)/stories/[id]/page';
import { DEFAULT_TITLE, SITE_NAME } from '@/constants/site';
import {
  fetchOriginalStoryOnServer,
  type PublicStoryDetail,
} from '@/lib/stories/backend-story-client';

vi.mock('@/lib/stories/backend-story-client', () => ({
  fetchOriginalStoryOnServer: vi.fn(),
}));

const fetchStoryMock = vi.mocked(fetchOriginalStoryOnServer);
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const brandImages = [{ url: 'https://manyak.app/opengraph-image.png' }];
const parent = Promise.resolve({
  openGraph: { images: brandImages },
}) as ResolvingMetadata;
const story: PublicStoryDetail = {
  id: 'orig',
  title: '용의 계곡',
  oneLineIntro: '잃어버린 용을 찾는 모험',
  description: '깊은 계곡 속 전설의 이야기',
  thumbnailUrl: 'https://cdn.example.com/t.webp',
  genres: ['판타지'],
  likeCount: 1,
  turnCount: 2,
  createdAt: undefined,
  author: null,
  characters: [],
  startSettings: [],
};

describe('오리지널 상세 서버 응답', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchStoryMock.mockResolvedValue(story);
  });

  it('본문과 모든 미리보기에서 같은 공개 상세를 사용한다', async () => {
    const metadata = await generateMetadata(params('orig'), parent);
    const page = await StoryDetailPage(params('orig'));

    expect(page.props.initialStory).toEqual(story);
    expect(metadata.robots).toBeUndefined();
    expect(metadata.title).toBe(story.title);
    expect(metadata.description).toBe(story.oneLineIntro);
    expect(metadata.alternates?.canonical).toBe('/stories/orig');

    for (const preview of [metadata.openGraph, metadata.twitter]) {
      expect(preview).toMatchObject({
        title: story.title,
        description: story.oneLineIntro,
        images: [story.thumbnailUrl],
      });
    }
  });

  it('사용자 스토리나 조회 실패는 색인을 막고 클라이언트 조회를 유지한다', async () => {
    fetchStoryMock.mockResolvedValue(null);

    const page = await StoryDetailPage(params('user-story'));

    expect(await generateMetadata(params('user-story'), parent)).toEqual({
      robots: { index: false, follow: false },
    });
    expect(page.props).toEqual({
      storyId: 'user-story',
      initialStory: undefined,
    });
  });

  it('제목과 이미지가 없으면 기본 제목과 파일 기반 이미지를 사용한다', async () => {
    fetchStoryMock.mockResolvedValue({
      ...story,
      title: '',
      thumbnailUrl: null,
    });

    const metadata = await generateMetadata(params('orig'), parent);

    expect(metadata.title).toEqual({ absolute: DEFAULT_TITLE });
    expect(metadata.openGraph?.title).toBe(SITE_NAME);
    expect(metadata.twitter?.title).toBe(SITE_NAME);
    expect(metadata.openGraph?.images).toEqual(brandImages);
    expect(metadata.twitter?.images).toEqual(brandImages);
  });
});
