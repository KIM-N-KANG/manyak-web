import type {
  CreateSimpleStoryRequest,
  CreateSimpleStoryRequestVisibility,
  GenerateSimpleStorylinesRequest,
  GenerateSimpleStorylinesResponse,
  JsonNode,
  PutStoryDraftRequest,
  SimpleStorylineResponse,
} from '@/api/generated/models';
import {
  type DraftCreationRecord,
  isKeywordDraftSnapshot,
  type StoryDraftStep,
} from '@/features/stories/_shared/utils/creation-request-storage';
import type { StoryDraftDetail } from '@/features/stories/_shared/utils/story-draft-response';

/** 간편 제작 서버 초안 payload의 스키마 버전이다. Web과 Android가 같은 형식을 쓴다. */
export const SIMPLE_DRAFT_SCHEMA_VERSION = 1;

/** 스토리라인 초안의 payload다. 생성 결과 원문은 싣지 않고 고른 스토리라인을 ID로 가리킨다. */
type StoryDraftPayload = {
  step: StoryDraftStep;
  generationRequest: GenerateSimpleStorylinesRequest;
  activeStorylineIndex: number;
  selectedStorylineId: number | null;
  additionalInfos: string[];
  selectedRecommendations: string[];
  artStyle: string | null;
  visibility: CreateSimpleStoryRequestVisibility | null;
  createdStoryId: string | null;
  completionRequest: CreateSimpleStoryRequest | null;
};

/** 서버 상세를 퍼널 기록으로 읽은 결과다. 생성 결과를 받을 수 없으면 초안이 없는 것과 같이 다룬다. */
export type SimpleDraftReadResult =
  | { kind: 'ok'; record: DraftCreationRecord }
  | { kind: 'unreadable' }
  | { kind: 'missingGeneration' };

type Loose = Record<string, unknown>;

/**
 * 배열이 아닌 객체인지 반환한다.
 *
 * @param value 검사할 값
 * @returns 필드를 읽을 수 있는 객체면 참
 */
const isObject = (value: unknown): value is Loose =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * 문자열 배열이면 그대로, 아니면 빈 배열을 반환한다.
 *
 * @param value 읽을 값
 * @returns 문자열 배열
 */
const asStrings = (value: unknown): string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : [];

/**
 * 편집 초안 기록을 서버 임시 저장 PUT 본문으로 바꾼다. 스토리라인 초안은 생성 요청에 연결하고, 추가 정보 단계면
 * 고른 스토리라인 본문을 제작 탭 카드 설명용 요약 필드에 싣는다.
 *
 * @param record 키워드 초안 또는 스토리라인 초안 기록
 * @param baseVersion 기준으로 삼은 서버 버전. 새 초안이면 null
 * @returns PUT 본문
 */
export function toSimpleDraftRequest(
  record: DraftCreationRecord,
  baseVersion: number | null,
): PutStoryDraftRequest {
  const common = {
    mode: 'SIMPLE',
    schemaVersion: SIMPLE_DRAFT_SCHEMA_VERSION,
    baseVersion,
    title: null,
    thumbnailObjectKey: null,
  } as const;

  if (record.stage === 'KEYWORD_DRAFT') {
    return {
      ...common,
      stage: 'KEYWORD_DRAFT',
      // 생성 타입이 Jackson JsonNode의 빈 속성으로 잘못 생성돼 있어 실제 JSON 객체를 그대로 넣는다.
      payload: record.snapshot as unknown as JsonNode,
      oneLineIntro: null,
      generationRequestId: null,
    };
  }

  const payload: StoryDraftPayload = {
    step: record.step,
    generationRequest: record.generationRequest,
    activeStorylineIndex: record.activeStorylineIndex,
    selectedStorylineId: record.selectedStoryline?.id ?? null,
    additionalInfos: record.additionalInfos,
    selectedRecommendations: record.selectedRecommendations,
    artStyle: record.artStyle ?? null,
    visibility: record.visibility ?? null,
    createdStoryId: record.createdStoryId,
    completionRequest: record.completionRequest,
  };

  return {
    ...common,
    stage: 'STORY_DRAFT',
    payload: payload as unknown as JsonNode,
    oneLineIntro:
      record.step === 'additional-info'
        ? record.selectedStoryline?.storyline || null
        : null,
    generationRequestId: record.generationRequest.requestId,
  };
}

