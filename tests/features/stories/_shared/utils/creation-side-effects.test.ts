import type { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageMock = vi.hoisted(() => ({
  markPendingStoryCreated: vi.fn(),
  saveCreatedStoryId: vi.fn(),
  track: vi.fn(),
  trackMetaPixelOnce: vi.fn(),
}));

vi.mock('@/features/stories/_shared/utils/creation-request-storage', () => ({
  markPendingStoryCreated: storageMock.markPendingStoryCreated,
}));
vi.mock('@/features/stories/_shared/utils/story-id-storage', () => ({
  saveCreatedStoryId: storageMock.saveCreatedStoryId,
}));
vi.mock('@/observability/analytics', () => ({
  track: storageMock.track,
}));
vi.mock('@/observability/marketing/pixel', () => ({
  trackMetaPixelOnce: storageMock.trackMetaPixelOnce,
}));

import { getGetMyStoriesQueryKey } from '@/api/generated/endpoints/users/users';
import { applyStoryCompletedEffects } from '@/features/stories/_shared/utils/creation-side-effects';

const createQueryClient = () =>
  ({
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  }) as unknown as QueryClient & {
    invalidateQueries: ReturnType<typeof vi.fn>;
  };

beforeEach(() => {
  vi.clearAllMocks();
  storageMock.markPendingStoryCreated.mockResolvedValue(true);
});

describe('applyStoryCompletedEffects', () => {
  it('게스트로 확정됐을 때만 로컬 서재에 스토리 ID를 남긴다', async () => {
    const queryClient = createQueryClient();

    await applyStoryCompletedEffects(
      'req-1',
      'story-1',
      'unauthenticated',
      queryClient,
    );

    expect(storageMock.saveCreatedStoryId).toHaveBeenCalledWith('story-1');
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: getGetMyStoriesQueryKey(),
    });
  });

  it('회원이면 로컬에 남기지 않고 내 스토리 목록을 무효화한다', async () => {
    const queryClient = createQueryClient();

    await applyStoryCompletedEffects(
      'req-1',
      'story-1',
      'authenticated',
      queryClient,
    );

    expect(storageMock.saveCreatedStoryId).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: getGetMyStoriesQueryKey(),
    });
  });

  it('세션 판정 전(loading)에는 게스트로 취급하지 않아 회원 스토리 ID가 로컬에 남지 않는다', async () => {
    const queryClient = createQueryClient();

    await applyStoryCompletedEffects(
      'req-1',
      'story-1',
      'loading',
      queryClient,
    );

    expect(storageMock.saveCreatedStoryId).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: getGetMyStoriesQueryKey(),
    });
    expect(storageMock.markPendingStoryCreated).toHaveBeenCalledWith(
      'req-1',
      'story-1',
      0,
    );
  });

  it('채팅 생성과 무관하게 스토리 완성 분석 이벤트를 발화한다', async () => {
    await applyStoryCompletedEffects(
      'req-1',
      'story-1',
      'authenticated',
      createQueryClient(),
      ['romance'],
    );

    expect(storageMock.track).toHaveBeenCalledWith(
      'client_storyCreate_completed',
      { story_id: 'story-1', genres: ['romance'] },
    );
  });
});
