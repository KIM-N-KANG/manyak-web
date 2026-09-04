import { beforeEach, describe, expect, it, vi } from 'vitest';

import sitemap from '@/app/sitemap';
import { fetchOriginalStoriesOnServer } from '@/lib/stories/backend-story-client';

vi.mock('@/lib/stories/backend-story-client', () => ({
  fetchOriginalStoriesOnServer: vi.fn(),
}));

const fetchOriginalsMock = vi.mocked(fetchOriginalStoriesOnServer);

describe('sitemap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('오리지널 목록을 읽지 못하면 정적 공개 페이지만 싣는다', async () => {
    fetchOriginalsMock.mockResolvedValue(null);

    expect((await sitemap()).map((entry) => entry.url)).toEqual([
      'https://manyak.app/',
      'https://manyak.app/about',
      'https://manyak.app/terms',
      'https://manyak.app/privacy',
    ]);
  });

  it('오리지널 스토리 상세 URL을 정적 페이지 뒤에 싣고 ID 없는 항목은 건너뛴다', async () => {
    fetchOriginalsMock.mockResolvedValue([
      { id: 'story-a', title: 'A' },
      { title: 'ID 없음' },
      { id: 'story-b', title: 'B' },
    ]);

    expect((await sitemap()).map((entry) => entry.url)).toEqual([
      'https://manyak.app/',
      'https://manyak.app/about',
      'https://manyak.app/terms',
      'https://manyak.app/privacy',
      'https://manyak.app/stories/story-a',
      'https://manyak.app/stories/story-b',
    ]);
  });
});
