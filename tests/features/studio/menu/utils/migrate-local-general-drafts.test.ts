import { describe, expect, it } from 'vitest';

import type { PutStoryDraftRequest } from '@/api/generated/models';
import type { GeneralDraftRecord } from '@/features/stories/_shared/utils/creation-request-storage';
import { readGeneralDraftPayload } from '@/features/studio/_shared/utils/general-draft-payload';
import { migrateLocalGeneralDrafts } from '@/features/studio/menu/utils/migrate-local-general-drafts';
import { FetchError } from '@/lib/api-error';

const record = (requestId: string): GeneralDraftRecord => ({
  stage: 'GENERAL_DRAFT',
  requestId,
  createdAt: '2026-10-16T01:00:00.000Z',
  snapshot: readGeneralDraftPayload({ texts: { title: requestId } }),
});

/** put이 ID별로 정한 결과를 돌려주고, 부른 순서와 지운 ID를 기록하는 가짜 의존성이다. */
function fakeDeps(outcomes: Record<string, unknown> = {}) {
  const puts: { draftId: string; body: PutStoryDraftRequest }[] = [];
  const taken: string[] = [];

  return {
    puts,
    taken,
    deps: {
      put: async (draftId: string, body: PutStoryDraftRequest) => {
        puts.push({ draftId, body });

        const outcome = outcomes[draftId];

        if (outcome) throw outcome;
      },
      take: async (requestId: string) => {
        taken.push(requestId);

        return true;
      },
    },
  };
}

describe('migrateLocalGeneralDrafts', () => {
  it('서버에 새 초안으로 올린 뒤 기기 안 레코드를 지운다', async () => {
    const { deps, puts, taken } = fakeDeps();

    expect(
      await migrateLocalGeneralDrafts([record('a'), record('b')], deps),
    ).toBe(2);
    expect(puts.map(({ draftId }) => draftId)).toEqual(['a', 'b']);
    expect(puts[0].body).toMatchObject({ baseVersion: null, title: 'a' });
    expect(taken).toEqual(['a', 'b']);
  });

  it('서버에 이미 있어 버전이 충돌하면 서버 쪽을 남기고 기기 안 레코드를 지운다', async () => {
    const { deps, taken } = fakeDeps({
      a: new FetchError('', 409, {
        code: 'DRAFT_VERSION_CONFLICT',
        details: [{ field: 'version', message: '2' }],
      }),
    });

    expect(await migrateLocalGeneralDrafts([record('a')], deps)).toBe(1);
    expect(taken).toEqual(['a']);
  });

  it('개수 상한에 걸리면 그 레코드부터 기기에 남기고 더 올리지 않는다', async () => {
    const { deps, puts, taken } = fakeDeps({
      b: new FetchError('', 400, { code: 'DRAFT_LIMIT_EXCEEDED' }),
    });

    expect(
      await migrateLocalGeneralDrafts(
        [record('a'), record('b'), record('c')],
        deps,
      ),
    ).toBe(1);
    expect(puts.map(({ draftId }) => draftId)).toEqual(['a', 'b']);
    expect(taken).toEqual(['a']);
  });

  it('그 밖의 실패는 그 레코드만 남기고 다음 레코드를 올린다', async () => {
    const { deps, taken } = fakeDeps({ a: new TypeError('Failed to fetch') });

    expect(
      await migrateLocalGeneralDrafts([record('a'), record('b')], deps),
    ).toBe(1);
    expect(taken).toEqual(['b']);
  });
});
