import type {
  CreateSimpleStoryRequest,
  GenerateSimpleStorylinesRequest,
  GenerateSimpleStorylinesResponse,
  SimpleStoryCharacterRequestGender,
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
  try {
    return localStorage.getItem(PENDING_CREATION_REQUEST_STORAGE_KEY);
  } catch {
    return null;
  }
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

/** 직접 추가한 키워드의 저장 스냅숏 */
export type KeywordCustomTagSnapshot = {
  name: string;
  selected: boolean;
};

/** 인물 키워드 입력의 저장 스냅숏 */
export type KeywordCharacterSnapshot = {
  name: string;
  gender: SimpleStoryCharacterRequestGender;
  selectedTagIds: number[];
  customTags: KeywordCustomTagSnapshot[];
};

/** 키워드 단계 전체 입력의 저장 스냅숏. 활성 탭은 복원하지 않는다. */
export type KeywordDraftSnapshot = {
  selectedGenreTagIds: number[];
  customGenreTags: KeywordCustomTagSnapshot[];
  protagonist: KeywordCharacterSnapshot;
  supportingCharacters: KeywordCharacterSnapshot[];
};

/**
 * 백그라운드 복구 대상 생성 요청 레코드.
 * 완성 단계는 재진입 시 추가 정보 화면·재시도를 복원할 수 있도록 퍼널 컨텍스트를 함께 보관한다.
 * KEYWORD_DRAFT와 STORY_DRAFT는 편집 자동 저장본으로, 서버 복구 조회 대상이 아니다.
 */
export type PendingCreationRequest =
  | {
      stage: 'KEYWORD_DRAFT';
      requestId: string;
      snapshot: KeywordDraftSnapshot;
    }
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
      activeStorylineIndex?: number;
      selectedStoryline: SimpleStorylineResponse;
      additionalInfos?: string[];
      selectedRecommendations?: string[];
      /** 스토리 성공 부수효과까지 적용한 ID. 채팅 실패 후 재진입 시 중복 적용을 막는다. */
      createdStoryId?: string | null;
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
export type InFlightCreationRequest = Extract<
  PendingCreationRequest,
  { stage: 'STORYLINE_GENERATION' | 'STORY_COMPLETION' }
>;

/** 키워드 임시 저장 레코드 */
export type KeywordDraftRecord = Extract<
  PendingCreationRequest,
  { stage: 'KEYWORD_DRAFT' }
>;

/** 임시 저장(draft) 레코드 */
export type StoryDraftRecord = Extract<
  PendingCreationRequest,
  { stage: 'STORY_DRAFT' }
>;

/** 서버 조회 대상이 아닌 편집 임시 저장 레코드 */
export type DraftCreationRecord = KeywordDraftRecord | StoryDraftRecord;

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
 * 값이 숫자로만 이루어진 배열인지 판별한다.
 *
 * @param value 검사할 값
 * @returns 숫자 배열 여부
 */
function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'number')
  );
}

/**
 * 직접 추가 키워드 스냅숏의 형태를 판별한다.
 *
 * @param value 검사할 값
 * @returns 직접 추가 키워드 스냅숏 여부
 */
function isKeywordCustomTagSnapshot(
  value: unknown,
): value is KeywordCustomTagSnapshot {
  return (
    isPlainObject(value) &&
    typeof value.name === 'string' &&
    typeof value.selected === 'boolean'
  );
}

/**
 * 인물 키워드 스냅숏의 형태를 판별한다.
 *
 * @param value 검사할 값
 * @returns 인물 키워드 스냅숏 여부
 */
function isKeywordCharacterSnapshot(
  value: unknown,
): value is KeywordCharacterSnapshot {
  if (!isPlainObject(value)) {
    return false;
  }

  const isValidGender =
    value.gender === null ||
    value.gender === 'MALE' ||
    value.gender === 'FEMALE';

  return (
    typeof value.name === 'string' &&
    isValidGender &&
    isNumberArray(value.selectedTagIds) &&
    Array.isArray(value.customTags) &&
    value.customTags.every(isKeywordCustomTagSnapshot)
  );
}

/**
 * 키워드 단계 스냅숏의 형태를 판별한다.
 *
 * @param value 검사할 값
 * @returns 키워드 단계 스냅숏 여부
 */
