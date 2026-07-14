import { describe, expect, it } from 'vitest';

import type { ChatTurnResponse } from '@/api/generated/models';
import {
  canRegenerate,
  isStaleTurnError,
} from '@/features/chats/room/lib/regenerate';
import { FetchError } from '@/lib/api-error';

const baseTurn: ChatTurnResponse = {
  id: 3,
  userInput: '문을 연다',
  aiOutput: '문이 서서히 열린다.',
  choices: ['들어간다'],
  createdAt: '2026-07-01T00:00:00Z',
};

describe('canRegenerate', () => {
  it('id와 aiOutput이 있고 엔딩 미도달이면 재생성 가능', () => {
    expect(canRegenerate(baseTurn)).toBe(true);
  });

  it('turn id가 없으면 불가(요청 바디 turnId 필수)', () => {
    expect(canRegenerate({ ...baseTurn, id: undefined })).toBe(false);
  });

  it('aiOutput이 없으면 불가(대체할 AI 버블이 없음)', () => {
    expect(canRegenerate({ ...baseTurn, aiOutput: undefined })).toBe(false);
    expect(canRegenerate({ ...baseTurn, aiOutput: '' })).toBe(false);
  });

  it('엔딩 도달 턴이면 불가(서버도 409 거절)', () => {
    expect(canRegenerate({ ...baseTurn, reachedEnding: '새드엔딩' })).toBe(
      false,
    );
  });

  it('reachedEnding이 null이면 가능(미도달 의미)', () => {
    expect(canRegenerate({ ...baseTurn, reachedEnding: null })).toBe(true);
  });
});

describe('isStaleTurnError', () => {
  it('409 FetchError면 true(이미 새 턴이 추가된 낡은 화면)', () => {
    expect(isStaleTurnError(new FetchError('conflict', 409, null))).toBe(true);
  });

  it('402 FetchError는 false(결제 필요 — 별도 분기)', () => {
    expect(isStaleTurnError(new FetchError('payment', 402, null))).toBe(false);
  });

  it('일반 Error는 false', () => {
    expect(isStaleTurnError(new Error('boom'))).toBe(false);
  });
});
