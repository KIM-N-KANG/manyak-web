import type { JsonNode, PutStoryDraftRequest } from '@/api/generated/models';
import type {
  GeneralStoryDraftImage,
  GeneralStoryDraftSnapshot,
} from '@/features/studio/_shared/utils/general-story-draft';
import { EMPTY_GENERAL_TEXT_VALUES } from '@/features/studio/general/constants';
import type { GeneralStoryCharacter } from '@/features/studio/general/utils/character-settings';
import {
  EMPTY_GENRE_SELECTION,
  type GeneralStoryGenreSelection,
} from '@/features/studio/general/utils/genre-selection';
import { createMainEventDraft } from '@/features/studio/general/utils/main-event-draft';
import {
  createStartSettingDraft,
  type GeneralStoryStartSettingDraft,
} from '@/features/studio/general/utils/start-setting-draft';
import { LENGTH_RATIO_DEFAULT } from '@/features/studio/general/utils/story-setting-sections';

/**
 * 일반 제작 서버 임시 저장 payload의 스키마 버전이다. 서버는 payload를 해석하지 않으므로 Web과 Android가
 * 같은 형식을 쓴다(공통 스펙 FE-SCREEN-009).
 */
export const GENERAL_DRAFT_SCHEMA_VERSION = 1;

type Loose = Record<string, unknown>;

type SupportingDraft = GeneralStoryDraftSnapshot['supporting'][number];

/**
 * 배열이 아닌 객체인지 반환한다.
 *
 * @param value 검사할 값
 * @returns 필드를 읽을 수 있는 객체면 참
 */
const isObject = (value: unknown): value is Loose =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * 항목이 하나 이상인 배열이면 그대로, 아니면 null을 반환한다.
 *
 * @param value 읽을 값
 * @returns 비어 있지 않은 배열 또는 null
 */
const asFilledArray = (value: unknown): unknown[] | null =>
  Array.isArray(value) && value.length > 0 ? value : null;

/**
 * 임시 저장 이미지를 서버로 보낼 형태로 바꾼다. 원본 파일은 기기 밖으로 보내지 않는다.
 *
 * @param image 임시 저장 이미지
 * @returns 객체 키만 담은 이미지. 없으면 null
 */
const toPayloadImage = (image: GeneralStoryDraftImage | null) =>
  image && { objectKey: image.objectKey };

/**
 * 서버 payload의 이미지를 읽는다. 원본 파일이 없어 미리보기는 상세 응답의 URL을 쓴다.
 *
 * @param value payload의 이미지 값
 * @returns 임시 저장 이미지. 객체 키가 없으면 null
 */
const readImage = (value: unknown): GeneralStoryDraftImage | null =>
  isObject(value) && typeof value.objectKey === 'string'
    ? { objectKey: value.objectKey, blob: null }
    : null;

/**
 * 빈 주변 인물 한 명을 만든다. 폼이 주변 인물 1명으로 시작하는 것과 맞춘다.
 *
 * @returns 입력이 없는 주변 인물
 */
const createEmptySupporting = (): SupportingDraft => ({
  id: crypto.randomUUID(),
  name: '',
  gender: null,
  description: '',
  feature: '',
  image: null,
});

/**
 * 일반 제작 폼 스냅숏을 임시 저장 PUT 본문으로 바꾼다.
 *
 * @param snapshot 폼 스냅숏
 * @param baseVersion 기준으로 삼은 서버 버전. 새 초안이면 null
 * @returns PUT 본문
 */
export function toGeneralDraftRequest(
  snapshot: GeneralStoryDraftSnapshot,
  baseVersion: number | null,
): PutStoryDraftRequest {
  const payload = {
    ...snapshot,
    cover: toPayloadImage(snapshot.cover),
    supporting: snapshot.supporting.map((character) => ({
      ...character,
      image: toPayloadImage(character.image),
    })),
  };

  return {
    mode: 'GENERAL',
    stage: 'GENERAL_DRAFT',
    schemaVersion: GENERAL_DRAFT_SCHEMA_VERSION,
    // 생성 타입이 Jackson JsonNode의 빈 속성으로 잘못 생성돼 있어 실제 JSON 객체를 그대로 넣는다.
    payload: payload as unknown as JsonNode,
    baseVersion,
    title: snapshot.texts.title.trim() || null,
    oneLineIntro: snapshot.texts.oneLineIntro.trim() || null,
    thumbnailObjectKey: snapshot.cover?.objectKey ?? null,
  };
}

/**
 * 서버 payload를 폼 스냅숏으로 읽는다. 빠졌거나 타입이 틀린 최상위 필드는 새 폼의 기본값으로 채운다.
 *
 * @param payload 상세 응답의 payload
 * @returns 폼 스냅숏. 이미지는 원본 파일 없이 객체 키만 갖는다
 */
export function readGeneralDraftPayload(
  payload: Record<string, unknown>,
): GeneralStoryDraftSnapshot {
  const texts = isObject(payload.texts) ? payload.texts : {};
  const supporting = asFilledArray(payload.supporting);
  const startSettings = asFilledArray(payload.startSettings);

  // 항목은 새 항목의 기본값 위에 펼쳐 빠진 필드를 채운다. 값의 타입까지는 보지 않는다(같은 형식을 쓰는 클라이언트만 저장한다).
  return {
    texts: Object.fromEntries(
      Object.keys(EMPTY_GENERAL_TEXT_VALUES).map((field) => [
        field,
        typeof texts[field] === 'string' ? texts[field] : '',
      ]),
    ) as GeneralStoryDraftSnapshot['texts'],
    cover: readImage(payload.cover),
    descriptionRatio:
      typeof payload.descriptionRatio === 'number'
        ? payload.descriptionRatio
        : LENGTH_RATIO_DEFAULT,
    protagonist: {
      name: '',
      gender: null,
      feature: '',
      ...(isObject(payload.protagonist)
        ? (payload.protagonist as Partial<GeneralStoryCharacter>)
        : {}),
    },
    supporting: supporting
      ? supporting.map((item) => ({
          ...createEmptySupporting(),
          ...(isObject(item) ? (item as Partial<SupportingDraft>) : {}),
          image: readImage(isObject(item) ? item.image : null),
        }))
      : [createEmptySupporting()],
    startSettings: startSettings
      ? startSettings.map((item) => ({
          ...createStartSettingDraft(),
          ...(isObject(item)
            ? (item as Partial<GeneralStoryStartSettingDraft>)
            : {}),
        }))
      : [createStartSettingDraft()],
    mainEvents: Array.isArray(payload.mainEvents)
      ? payload.mainEvents.map((item) => ({
          ...createMainEventDraft(),
          ...(isObject(item) ? item : {}),
        }))
      : [],
    genres:
      isObject(payload.genres) && Array.isArray(payload.genres.selected)
        ? {
            ...EMPTY_GENRE_SELECTION,
            ...(payload.genres as Partial<GeneralStoryGenreSelection>),
          }
        : EMPTY_GENRE_SELECTION,
    description:
      typeof payload.description === 'string' ? payload.description : '',
    visibility: payload.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
  };
}
