import type {
  CreateSimpleStoryRequest,
  GenerateSimpleStorylinesRequest,
  GenerateSimpleStorylinesResponse,
  SimpleStoryCharacterRequestGender,
  SimpleStorylineResponse,
} from '@/api/generated/models';

/**
 * 편집 초안 목록(키워드 초안·스토리라인 생성·스토리 초안)을 requestId별로 보관하는
 * 로컬스토리지 키(JSON 배열). 구 형식의 단일 객체도 1건 목록으로 읽는다.
 */
export const PENDING_CREATION_REQUEST_STORAGE_KEY =
  'manyak:pending-creation-request';

/** 완성 요청을 requestId별로 여러 건 보관하는 로컬스토리지 키(JSON 배열) */
export const STORY_COMPLETION_REQUESTS_STORAGE_KEY =
  'manyak:story-completion-requests';

/** 같은 탭 내 복구 레코드 변경을 알리는 커스텀 이벤트 이름 */
const PENDING_CREATION_REQUEST_CHANGE_EVENT = `${PENDING_CREATION_REQUEST_STORAGE_KEY}-change`;

/** 같은 탭 구독자에게 복구 레코드 변경을 알린다. */
function notifyPendingCreationRequestChange(): void {
  window.dispatchEvent(new Event(PENDING_CREATION_REQUEST_CHANGE_EVENT));
}

/**
 * 편집 초안 목록·완성 요청 목록의 변경(같은 탭 커스텀 이벤트·다른 탭 storage 이벤트)을 구독한다.
 * 두 저장소가 같은 이벤트를 공유하므로 어느 쪽 스냅샷과 조합해도 된다.
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
    if (
      event.key === PENDING_CREATION_REQUEST_STORAGE_KEY ||
      event.key === STORY_COMPLETION_REQUESTS_STORAGE_KEY
    ) {
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
 * 로컬스토리지에 저장된 완성 요청 목록 원본 문자열의 현재 스냅샷을 반환한다.
 *
 * @returns 저장된 원본 문자열. 없으면 null
 */
