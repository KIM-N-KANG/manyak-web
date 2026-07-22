import type {
  CreateSimpleStoryRequest,
  GenerateSimpleStorylinesRequest,
  GenerateSimpleStorylinesResponse,
  SimpleStorylineResponse,
} from '@/api/generated/models';

/** 백그라운드 복구 대상 생성 요청을 보관하는 로컬스토리지 키 */
export const PENDING_CREATION_REQUEST_STORAGE_KEY =
  'manyak:pending-creation-request';

/** 같은 탭 내 복구 레코드 변경을 알리는 커스텀 이벤트 이름 */
const PENDING_CREATION_REQUEST_CHANGE_EVENT = `${PENDING_CREATION_REQUEST_STORAGE_KEY}-change`;

/** 같은 탭 구독자에게 복구 레코드 변경을 알린다. */
function notifyPendingCreationRequestChange(): void {
  window.dispatchEvent(new Event(PENDING_CREATION_REQUEST_CHANGE_EVENT));
}

/**
 * 복구 레코드 변경(같은 탭 커스텀 이벤트·다른 탭 storage 이벤트)을 구독한다.
 *
 * @param onStoreChange 변경 시 호출할 콜백
 * @returns 구독 해제 함수
 */
export function subscribePendingCreationRequest(
  onStoreChange: () => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === PENDING_CREATION_REQUEST_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener(PENDING_CREATION_REQUEST_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener(
      PENDING_CREATION_REQUEST_CHANGE_EVENT,
      onStoreChange,
    );
  };
}

/**
 * 로컬스토리지에 저장된 복구 레코드 원본 문자열의 현재 스냅샷을 반환한다.
 *
 * @returns 저장된 원본 문자열. 없으면 null
 */
export function getPendingCreationRequestSnapshot(): string | null {
  return localStorage.getItem(PENDING_CREATION_REQUEST_STORAGE_KEY);
}

/**
 * 서버 렌더링 시점의 스냅샷(로컬스토리지 접근 불가)을 반환한다.
 *
 * @returns 항상 null
 */
export function getServerPendingCreationRequestSnapshot(): null {
  return null;
}

/** 임시 저장(draft) 레코드가 복원할 퍼널 스텝 */
export type StoryDraftStep = 'storyline-select' | 'additional-info';

/**
 * 백그라운드 복구 대상 생성 요청 레코드.
 * 완성 단계는 재진입 시 추가 정보 화면·재시도를 복원할 수 있도록 퍼널 컨텍스트를 함께 보관한다.
 * STORY_DRAFT는 뒤로 가기 이탈 시 저장하는 임시 저장본으로, 서버 복구 조회 대상이 아니다.
 */
export type PendingCreationRequest =
  | {
      stage: 'STORYLINE_GENERATION';
      requestId: string;
      generationRequest: GenerateSimpleStorylinesRequest;
    }
  | {
      stage: 'STORY_COMPLETION';
      requestId: string;
      generationRequest: GenerateSimpleStorylinesRequest;
      generationResult: GenerateSimpleStorylinesResponse;
      selectedStoryline: SimpleStorylineResponse;
      completionRequest: CreateSimpleStoryRequest;
    }
  | {
      stage: 'STORY_DRAFT';
      requestId: string;
      step: StoryDraftStep;
      generationRequest: GenerateSimpleStorylinesRequest;
      generationResult: GenerateSimpleStorylinesResponse;
      activeStorylineIndex: number;
      selectedStoryline: SimpleStorylineResponse | null;
      additionalInfos: string[];
      selectedRecommendations: string[];
      createdStoryId: string | null;
      completionRequest: CreateSimpleStoryRequest | null;
    };

/** 진행 중 요청 레코드(서버 복구 조회 대상) */
export type InFlightCreationRequest = Exclude<
  PendingCreationRequest,
  { stage: 'STORY_DRAFT' }
>;

/** 임시 저장(draft) 레코드 */
export type StoryDraftRecord = Extract<
  PendingCreationRequest,
  { stage: 'STORY_DRAFT' }
>;