/**
 * 상세의 생성 결과를 스토리라인 생성 응답으로 읽는다. 생성이 끝나지 않았거나 형태가 다르면 읽지 않는다.
 *
 * @param generation 상세의 생성 요청 복구 조회 결과
 * @returns 스토리라인 생성 응답. 읽을 수 없으면 null
 */
function readGenerationResult(
  generation: StoryDraftDetail['generation'],
): GenerateSimpleStorylinesResponse | null {
  if (generation?.status !== 'COMPLETED') return null;

  const { result } = generation;

  return isObject(result) && Array.isArray(result.storylines)
    ? (result as GenerateSimpleStorylinesResponse)
    : null;
}

/**
 * 서버 상세를 퍼널이 복원하는 편집 초안 기록으로 읽는다. 키워드 초안은 초안 ID를 요청 ID로 삼고, 스토리라인 초안은
 * 생성 결과와 합치고 서버 초안 연결을 붙인다. 고른 스토리라인을 결과에서 찾지 못하면 스토리라인 선택 단계로 연다.
 *
 * @param detail 서버 초안 상세
 * @returns 읽은 기록, 또는 읽을 수 없음과 생성 결과 없음
 */
export function readSimpleDraftDetail(
  detail: StoryDraftDetail,
): SimpleDraftReadResult {
  if (
    detail.mode !== 'SIMPLE' ||
    detail.schemaVersion !== SIMPLE_DRAFT_SCHEMA_VERSION
  )
    return { kind: 'unreadable' };

  const { payload } = detail;

  if (detail.stage === 'KEYWORD_DRAFT') {
    // 다른 클라이언트는 없는 선택 필드를 null로 보낼 수 있어 없음으로 읽는다.
    const { addedGenreTagIds, ...rest } = payload;
    const snapshot = addedGenreTagIds === null ? rest : payload;

    return isKeywordDraftSnapshot(snapshot)
      ? {
          kind: 'ok',
          record: {
            stage: 'KEYWORD_DRAFT',
            requestId: detail.draftId,
            createdAt: detail.createdAt,
            snapshot,
          },
        }
      : { kind: 'unreadable' };
  }

  const { generationRequest, step } = payload;

  if (
    detail.stage !== 'STORY_DRAFT' ||
    !isObject(generationRequest) ||
    typeof generationRequest.requestId !== 'string' ||
    (step !== 'storyline-select' && step !== 'additional-info')
  )
    return { kind: 'unreadable' };

  const generationResult = readGenerationResult(detail.generation);

  if (!generationResult) return { kind: 'missingGeneration' };

  const selectedStoryline =
    (typeof payload.selectedStorylineId === 'number' &&
      generationResult.storylines?.find(
        (storyline): storyline is SimpleStorylineResponse =>
          storyline?.id === payload.selectedStorylineId,
      )) ||
    null;

  return {
    kind: 'ok',
    record: {
      stage: 'STORY_DRAFT',
      requestId: generationRequest.requestId,
      createdAt: detail.createdAt,
      step:
        step === 'additional-info' && selectedStoryline === null
          ? 'storyline-select'
          : step,
      generationRequest:
        generationRequest as unknown as GenerateSimpleStorylinesRequest,
      generationResult,
      activeStorylineIndex:
        typeof payload.activeStorylineIndex === 'number'
          ? payload.activeStorylineIndex
          : 0,
      selectedStoryline,
      additionalInfos: asStrings(payload.additionalInfos),
      selectedRecommendations: asStrings(payload.selectedRecommendations),
      ...(typeof payload.artStyle === 'string' && {
        artStyle: payload.artStyle,
      }),
      ...((payload.visibility === 'PUBLIC' ||
        payload.visibility === 'PRIVATE') && {
        visibility: payload.visibility,
      }),
      createdStoryId:
        typeof payload.createdStoryId === 'string'
          ? payload.createdStoryId
          : null,
      completionRequest: isObject(payload.completionRequest)
        ? (payload.completionRequest as unknown as CreateSimpleStoryRequest)
        : null,
      draftId: detail.draftId,
      draftVersion: detail.version,
    },
  };
}
