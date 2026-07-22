import { describe, expect, it } from 'vitest';

import type {
  CreateSimpleStoryRequest,
  GenerateSimpleStorylinesRequest,
  GenerateSimpleStorylinesResponse,
  SimpleStorylineResponse,
} from '@/api/generated/models';
import type { PendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import { parsePendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';

const generationRequest: GenerateSimpleStorylinesRequest = {
  requestId: '11111111-1111-4111-8111-111111111111',
  selectedTagIds: [1, 2],
  customTags: [{ name: '커스텀', category: 'GENRE' }],
};

const storylineRecord: PendingCreationRequest = {
  stage: 'STORYLINE_GENERATION',
  requestId: generationRequest.requestId,
  generationRequest,
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

const completionRequest: CreateSimpleStoryRequest = {
  requestId: '22222222-2222-4222-8222-222222222222',
  simpleCreationId: 7,
  storylineId: 10,
  additionalInfos: ['추가 정보'],
};

const completionRecord: PendingCreationRequest = {
  stage: 'STORY_COMPLETION',
  requestId: completionRequest.requestId,
  generationRequest,
  generationResult,
  selectedStoryline,
  completionRequest,
};

describe('parsePendingCreationRequest', () => {
  it('스토리라인 생성 레코드를 직렬화-역직렬화로 복원한다', () => {
    expect(
      parsePendingCreationRequest(JSON.stringify(storylineRecord)),
    ).toEqual(storylineRecord);
  });

  it('스토리 완성 레코드를 직렬화-역직렬화로 복원한다', () => {
    expect(
      parsePendingCreationRequest(JSON.stringify(completionRecord)),
    ).toEqual(completionRecord);
  });

  it('저장값이 없으면 null을 반환한다', () => {
    expect(parsePendingCreationRequest(null)).toBeNull();
    expect(parsePendingCreationRequest('')).toBeNull();
  });

  it('JSON 파싱 실패는 null로 처리한다', () => {
    expect(parsePendingCreationRequest('{invalid')).toBeNull();
  });

  it('객체가 아닌 값은 null로 처리한다', () => {
    expect(parsePendingCreationRequest('"문자열"')).toBeNull();
    expect(parsePendingCreationRequest('[1,2]')).toBeNull();
  });

  it('알 수 없는 stage는 null로 처리한다', () => {
    expect(
      parsePendingCreationRequest(
        JSON.stringify({ ...storylineRecord, stage: 'UNKNOWN' }),
      ),
    ).toBeNull();
  });

  it('requestId가 문자열이 아니면 null로 처리한다', () => {
    expect(
      parsePendingCreationRequest(
        JSON.stringify({ ...storylineRecord, requestId: 123 }),
      ),
    ).toBeNull();
  });

  it('스토리라인 레코드에 생성 요청 본문이 없으면 null로 처리한다', () => {
    expect(
      parsePendingCreationRequest(
        JSON.stringify({
          stage: 'STORYLINE_GENERATION',
          requestId: storylineRecord.requestId,
        }),
      ),
    ).toBeNull();
  });

  it('완성 레코드에 복원 컨텍스트가 하나라도 없으면 null로 처리한다', () => {
    const { completionRequest: _dropped, ...withoutCompletionRequest } =
      completionRecord;

    expect(
      parsePendingCreationRequest(JSON.stringify(withoutCompletionRequest)),
    ).toBeNull();

    const { selectedStoryline: _droppedStoryline, ...withoutStoryline } =
      completionRecord;

    expect(
      parsePendingCreationRequest(JSON.stringify(withoutStoryline)),
    ).toBeNull();
  });
});

const draftRecord: PendingCreationRequest = {
  stage: 'STORY_DRAFT',
  requestId: '33333333-3333-4333-8333-333333333333',
  step: 'additional-info',
  generationRequest,
  generationResult,
  activeStorylineIndex: 0,
  selectedStoryline,
  additionalInfos: ['직접 입력한 추가 정보'],
  selectedRecommendations: ['추천 정보'],
  createdStoryId: null,
  completionRequest: null,
};

describe('parsePendingCreationRequest — STORY_DRAFT', () => {
  it('유효한 draft 레코드를 파싱한다', () => {
    expect(parsePendingCreationRequest(JSON.stringify(draftRecord))).toEqual(
      draftRecord,
    );
  });

  it('storyline-select 스텝은 selectedStoryline이 null이어도 유효하다', () => {
    const record = {
      ...draftRecord,
      step: 'storyline-select',
      selectedStoryline: null,
    };

    expect(parsePendingCreationRequest(JSON.stringify(record))).toEqual(record);
  });

  it('additional-info 스텝에 selectedStoryline이 없으면 null을 반환한다', () => {
    const record = { ...draftRecord, selectedStoryline: null };

    expect(parsePendingCreationRequest(JSON.stringify(record))).toBeNull();
  });

  it('step 값이 어긋나면 null을 반환한다', () => {
    const record = { ...draftRecord, step: 'complete' };

    expect(parsePendingCreationRequest(JSON.stringify(record))).toBeNull();
  });

  it('additionalInfos가 문자열 배열이 아니면 null을 반환한다', () => {
    const record = { ...draftRecord, additionalInfos: [1, 2] };

    expect(parsePendingCreationRequest(JSON.stringify(record))).toBeNull();
  });

  it('createdStoryId가 문자열도 null도 아니면 null을 반환한다', () => {
    const record = { ...draftRecord, createdStoryId: 7 };

    expect(parsePendingCreationRequest(JSON.stringify(record))).toBeNull();
  });
});
