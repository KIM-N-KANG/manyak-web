import { FetchError, getApiErrorCode } from '@/lib/api-error';

/** 서버 임시 저장 응답을 읽는 파서. 생성 타입이 느슨한 객체라 제작 탭과 제작 화면이 쓰는 값만 직접 좁힌다. */

export type StoryDraftMode = 'SIMPLE' | 'GENERAL';

/** 제작 탭 카드에 쓰는 서버 초안 요약이다. */
export type StoryDraftCard = {
  draftId: string;
  mode: StoryDraftMode;
  stage: string;
  title: string | null;
  oneLineIntro: string | null;
  thumbnailUrl: string | null;
  version: number;
  createdAt: string;
};

/** 이어서 만들기에 쓰는 서버 초안 상세다. `imageUrls`는 payload의 객체 키별 미리보기 URL이다. */
export type StoryDraftDetail = StoryDraftCard & {
  schemaVersion: number;
  payload: Record<string, unknown>;
  imageUrls: Record<string, string>;
};

/** 임시 저장 PUT 실패의 종류다. 충돌이면 서버의 현재 버전을 함께 담는다. */
export type DraftSaveError =
  | { kind: 'conflict'; version: number }
  | { kind: 'limit' }
  | { kind: 'tooLarge' }
  | { kind: 'failed' };

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
 * 문자열이면 그대로, 아니면 null을 반환한다.
 *
 * @param value 읽을 값
 * @returns 문자열 또는 null
 */
const asNullableText = (value: unknown) =>
  typeof value === 'string' ? value : null;

/**
 * 초안 요약 필드를 읽는다. 식별에 필요한 필드가 빠졌으면 읽지 않는다.
 *
 * @param value 응답 항목
 * @returns 초안 요약. 읽을 수 없으면 null
 */
function readCard(value: unknown): StoryDraftCard | null {
  if (!isObject(value)) return null;

  const { draftId, mode, stage, version, createdAt } = value;

  if (
    typeof draftId !== 'string' ||
    (mode !== 'SIMPLE' && mode !== 'GENERAL') ||
    typeof stage !== 'string' ||
    typeof version !== 'number' ||
    typeof createdAt !== 'string'
  )
    return null;

  return {
    draftId,
    mode,
    stage,
    title: asNullableText(value.title),
    oneLineIntro: asNullableText(value.oneLineIntro),
    thumbnailUrl: asNullableText(value.thumbnailUrl),
    version,
    createdAt,
  };
}

/**
 * 제작 탭 목록 응답에서 초안 카드만 읽는다. 진행 중 생성 요청 항목과 형식이 맞지 않는 항목은 버린다.
 *
 * @param data 목록 응답 본문
 * @returns 초안 카드 목록(응답 순서)
 */
export function readStoryDraftCards(data: unknown): StoryDraftCard[] {
  if (!Array.isArray(data)) return [];

  return data.flatMap((item) => {
    const card =
      isObject(item) && item.kind === 'DRAFT' ? readCard(item) : null;

    return card ? [card] : [];
  });
}

/**
 * 초안 상세 응답을 읽는다.
 *
 * @param data 상세 응답 본문
 * @returns 초안 상세. payload나 스키마 버전을 읽을 수 없으면 null
 */
export function readStoryDraftDetail(data: unknown): StoryDraftDetail | null {
  const card = readCard(data);

  if (
    !card ||
    !isObject(data) ||
    typeof data.schemaVersion !== 'number' ||
    !isObject(data.payload)
  )
    return null;

  const imageUrls = isObject(data.imageUrls)
    ? Object.fromEntries(
        Object.entries(data.imageUrls).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      )
    : {};

  return {
    ...card,
    schemaVersion: data.schemaVersion,
    payload: data.payload,
    imageUrls,
  };
}

/**
 * 409 충돌 응답 details에서 서버의 현재 버전을 읽는다.
 *
 * @param error 충돌 응답 오류
 * @returns 현재 버전. 없으면 null
 */
function readConflictVersion(error: FetchError): number | null {
  const details = isObject(error.data) ? error.data.details : undefined;
  const version = Array.isArray(details)
    ? details.find((detail) => isObject(detail) && detail.field === 'version')
    : undefined;
  const parsed = isObject(version) ? Number(version.message) : Number.NaN;

  return Number.isInteger(parsed) ? parsed : null;
}

/**
 * 임시 저장 PUT 실패를 안내 종류로 나눈다.
 *
 * @param error 저장 호출이 던진 오류
 * @returns 실패 종류
 */
export function readDraftSaveError(error: unknown): DraftSaveError {
  const code = getApiErrorCode(error);

  if (code === 'DRAFT_VERSION_CONFLICT' && error instanceof FetchError) {
    const version = readConflictVersion(error);

    return version === null
      ? { kind: 'failed' }
      : { kind: 'conflict', version };
  }

  if (code === 'DRAFT_LIMIT_EXCEEDED') return { kind: 'limit' };

  if (code === 'DRAFT_PAYLOAD_TOO_LARGE') return { kind: 'tooLarge' };

  return { kind: 'failed' };
}
