import { describe, expect, it } from 'vitest';

import type { StoryCreationRequestStatusResponse } from '@/api/generated/models';
import {
  resolveCreationRecovery,
  shouldKeepPendingRecordOnError,
} from '@/features/stories/new/utils/creation-request-recovery';
import { FetchError } from '@/lib/custom-fetch';

describe('shouldKeepPendingRecordOnError', () => {
  it('서버가 응답한 HTTP 오류(FetchError)는 레코드를 지우도록 false를 반환한다', () => {
    expect(
      shouldKeepPendingRecordOnError(new FetchError('실패', 500, null)),
    ).toBe(false);
    expect(
      shouldKeepPendingRecordOnError(new FetchError('실패', 402, null)),
    ).toBe(false);
  });

  it('응답을 받지 못한 네트워크 오류는 레코드를 보존하도록 true를 반환한다', () => {
    expect(
      shouldKeepPendingRecordOnError(new TypeError('Failed to fetch')),
    ).toBe(true);
    expect(
      shouldKeepPendingRecordOnError(
        new DOMException('요청 시간이 초과되었습니다.', 'TimeoutError'),
      ),
    ).toBe(true);
    expect(shouldKeepPendingRecordOnError(new Error('알 수 없음'))).toBe(true);
  });
});

// 복구 응답의 result는 orval이 JsonNode로 생성하므로 실제 페이로드 형태로 캐스팅해 사용한다.
const storylineResult = {
  simpleCreationId: 7,
  storylines: [{ id: 10, storyline: '본문' }],
} as unknown as StoryCreationRequestStatusResponse['result'];

const storyResult = {
  id: 'story-uuid',
  title: '완성 스토리',
} as unknown as StoryCreationRequestStatusResponse['result'];

describe('resolveCreationRecovery', () => {
  it('PENDING이면 폴링 지속 액션을 반환한다', () => {
    const response: StoryCreationRequestStatusResponse = {
      stage: 'STORYLINE_GENERATION',
      status: 'PENDING',
      result: null,
    };

    expect(resolveCreationRecovery('STORYLINE_GENERATION', response)).toEqual({
      type: 'pending',
    });
  });

  it('스토리라인 단계 COMPLETED면 생성 응답을 복원 액션으로 반환한다', () => {
    const response: StoryCreationRequestStatusResponse = {
      stage: 'STORYLINE_GENERATION',
      status: 'COMPLETED',
      result: storylineResult,
    };

    expect(resolveCreationRecovery('STORYLINE_GENERATION', response)).toEqual({
      type: 'storylines-completed',
      result: storylineResult,
    });
  });

  it('완성 단계 COMPLETED면 스토리 응답을 복원 액션으로 반환한다', () => {
    const response: StoryCreationRequestStatusResponse = {
      stage: 'STORY_COMPLETION',
      status: 'COMPLETED',
      result: storyResult,
    };

    expect(resolveCreationRecovery('STORY_COMPLETION', response)).toEqual({
      type: 'story-completed',
      result: storyResult,
    });
  });

  it('FAILED면 실패 합류 액션을 반환한다', () => {
    const response: StoryCreationRequestStatusResponse = {
      stage: 'STORY_COMPLETION',
      status: 'FAILED',
      result: null,
    };

    expect(resolveCreationRecovery('STORY_COMPLETION', response)).toEqual({
      type: 'failed',
    });
  });

  it('COMPLETED인데 result가 없으면 방어적으로 실패로 합류한다', () => {
    const response: StoryCreationRequestStatusResponse = {
      stage: 'STORYLINE_GENERATION',
      status: 'COMPLETED',
      result: null,
    };

    expect(resolveCreationRecovery('STORYLINE_GENERATION', response)).toEqual({
      type: 'failed',
    });
  });

  it('status가 없으면 방어적으로 실패로 합류한다', () => {
    expect(resolveCreationRecovery('STORYLINE_GENERATION', {})).toEqual({
      type: 'failed',
    });
  });
});
