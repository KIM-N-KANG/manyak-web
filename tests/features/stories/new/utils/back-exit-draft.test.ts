import { describe, expect, it } from 'vitest';

import type {
  GenerateSimpleStorylinesRequest,
  GenerateSimpleStorylinesResponse,
  SimpleStorylineResponse,
} from '@/api/generated/models';
import type { PendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import type { BackExitContext } from '@/features/stories/new/utils/back-exit-draft';
import { resolveBackExit } from '@/features/stories/new/utils/back-exit-draft';

const generationRequest: GenerateSimpleStorylinesRequest = {
  requestId: '11111111-1111-4111-8111-111111111111',
  selectedTagIds: [1, 2],
  customTags: [],
};

const selectedStoryline: SimpleStorylineResponse = {
  id: 10,
  storyline: '선택한 스토리라인 본문',
  recommendedInfos: [],
};

const generationResult: GenerateSimpleStorylinesResponse = {
  simpleCreationId: 7,
  storylines: [selectedStoryline],
};

const DRAFT_REQUEST_ID = '44444444-4444-4444-8444-444444444444';

const baseContext: BackExitContext = {
  slotRecord: null,
  step: 'additional-info',
  generationRequest,
  generationResult,
  activeStorylineIndex: 1,
  selectedStoryline,
  additionalInfos: ['직접 입력'],
  selectedRecommendations: ['추천'],
  createdStoryId: null,
  completionRequest: null,
  draftRequestId: DRAFT_REQUEST_ID,
};

describe('resolveBackExit', () => {
  it('슬롯에 in-flight 레코드가 있으면 덮어쓰지 않는다', () => {
    const slotRecord: PendingCreationRequest = {
      stage: 'STORYLINE_GENERATION',
      requestId: generationRequest.requestId,
      generationRequest,
    };

    expect(resolveBackExit({ ...baseContext, slotRecord })).toEqual({
      type: 'keep-in-flight',
    });
  });

  it('additional-info 스텝의 진행 상태를 draft로 저장한다', () => {
    expect(resolveBackExit({ ...baseContext })).toEqual({
      type: 'save-draft',
      record: {
        stage: 'STORY_DRAFT',
        requestId: DRAFT_REQUEST_ID,
        step: 'additional-info',
        generationRequest,
        generationResult,
        activeStorylineIndex: 1,
        selectedStoryline,
        additionalInfos: ['직접 입력'],
        selectedRecommendations: ['추천'],
        createdStoryId: null,
        completionRequest: null,
      },
    });
  });

  it('complete 스텝은 재개 지점인 additional-info로 기록한다', () => {
    const outcome = resolveBackExit({
      ...baseContext,
      step: 'complete',
      createdStoryId: 'story-1',
    });

    expect(outcome.type).toBe('save-draft');

    if (outcome.type === 'save-draft') {
      expect(outcome.record.step).toBe('additional-info');
      expect(outcome.record.createdStoryId).toBe('story-1');
    }
  });

  it('storyline-select 스텝은 스토리라인 미선택 상태로 저장한다', () => {
    const outcome = resolveBackExit({
      ...baseContext,
      step: 'storyline-select',
      selectedStoryline: null,
    });

    expect(outcome.type).toBe('save-draft');

    if (outcome.type === 'save-draft') {
      expect(outcome.record.step).toBe('storyline-select');
      expect(outcome.record.selectedStoryline).toBeNull();
    }
  });

  it('슬롯의 기존 draft는 새 draft로 덮어쓴다', () => {
    const slotRecord: PendingCreationRequest = {
      stage: 'STORY_DRAFT',
      requestId: '55555555-5555-4555-8555-555555555555',
      step: 'storyline-select',
      generationRequest,
      generationResult,
      activeStorylineIndex: 0,
      selectedStoryline: null,
      additionalInfos: [],
      selectedRecommendations: [],
      createdStoryId: null,
      completionRequest: null,
    };

    const outcome = resolveBackExit({ ...baseContext, slotRecord });

    expect(outcome.type).toBe('save-draft');

    if (outcome.type === 'save-draft') {
      expect(outcome.record.requestId).toBe(DRAFT_REQUEST_ID);
    }
  });

  it('생성 결과가 없으면 저장하지 않는다', () => {
    expect(resolveBackExit({ ...baseContext, generationResult: null })).toEqual(
      {
        type: 'discard',
      },
    );
  });

  it('keyword 스텝은 저장하지 않는다', () => {
    expect(resolveBackExit({ ...baseContext, step: 'keyword' })).toEqual({
      type: 'discard',
    });
  });

  it('additional-info 스텝인데 선택된 스토리라인이 없으면 저장하지 않는다', () => {
    expect(
      resolveBackExit({ ...baseContext, selectedStoryline: null }),
    ).toEqual({ type: 'discard' });
  });
});