function isKeywordDraftSnapshot(value: unknown): value is KeywordDraftSnapshot {
  return (
    isPlainObject(value) &&
    isNumberArray(value.selectedGenreTagIds) &&
    Array.isArray(value.customGenreTags) &&
    value.customGenreTags.every(isKeywordCustomTagSnapshot) &&
    isKeywordCharacterSnapshot(value.protagonist) &&
    Array.isArray(value.supportingCharacters) &&
    value.supportingCharacters.every(isKeywordCharacterSnapshot)
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

  if (typeof parsed.requestId !== 'string') {
    return null;
  }

  if (
    parsed.stage === 'KEYWORD_DRAFT' &&
    isKeywordDraftSnapshot(parsed.snapshot)
  ) {
    return parsed as unknown as PendingCreationRequest;
  }

  if (!isPlainObject(parsed.generationRequest)) {
    return null;
  }

  if (parsed.stage === 'STORYLINE_GENERATION') {
    return parsed as unknown as PendingCreationRequest;
  }

  if (
    parsed.stage === 'STORY_COMPLETION' &&
    isPlainObject(parsed.generationResult) &&
    isPlainObject(parsed.selectedStoryline) &&
    (parsed.createdStoryId === undefined ||
      parsed.createdStoryId === null ||
      typeof parsed.createdStoryId === 'string') &&
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

  return parsePendingCreationRequest(getPendingCreationRequestSnapshot());
}

/**
 * 복구 슬롯에 레코드를 쓰고 성공 여부를 반환한다.
 *
 * @param record 저장할 레코드
 * @returns 저장에 성공했으면 true
 */
function writePendingCreationRequest(record: PendingCreationRequest): boolean {
  try {
    localStorage.setItem(
      PENDING_CREATION_REQUEST_STORAGE_KEY,
      JSON.stringify(record),
    );
    notifyPendingCreationRequestChange();

    return true;
  } catch {
    return false;
  }
}

/**
 * 생성 요청 직전에 복구 레코드를 저장한다. 진행 중 요청은 항상 하나뿐이므로 덮어쓴다.
 *
 * @param record 저장할 복구 레코드
 * @returns 저장에 성공했으면 true
 */
export function savePendingCreationRequest(
  record: PendingCreationRequest,
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return writePendingCreationRequest(record);
}

/**
 * 편집 임시 저장본을 우선순위에 따라 쓴다.
 * 진행 중 생성·완성 요청은 모든 draft보다 우선하고, 생성 결과가 담긴 STORY_DRAFT는
 * 키워드 draft보다 우선해 지연된 자동 저장이 복구 재료를 덮지 못하게 한다.
 *
 * @param record 저장할 편집 임시 저장본
 * @returns 실제로 저장했으면 true
 */
export function saveDraftCreationRecord(record: DraftCreationRecord): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const current = loadPendingCreationRequest();

  if (
    current?.stage === 'STORYLINE_GENERATION' ||
    current?.stage === 'STORY_COMPLETION'
  ) {
    return false;
  }

  if (record.stage === 'KEYWORD_DRAFT' && current?.stage === 'STORY_DRAFT') {
    return false;
  }

  return writePendingCreationRequest(record);
}

/**
 * 지정한 요청 레코드를 새 레코드로 교체한다. 원 응답과 복구 조회 경합에서
 * 현재 requestId를 가진 쪽만 성공 결과를 draft로 승격할 수 있다.
 *
 * @param requestId 교체할 현재 레코드의 요청 ID
 * @param replacement 교체할 레코드
 * @returns 교체에 성공했으면 true
 */
export function replacePendingCreationRequest(
  requestId: string,
  replacement: PendingCreationRequest,
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (loadPendingCreationRequest()?.requestId !== requestId) {
    return false;
  }

  return writePendingCreationRequest(replacement);
}

/**
 * 완성 레코드에 이미 생성된 스토리 ID를 확정한다.
 * 채팅 생성 전에 새로고침해도 복구 결과의 게스트 카운터·로컬 저장 부수효과를
 * 다시 적용하지 않고 채팅 생성만 이어가기 위한 표시다.
 *
 * @param requestId 완성 요청 ID
 * @param storyId 생성된 스토리 ID
 * @returns 같은 완성 레코드에 저장했으면 true
 */
export function markPendingStoryCreated(
  requestId: string,
  storyId: string,
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const current = loadPendingCreationRequest();

  if (
    current?.stage !== 'STORY_COMPLETION' ||
    current.requestId !== requestId
  ) {
    return false;
  }

  return writePendingCreationRequest({ ...current, createdStoryId: storyId });
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

  try {
    localStorage.removeItem(PENDING_CREATION_REQUEST_STORAGE_KEY);
    notifyPendingCreationRequestChange();
  } catch {
    return false;
  }

  return true;
}

/** 복구 레코드를 조건 없이 제거한다(404 등 더 이상 복구할 수 없는 경우). */
export function clearPendingCreationRequest(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(PENDING_CREATION_REQUEST_STORAGE_KEY);
    notifyPendingCreationRequestChange();
  } catch {
    // 저장소 접근이 막힌 환경에서는 메모리 화면 흐름만 계속한다.
  }
}