export function getStoryCompletionRequestsSnapshot(): string | null {
  try {
    return localStorage.getItem(STORY_COMPLETION_REQUESTS_STORAGE_KEY);
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
 * 완성 요청 레코드. 편집 초안 목록과 별도 목록에 requestId별로 여러 건 보관해 완성 중에도
 * 새 제작을 시작할 수 있다. 실패 시 추가 정보 초안으로 되돌릴 수 있도록 퍼널 컨텍스트를 함께 담는다.
 */
export type StoryCompletionRecord = {
  stage: 'STORY_COMPLETION';
  requestId: string;
  generationRequest: GenerateSimpleStorylinesRequest;
  generationResult: GenerateSimpleStorylinesResponse;
  activeStorylineIndex?: number;
  selectedStoryline: SimpleStorylineResponse;
  additionalInfos?: string[];
  selectedRecommendations?: string[];
  /** 스토리 성공 부수효과까지 적용한 ID. 폴링·새로고침이 같은 결과를 다시 적용하지 않게 한다. */
  createdStoryId?: string | null;
  completionRequest: CreateSimpleStoryRequest;
};

/**
 * 편집 초안 레코드. 퍼널 한 세션이 한 건을 소유하며 여러 세션의 레코드가 목록에 공존한다.
 * 완성 요청은 `StoryCompletionRecord` 목록이 담당한다.
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

/** 스토리라인 생성 진행 레코드 */
export type StorylineGenerationRecord = Extract<
  PendingCreationRequest,
  { stage: 'STORYLINE_GENERATION' }
>;

/** 진행 중 요청 레코드(서버 복구 조회 대상) */
export type InFlightCreationRequest =
  | StorylineGenerationRecord
  | StoryCompletionRecord;

/** 제작 탭 진행 카드가 표시하는 레코드(편집 초안 또는 완성 요청) */
export type CreationProgressRecord =
  | PendingCreationRequest
  | StoryCompletionRecord;

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
 * 완성 요청 레코드의 형태를 판별한다.
 *
 * @param value 검사할 값
 * @returns 완성 요청 레코드 여부
 */
function isStoryCompletionRecord(
  value: unknown,
): value is StoryCompletionRecord {
  return (
    isPlainObject(value) &&
    value.stage === 'STORY_COMPLETION' &&
    typeof value.requestId === 'string' &&
    isPlainObject(value.generationRequest) &&
    isPlainObject(value.generationResult) &&
    isPlainObject(value.selectedStoryline) &&
    (value.createdStoryId === undefined ||
      value.createdStoryId === null ||
      typeof value.createdStoryId === 'string') &&
    isPlainObject(value.completionRequest)
  );
}

/**
 * 저장된 원본 문자열을 완성 요청 목록으로 파싱한다. 배열이 아니면 빈 목록으로,
 * 형태가 어긋난 항목은 걸러 손상된 저장값이 카드 렌더를 깨뜨리지 않게 한다.
 *
 * @param raw 로컬스토리지에 저장된 원본 문자열(없으면 null)
 * @returns 유효한 완성 요청 레코드 목록
 */
export function parseStoryCompletionRequests(
  raw: string | null,
): StoryCompletionRecord[] {
  if (!raw) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  return Array.isArray(parsed) ? parsed.filter(isStoryCompletionRecord) : [];
}

/**
 * 값이 편집 초안 레코드의 형태인지 판별한다.
 *
 * @param parsed 검사할 값
 * @returns 편집 초안 레코드 여부
 */
function isPendingCreationRequest(
  parsed: unknown,
): parsed is PendingCreationRequest {
  if (!isPlainObject(parsed)) {
    return false;
  }

  if (typeof parsed.requestId !== 'string') {
    return false;
  }

  if (
    parsed.stage === 'KEYWORD_DRAFT' &&
    isKeywordDraftSnapshot(parsed.snapshot)
  ) {
    return true;
  }

  if (!isPlainObject(parsed.generationRequest)) {
    return false;
  }

  if (parsed.stage === 'STORYLINE_GENERATION') {
    return true;
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

    return (
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
    );
  }

  return false;
}

/**
 * 저장된 원본 문자열을 편집 초안 레코드 한 건으로 파싱한다. 형태가 어긋나면 null로 처리해
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

  return isPendingCreationRequest(parsed) ? parsed : null;
}

/**
 * 저장된 원본 문자열을 편집 초안 목록으로 파싱한다. 배열이면 형태가 어긋난 항목만 걸러내고,
 * 구 형식의 단일 객체는 1건 목록으로 읽어 배포 전 저장된 초안을 보존한다.
 *
 * @param raw 로컬스토리지에 저장된 원본 문자열(없으면 null)
 * @returns 유효한 편집 초안 레코드 목록
 */
export function parsePendingCreationRequests(
  raw: string | null,
): PendingCreationRequest[] {
  if (!raw) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (Array.isArray(parsed)) {
    return parsed.filter(isPendingCreationRequest);
  }

  return isPendingCreationRequest(parsed) ? [parsed] : [];
}

/**
 * 편집 초안 목록을 로컬스토리지에서 읽는다.
 *
 * @returns 저장된 편집 초안 목록. 없으면 빈 배열
 */
export function loadPendingCreationRequests(): PendingCreationRequest[] {
  if (typeof window === 'undefined') {
    return [];
  }

  return parsePendingCreationRequests(getPendingCreationRequestSnapshot());
}

/**
 * 지정한 requestId의 편집 초안 레코드를 찾는다.
 *
 * @param requestId 찾을 레코드의 요청 ID
 * @returns 레코드. 없으면 null
 */
export function findPendingCreationRequest(
  requestId: string,
): PendingCreationRequest | null {
  return (
    loadPendingCreationRequests().find(
      (record) => record.requestId === requestId,
    ) ?? null
  );
}

/**
 * 편집 초안 목록을 통째로 쓰고 성공 여부를 반환한다. 빈 목록은 키를 제거한다.
 *
 * @param records 저장할 편집 초안 목록
 * @returns 저장에 성공했으면 true
 */
function writePendingCreationRequests(
  records: PendingCreationRequest[],
): boolean {
  try {
    if (records.length === 0) {
      localStorage.removeItem(PENDING_CREATION_REQUEST_STORAGE_KEY);
    } else {
      localStorage.setItem(
        PENDING_CREATION_REQUEST_STORAGE_KEY,
        JSON.stringify(records),
      );
    }

    notifyPendingCreationRequestChange();

    return true;
  } catch {
    return false;
  }
}

/**
 * 편집 초안 목록에 레코드를 upsert한다. 같은 requestId가 있으면 그 자리에서 교체하고
 * 없으면 끝에 추가한다.
 *
 * @param record 저장할 레코드
 * @returns 저장에 성공했으면 true
 */
function upsertPendingCreationRequest(record: PendingCreationRequest): boolean {
  const records = loadPendingCreationRequests();
  const exists = records.some(
    ({ requestId }) => requestId === record.requestId,
  );

  return writePendingCreationRequests(
    exists
      ? records.map((current) =>
          current.requestId === record.requestId ? record : current,
        )
      : [...records, record],
  );
}

/**
 * 완성 요청 목록을 로컬스토리지에서 읽는다.
 *
 * @returns 저장된 완성 요청 목록. 없으면 빈 배열
 */
export function loadStoryCompletionRequests(): StoryCompletionRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  return parseStoryCompletionRequests(getStoryCompletionRequestsSnapshot());
}

/**
 * 완성 요청 목록을 통째로 쓰고 성공 여부를 반환한다. 빈 목록은 키를 제거한다.
 *
 * @param records 저장할 완성 요청 목록
 * @returns 저장에 성공했으면 true
 */
function writeStoryCompletionRequests(
  records: StoryCompletionRecord[],
): boolean {
  try {
    if (records.length === 0) {
      localStorage.removeItem(STORY_COMPLETION_REQUESTS_STORAGE_KEY);
    } else {
      localStorage.setItem(
        STORY_COMPLETION_REQUESTS_STORAGE_KEY,
        JSON.stringify(records),
      );
    }

    notifyPendingCreationRequestChange();

    return true;
  } catch {
    return false;
  }
}

/**
 * 완성 요청 직전에 레코드를 목록에 추가하고 제출 원본인 편집 초안(생성 요청 ID)만 제거한다
 * (앱의 삽입+초안 삭제 트랜잭션과 같다). 같은 requestId가 이미 있으면 교체한다.
 * 목록 저장에 실패하면 초안을 건드리지 않는다.
 *
 * @param record 저장할 완성 요청 레코드
 * @returns 목록 저장에 성공했으면 true
 */
export function addStoryCompletionRequest(
  record: StoryCompletionRecord,
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const others = loadStoryCompletionRequests().filter(
    ({ requestId }) => requestId !== record.requestId,
  );

  if (!writeStoryCompletionRequests([...others, record])) {
    return false;
  }

  takePendingCreationRequest(record.generationRequest.requestId);

  return true;
}

/**
 * 지정한 requestId의 완성 요청이 목록에 있는지 반환한다.
 *
 * @param requestId 완성 요청 ID
 * @returns 목록에 있으면 true
 */
export function hasStoryCompletionRequest(requestId: string): boolean {
  return loadStoryCompletionRequests().some(
    (record) => record.requestId === requestId,
  );
}

/**
 * 지정한 requestId의 완성 요청을 목록에서 제거하고 제거 여부를 반환한다.
 * 원 응답과 폴링이 경합할 때 true를 받은 쪽만 후속 처리를 수행한다(제거 선점 가드).
 *
 * @param requestId 제거할 완성 요청 ID
 * @returns 레코드가 존재해 제거했으면 true
 */
export function takeStoryCompletionRequest(requestId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const records = loadStoryCompletionRequests();
  const remaining = records.filter((record) => record.requestId !== requestId);

  if (remaining.length === records.length) {
    return false;
  }

  return writeStoryCompletionRequests(remaining);
}

/** 완성 요청 목록을 조건 없이 비운다(로그아웃·세션 만료·탈퇴). */
export function clearStoryCompletionRequests(): void {
  if (typeof window === 'undefined') {
    return;
  }

  writeStoryCompletionRequests([]);
}

/**
 * 생성 요청 직전에 편집 초안 목록에 복구 레코드를 저장한다(같은 requestId는 교체).
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

  return upsertPendingCreationRequest(record);
}

/**
 * 편집 임시 저장본을 쓴다. 같은 requestId로 진행 중인 스토리라인 생성이 있으면
 * 지연된 자동 저장이 복구 재료를 덮지 못하게 저장하지 않는다.
 *
 * @param record 저장할 편집 임시 저장본
 * @returns 실제로 저장했으면 true
 */
export function saveDraftCreationRecord(record: DraftCreationRecord): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (
    findPendingCreationRequest(record.requestId)?.stage ===
    'STORYLINE_GENERATION'
  ) {
    return false;
  }

  return upsertPendingCreationRequest(record);
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

  const records = loadPendingCreationRequests();

  if (!records.some((record) => record.requestId === requestId)) {
    return false;
  }

  return writePendingCreationRequests(
    records.map((record) =>
      record.requestId === requestId ? replacement : record,
    ),
  );
}