/**
 * 값이 배열이 아닌 순수 객체인지 판별한다.
 *
 * @param value 검사할 값
 * @returns 순수 객체 여부
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 값이 문자열로만 이루어진 배열인지 판별한다.
 *
 * @param value 검사할 값
 * @returns 문자열 배열 여부
 */
function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

/**
 * 저장된 원본 문자열을 복구 레코드로 파싱한다. 형태가 어긋나면 null로 처리해
 * 손상된 저장값이 복구 흐름을 깨뜨리지 않게 한다.
 *
 * @param raw 로컬스토리지에 저장된 원본 문자열(없으면 null)
 * @returns 파싱된 복구 레코드. 유효하지 않으면 null
 */
export function parsePendingCreationRequest(
  raw: string | null,
): PendingCreationRequest | null {
  if (!raw) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isPlainObject(parsed)) {
    return null;
  }

  if (
    typeof parsed.requestId !== 'string' ||
    !isPlainObject(parsed.generationRequest)
  ) {
    return null;
  }

  if (parsed.stage === 'STORYLINE_GENERATION') {
    return parsed as unknown as PendingCreationRequest;
  }

  if (
    parsed.stage === 'STORY_COMPLETION' &&
    isPlainObject(parsed.generationResult) &&
    isPlainObject(parsed.selectedStoryline) &&
    isPlainObject(parsed.completionRequest)
  ) {
    return parsed as unknown as PendingCreationRequest;
  }

  if (parsed.stage === 'STORY_DRAFT') {
    const isValidStep =
      parsed.step === 'storyline-select' || parsed.step === 'additional-info';
    // additional-info 재개에는 선택된 스토리라인이 필수다.
    const isValidSelectedStoryline =
      parsed.step === 'additional-info'
        ? isPlainObject(parsed.selectedStoryline)
        : parsed.selectedStoryline === null ||
          isPlainObject(parsed.selectedStoryline);

    if (
      isValidStep &&
      isPlainObject(parsed.generationResult) &&
      typeof parsed.activeStorylineIndex === 'number' &&
      isValidSelectedStoryline &&
      isStringArray(parsed.additionalInfos) &&
      isStringArray(parsed.selectedRecommendations) &&
      (parsed.createdStoryId === null ||
        typeof parsed.createdStoryId === 'string') &&
      (parsed.completionRequest === null ||
        isPlainObject(parsed.completionRequest))
    ) {
      return parsed as unknown as PendingCreationRequest;
    }
  }

  return null;
}

/**
 * 미정리 복구 레코드를 로컬스토리지에서 읽는다.
 *
 * @returns 저장된 복구 레코드. 없거나 유효하지 않으면 null
 */
export function loadPendingCreationRequest(): PendingCreationRequest | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return parsePendingCreationRequest(
    localStorage.getItem(PENDING_CREATION_REQUEST_STORAGE_KEY),
  );
}

/**
 * 생성 요청 직전에 복구 레코드를 저장한다. 진행 중 요청은 항상 하나뿐이므로 덮어쓴다.
 *
 * @param record 저장할 복구 레코드
 */
export function savePendingCreationRequest(
  record: PendingCreationRequest,
): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(
    PENDING_CREATION_REQUEST_STORAGE_KEY,
    JSON.stringify(record),
  );
  notifyPendingCreationRequestChange();
}

/**
 * 지정한 requestId의 복구 레코드를 제거하고 제거 여부를 반환한다.
 * 원 응답과 복구 조회가 경합할 때 true를 받은 쪽만 성공 부수효과를 수행해
 * 채팅 중복 생성·카운터 이중 증가를 막는다(제거 선점 가드).
 *
 * @param requestId 제거할 레코드의 요청 ID
 * @returns 레코드가 존재해 제거했으면 true
 */
export function takePendingCreationRequest(requestId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const record = loadPendingCreationRequest();

  if (record?.requestId !== requestId) {
    return false;
  }

  localStorage.removeItem(PENDING_CREATION_REQUEST_STORAGE_KEY);
  notifyPendingCreationRequestChange();

  return true;
}

/** 복구 레코드를 조건 없이 제거한다(404 등 더 이상 복구할 수 없는 경우). */
export function clearPendingCreationRequest(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(PENDING_CREATION_REQUEST_STORAGE_KEY);
  notifyPendingCreationRequestChange();
}
