import type {
  CreateSimpleStoryRequest,
  GenerateSimpleStorylinesRequest,
  GenerateSimpleStorylinesResponse,
  SimpleStoryCharacterRequestGender,
  SimpleStorylineResponse,
} from '@/api/generated/models';
import {
  creationDb,
  type CreationMetadata,
  getCreationEpoch,
  invalidateCreationEpoch,
  type StoredCreation,
} from '@/features/stories/_shared/utils/creation-db';

/** 최초 IndexedDB 이관에서만 읽는 구 저장소 키다. */
export const PENDING_CREATION_REQUEST_STORAGE_KEY =
  'manyak:pending-creation-request';
export const STORY_COMPLETION_REQUESTS_STORAGE_KEY =
  'manyak:story-completion-requests';

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
  /** 이 제작을 처음 임시 저장한 시각(ISO). 완성 실패로 초안에 되돌릴 때 이어 준다. */
  createdAt?: string;
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
      /** 이 제작을 처음 임시 저장한 시각(ISO). 첫 저장 때 찍고 단계 전환에도 유지한다. 구 레코드에는 없다. */
      createdAt?: string;
      snapshot: KeywordDraftSnapshot;
    }
  | {
      stage: 'STORYLINE_GENERATION';
      requestId: string;
      createdAt?: string;
      generationRequest: GenerateSimpleStorylinesRequest;
    }
  | {
      stage: 'STORY_DRAFT';
      requestId: string;
      createdAt?: string;
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

  if (parsed.createdAt !== undefined && typeof parsed.createdAt !== 'string') {
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
 * 진행 레코드를 처음 저장 시각 내림차순(최신이 앞)으로 정렬한다. 시각이 없는 구 레코드는
 * 저장 순서를 유지한 채 뒤로 보낸다. 제작 탭 카드 순서가 단계 전환(레코드 교체)에 흔들리지 않게 한다.
 *
 * @param records 정렬할 레코드 목록
 * @returns 정렬된 새 배열
 */
export function sortByCreatedAtDesc<Record extends { createdAt?: string }>(
  records: Record[],
): Record[] {
  return [...records].sort((a, b) => {
    if (a.createdAt === undefined || b.createdAt === undefined) {
      return (
        Number(a.createdAt === undefined) - Number(b.createdAt === undefined)
      );
    }

    return b.createdAt.localeCompare(a.createdAt);
  });
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

/** 구 저장값 전체가 검증된 경우에만 이관 후 삭제할 수 있다. */
function isFullyParsed(
  raw: string | null,
  count: number,
  single: boolean,
): boolean {
  if (raw === null) return true;

  try {
    const value: unknown = JSON.parse(raw);

    return Array.isArray(value)
      ? value.length === count
      : single && count === 1;
  } catch {
    return false;
  }
}

/** DB 초기화와 구 저장소 이관을 완료한다. 실패를 빈 목록으로 바꾸지 않는다. */
export async function initializeCreationStorage(): Promise<void> {
  const epoch = getCreationEpoch();

  if (epoch < 0) throw new Error('Creation storage is unavailable');

  const state = await creationDb.metadata.get('state');

  if (state?.migrated && state.epoch === epoch) return;

  if (state && state.epoch > epoch)
    throw new Error('Creation session is expired');

  // 세션 종료 이후에는 남은 legacy 입력을 다시 가져오지 않는다.
  const pendingRaw =
    epoch === 0
      ? localStorage.getItem(PENDING_CREATION_REQUEST_STORAGE_KEY)
      : null;
  const completionRaw =
    epoch === 0
      ? localStorage.getItem(STORY_COMPLETION_REQUESTS_STORAGE_KEY)
      : null;
  const pending = parsePendingCreationRequests(pendingRaw);
  const completions = parseStoryCompletionRequests(completionRaw);

  await creationDb.transaction('rw', creationDb.tables, async () => {
    if (getCreationEpoch() !== epoch)
      throw new Error('Creation session is expired');

    const current = await creationDb.metadata.get('state');

    if (current && current.epoch > epoch)
      throw new Error('Creation session is expired');

    if (current?.migrated && current.epoch === epoch) return;

    let sequence = current?.sequence ?? 0;

    if (current?.epoch !== undefined && current.epoch !== epoch) {
      await creationDb.pendingCreations.clear();
      await creationDb.storyCompletions.clear();
    }

    if (epoch === 0 && !current?.migrated) {
      for (const record of pending) {
        if (!(await creationDb.pendingCreations.get(record.requestId))) {
          await creationDb.pendingCreations.add({
            ...record,
            storageOrder: ++sequence,
          });
        }
      }

      for (const record of completions) {
        if (!(await creationDb.storyCompletions.get(record.requestId))) {
          await creationDb.storyCompletions.add({
            ...record,
            storageOrder: ++sequence,
          });
        }
      }
    }

    await creationDb.metadata.put({
      key: 'state',
      epoch,
      migrated: true,
      sequence,
    });
  });

  // DB 커밋 후 legacy 정리가 실패해도 DB의 이관 완료 표시를 따른다.
  try {
    if (getCreationEpoch() !== epoch) return;

    if (
      isFullyParsed(pendingRaw, pending.length, true) &&
      localStorage.getItem(PENDING_CREATION_REQUEST_STORAGE_KEY) === pendingRaw
    ) {
      localStorage.removeItem(PENDING_CREATION_REQUEST_STORAGE_KEY);
    }

    if (
      isFullyParsed(completionRaw, completions.length, false) &&
      localStorage.getItem(STORY_COMPLETION_REQUESTS_STORAGE_KEY) ===
        completionRaw
    ) {
      localStorage.removeItem(STORY_COMPLETION_REQUESTS_STORAGE_KEY);
    }
  } catch {
    // 이관 커밋이 완료되었으므로 legacy 정리 실패가 DB 쓰기를 되돌리지는 않는다.
  }
}

/** 순서 보조 필드를 제외한 도메인 레코드를 반환한다. */
function withoutOrder<T>(record: StoredCreation<T>): T {
  const { storageOrder: _, ...value } = record;

  return value as T;
}

export async function loadPendingCreationRequests(): Promise<
  PendingCreationRequest[]
> {
  await initializeCreationStorage();

  return (
    await creationDb.pendingCreations.orderBy('storageOrder').toArray()
  ).map(withoutOrder);
}

export async function loadStoryCompletionRequests(): Promise<
  StoryCompletionRecord[]
> {
  await initializeCreationStorage();

  return (
    await creationDb.storyCompletions.orderBy('storageOrder').toArray()
  ).map(withoutOrder);
}

export async function findPendingCreationRequest(
  requestId: string,
): Promise<PendingCreationRequest | null> {
  await initializeCreationStorage();

  const record = await creationDb.pendingCreations.get(requestId);

  return record ? withoutOrder(record) : null;
}

export async function hasStoryCompletionRequest(
  requestId: string,
): Promise<boolean> {
  await initializeCreationStorage();

  return Boolean(await creationDb.storyCompletions.get(requestId));
}

/** 상태 확인과 쓰기를 같은 트랜잭션에서 실행한다. */
async function writeCreation(
  epoch: number,
  write: (state: CreationMetadata) => Promise<boolean>,
): Promise<boolean> {
  try {
    await initializeCreationStorage();

    return await creationDb.transaction('rw', creationDb.tables, async () => {
      const state = await creationDb.metadata.get('state');

      if (!state || state.epoch !== epoch || getCreationEpoch() !== epoch)
        return false;

      const saved = await write(state);

      if (getCreationEpoch() !== epoch)
        throw new Error('Creation session is expired');

      return saved;
    });
  } catch {
    return false;
  }
}

/** 최초 시각과 목록 내 순서를 유지한다. */
async function putPending(
  record: PendingCreationRequest,
  state: CreationMetadata,
  previous?: StoredCreation<PendingCreationRequest>,
) {
  const existing =
    previous ?? (await creationDb.pendingCreations.get(record.requestId));
  const storageOrder = existing?.storageOrder ?? ++state.sequence;

  await creationDb.pendingCreations.put({
    ...record,
    createdAt: existing
      ? existing.createdAt
      : (record.createdAt ?? new Date().toISOString()),
    storageOrder,
  });
  await creationDb.metadata.put(state);
}

/** 소유 초안의 교체와 최초 저장 시각 전달을 원자적으로 처리한다. */
export function savePendingCreationRequest(
  record: PendingCreationRequest,
  epoch = getCreationEpoch(),
  previousId?: string | null,
): Promise<boolean> {
  return writeCreation(epoch, async (state) => {
    const previous = previousId
      ? await creationDb.pendingCreations.get(previousId)
      : undefined;

    if (previousId && !previous) return false;

    await putPending(record, state, previous);

    if (previousId && previousId !== record.requestId)
      await creationDb.pendingCreations.delete(previousId);

    return true;
  });
}

/** 진행 요청이나 삭제된 초안에 지연 편집값이 덮어써지지 않게 한다. */
export function saveDraftCreationRecord(
  record: DraftCreationRecord,
  epoch = getCreationEpoch(),
  previousId?: string | null,
): Promise<boolean> {
  return writeCreation(epoch, async (state) => {
    const current = await creationDb.pendingCreations.get(record.requestId);

    if (current?.stage === 'STORYLINE_GENERATION') return false;

    const previous = previousId
      ? await creationDb.pendingCreations.get(previousId)
      : undefined;

    if (previousId && (!previous || previous.stage === 'STORYLINE_GENERATION'))
      return false;

    if (
      await creationDb.storyCompletions
        .where('generationRequest.requestId')
        .equals(record.requestId)
        .count()
    )
      return false;

    await putPending(record, state, previous);

    if (previousId && previousId !== record.requestId)
      await creationDb.pendingCreations.delete(previousId);

    return true;
  });
}

/** 생성 결과를 한 경로만 초안으로 승격한다. */
export function replacePendingCreationRequest(
  requestId: string,
  replacement: PendingCreationRequest,
  epoch = getCreationEpoch(),
): Promise<boolean> {
  return writeCreation(epoch, async (state) => {
    const current = await creationDb.pendingCreations.get(requestId);

    if (!current || current.stage !== 'STORYLINE_GENERATION') return false;

    await putPending(replacement, state, current);

    if (requestId !== replacement.requestId)
      await creationDb.pendingCreations.delete(requestId);

    return true;
  });
}

export function addStoryCompletionRequest(
  record: StoryCompletionRecord,
  epoch = getCreationEpoch(),
): Promise<boolean> {
  return writeCreation(epoch, async (state) => {
    const pending = await creationDb.pendingCreations.get(
      record.generationRequest.requestId,
    );
    const existing = await creationDb.storyCompletions.get(record.requestId);

    if (!pending && !existing) return false;

    const source = existing ?? pending;

    await creationDb.storyCompletions.put({
      ...record,
      createdAt: source?.createdAt ?? record.createdAt,
      storageOrder: source?.storageOrder ?? ++state.sequence,
    });
    await creationDb.pendingCreations.delete(
      record.generationRequest.requestId,
    );
    await creationDb.metadata.put(state);

    return true;
  });
}

export function takePendingCreationRequest(
  requestId: string,
  epoch = getCreationEpoch(),
): Promise<boolean> {
  return writeCreation(epoch, async () => {
    if (!(await creationDb.pendingCreations.get(requestId))) return false;

    await creationDb.pendingCreations.delete(requestId);

    return true;
  });
}

export function takeStoryCompletionRequest(
  requestId: string,
  epoch = getCreationEpoch(),
): Promise<boolean> {
  return writeCreation(epoch, async () => {
    if (!(await creationDb.storyCompletions.get(requestId))) return false;

    await creationDb.storyCompletions.delete(requestId);

    return true;
  });
}

export function markPendingStoryCreated(
  requestId: string,
  storyId: string,
  epoch = getCreationEpoch(),
): Promise<boolean> {
  return writeCreation(epoch, async () => {
    const current = await creationDb.storyCompletions.get(requestId);

    if (!current || current.createdStoryId) return false;

    await creationDb.storyCompletions.update(requestId, {
      createdStoryId: storyId,
    });

    return true;
  });
}

export function demotePendingCompletionToDraft(
  requestId: string,
  epoch = getCreationEpoch(),
): Promise<boolean> {
  return writeCreation(epoch, async (state) => {
    const current = await creationDb.storyCompletions.get(requestId);

    if (!current || current.createdStoryId) return false;

    await creationDb.pendingCreations.put({
      stage: 'STORY_DRAFT',
      requestId: current.generationRequest.requestId,
      createdAt: current.createdAt,
      storageOrder: current.storageOrder,
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
    await creationDb.storyCompletions.delete(requestId);
    await creationDb.metadata.put(state);

    return true;
  });
}

/** 세션 종료를 먼저 기록하고 두 제작 테이블을 함께 비운다. 실패해도 다음 접근에서 다시 정리한다. */
export async function clearCreationStorage(): Promise<void> {
  let epoch: number;

  try {
    epoch = invalidateCreationEpoch();
  } catch {
    epoch = Date.now();
  }

  try {
    localStorage.removeItem(PENDING_CREATION_REQUEST_STORAGE_KEY);
    localStorage.removeItem(STORY_COMPLETION_REQUESTS_STORAGE_KEY);
  } catch {
    // DB의 migrated 표시가 남은 legacy 데이터의 재이관을 막는다.
  }

  await creationDb.transaction('rw', creationDb.tables, async () => {
    const current = await creationDb.metadata.get('state');

    await creationDb.pendingCreations.clear();
    await creationDb.storyCompletions.clear();
    await creationDb.metadata.put({
      key: 'state',
      epoch: Math.max(epoch, current?.epoch ?? 0),
      migrated: true,
      sequence: 0,
    });
  });
}