/**
 * 완성 레코드에 이미 생성된 스토리 ID를 확정한다.
 * 목록 정리 전에 새로고침해도 폴링이 게스트 카운터·로컬 저장 부수효과를
 * 다시 적용하지 않게 하기 위한 표시다.
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

  const records = loadStoryCompletionRequests();

  if (!records.some((record) => record.requestId === requestId)) {
    return false;
  }

  return writeStoryCompletionRequests(
    records.map((record) =>
      record.requestId === requestId
        ? { ...record, createdStoryId: storyId }
        : record,
    ),
  );
}

/**
 * 스토리라인 생성 결과를 스토리라인 선택 단계의 편집 초안 레코드로 만든다.
 * 원 응답·재진입 복구·제작 탭 폴링이 같은 형태로 승격하도록 한 곳에서 조립한다.
 *
 * @param requestId 생성 요청 ID
 * @param generationRequest 원 생성 요청
 * @param generationResult 생성된 스토리라인 결과
 * @returns 스토리라인 선택 단계의 STORY_DRAFT 레코드
 */
export function buildStorylineDraftRecord(
  requestId: string,
  generationRequest: GenerateSimpleStorylinesRequest,
  generationResult: GenerateSimpleStorylinesResponse,
): StoryDraftRecord {
  return {
    stage: 'STORY_DRAFT',
    requestId,
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
}

/**
 * 완성 요청 레코드를 목록에서 빼고 추가 정보 단계의 편집 초안으로 강등한다.
 * 퍼널을 떠난 뒤 서버가 실패를 확정하면 완성 중 카드를 유지할 수 없으므로,
 * 같은 입력으로 다시 완성할 수 있게 컨텍스트를 STORY_DRAFT로 되돌린다.
 * 초안 키는 퍼널 자동 저장 후보와 같은 생성 요청 ID를 쓴다.
 *
 * @param requestId 강등할 완성 요청 ID
 * @returns 같은 완성 레코드를 목록에서 제거했으면 true(초안 저장 여부와 무관)
 */
export function demotePendingCompletionToDraft(requestId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const current = loadStoryCompletionRequests().find(
    (record) => record.requestId === requestId,
  );

  if (!current || !takeStoryCompletionRequest(requestId)) {
    return false;
  }

  upsertPendingCreationRequest({
    stage: 'STORY_DRAFT',
    requestId: current.generationRequest.requestId,
    step: 'additional-info',
    generationRequest: current.generationRequest,
    generationResult: current.generationResult,
    activeStorylineIndex: current.activeStorylineIndex ?? 0,
    selectedStoryline: current.selectedStoryline,
    additionalInfos: current.additionalInfos ?? [],
    selectedRecommendations: current.selectedRecommendations ?? [],
    createdStoryId: null,
    completionRequest: current.completionRequest,
  });

  return true;
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

  const records = loadPendingCreationRequests();
  const remaining = records.filter((record) => record.requestId !== requestId);

  if (remaining.length === records.length) {
    return false;
  }

  return writePendingCreationRequests(remaining);
}

/** 편집 초안 목록을 조건 없이 비운다(로그아웃·세션 만료·탈퇴). */
export function clearPendingCreationRequests(): void {
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
