import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOptimisticCreatedResourceDelete } from '@/hooks/use-optimistic-created-resource-delete';
import { FetchError } from '@/lib/custom-fetch';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// 훅이지만 React API를 쓰지 않는 핸들러 팩토리라 node 환경에서 직접 호출해 검증한다.
const makeParams = () => {
  const removeId = vi.fn();
  const writeIds = vi.fn();
  const invalidateServerLists = vi.fn();
  const onDeleteSuccess = vi.fn();

  return {
    id: 's1',
    getSnapshot: vi.fn(() => JSON.stringify(['s1', 's2'])),
    parseSnapshot: (snapshot: string | null) =>
      snapshot ? (JSON.parse(snapshot) as string[]) : [],
    removeId,
    writeIds,
    invalidateServerLists,
    onDeleteSuccess,
    successMessage: '삭제했어요',
    failureMessage: '삭제하지 못했어요',
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useOptimisticCreatedResourceDelete — 게스트(로컬 정본)', () => {
  it('로컬 ID를 먼저 제거하고 서버 삭제 성공 시 그대로 둔다', async () => {
    const params = makeParams();
    const handler = useOptimisticCreatedResourceDelete({
      ...params,
      isGuest: true,
      deleteResource: vi.fn(async () => undefined),
    });

    await handler();

    expect(params.removeId).toHaveBeenCalledWith('s1');
    expect(params.writeIds).not.toHaveBeenCalled();
    expect(params.invalidateServerLists).not.toHaveBeenCalled();
    expect(params.onDeleteSuccess).toHaveBeenCalled();
  });

  it('서버 삭제 실패 시 이전 ID 목록으로 롤백한다', async () => {
    const params = makeParams();
    const handler = useOptimisticCreatedResourceDelete({
      ...params,
      isGuest: true,
      deleteResource: vi.fn(async () => {
        throw new FetchError('서버 오류', 500, null);
      }),
    });

    await handler();

    expect(params.writeIds).toHaveBeenCalledWith(['s1', 's2']);
    expect(params.onDeleteSuccess).not.toHaveBeenCalled();
  });
});

describe('useOptimisticCreatedResourceDelete — 회원(서버 정본)', () => {
  it('로컬 ID를 건드리지 않고 성공 시 목록 쿼리를 무효화한다', async () => {
    const params = makeParams();
    const handler = useOptimisticCreatedResourceDelete({
      ...params,
      isGuest: false,
      deleteResource: vi.fn(async () => undefined),
    });

    await handler();

    expect(params.removeId).not.toHaveBeenCalled();
    expect(params.writeIds).not.toHaveBeenCalled();
    expect(params.invalidateServerLists).toHaveBeenCalled();
    expect(params.onDeleteSuccess).toHaveBeenCalled();
  });

  it('404(이미 삭제됨)도 목록 쿼리를 무효화하고 성공으로 처리한다', async () => {
    const params = makeParams();
    const handler = useOptimisticCreatedResourceDelete({
      ...params,
      isGuest: false,
      deleteResource: vi.fn(async () => {
        throw new FetchError('없음', 404, null);
      }),
    });

    await handler();

    expect(params.invalidateServerLists).toHaveBeenCalled();
    expect(params.onDeleteSuccess).toHaveBeenCalled();
  });

  it('그 외 실패 시 무효화·롤백 없이 실패 안내만 한다', async () => {
    const params = makeParams();
    const handler = useOptimisticCreatedResourceDelete({
      ...params,
      isGuest: false,
      deleteResource: vi.fn(async () => {
        throw new FetchError('서버 오류', 500, null);
      }),
    });

    await handler();

    expect(params.invalidateServerLists).not.toHaveBeenCalled();
    expect(params.writeIds).not.toHaveBeenCalled();
    expect(params.onDeleteSuccess).not.toHaveBeenCalled();
  });
});
