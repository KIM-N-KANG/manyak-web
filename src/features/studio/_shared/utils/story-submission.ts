import type { CreateGeneralStoryRequestVisibility } from '@/api/generated/models';

/** 일반 제작 검수 제출본을 읽는 파서. 생성 타입이 느슨한 객체라 등록 흐름과 제작 탭이 쓰는 값만 직접 좁힌다. */

export type StorySubmissionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'FAILED';

/** 제출본에 실린 이미지다. 객체 키는 재제출에, 미리보기 URL은 화면에 쓴다. */
export type StorySubmissionImage = {
  objectKey: string;
  imageUrl: string | null;
};

/** 제출본의 입력(서버가 복원한 등록 폼)이다. */
export type StorySubmissionPayload = {
  title: string;
  oneLineIntro: string;
  description: string;
  genres: string[];
  /** 기본 주인공 이름이다. 없으면 빈 문자열이다. */
  protagonistName: string;
  storySettings: {
    worldSetting: string;
    characterSetting: string;
    userRoleSetting: string;
    ruleSetting: string;
  };
  startSettings: {
    name: string;
    prologue: string;
    startSituation: string;
    suggestedInputs: string[];
    endings: {
      name: string;
      minTurns: number | null;
      achievementCondition: string;
      epilogue: string;
    }[];
  }[];
  mainEvents: { name: string; description: string; keySentence: string }[];
  visibility: CreateGeneralStoryRequestVisibility;
  cover: StorySubmissionImage | null;
  characters: {
    name: string;
    /** 인물 소개다. 없으면 빈 문자열이다. */
    description: string;
    images: StorySubmissionImage[];
  }[];
};

/** 검수가 칸 하나에 남긴 내용 위반이다. `path`는 요청 필드 경로(`startSettings[0].prologue` 등)다. */
export type StorySubmissionIssue = { path: string; reason: string };

/** 검수가 이미지 하나에 남긴 실행 오류다. */
export type StorySubmissionImageError = { path: string; errorCode: string };

export type StorySubmission = {
  submissionId: string;
  kind: 'CREATE' | 'UPDATE';
  status: StorySubmissionStatus;
  storyId: string | null;
  createdAt: string | null;
  errorCode: string | null;
  issues: StorySubmissionIssue[];
  imageErrors: StorySubmissionImageError[];
  payload: StorySubmissionPayload;
};

type Loose = Record<string, unknown>;

/**
 * 객체면 그대로, 아니면 빈 객체를 반환한다.
 *
 * @param value 읽을 값
 * @returns 필드를 읽을 수 있는 객체
 */
const asObject = (value: unknown): Loose =>
  value && typeof value === 'object' ? (value as Loose) : {};

/**
 * 배열이면 그대로, 아니면 빈 배열을 반환한다.
 *
 * @param value 읽을 값
 * @returns 배열
 */
const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

/**
 * 문자열이면 그대로, 아니면 빈 문자열을 반환한다.
 *
 * @param value 읽을 값
 * @returns 문자열
 */
const asText = (value: unknown) => (typeof value === 'string' ? value : '');

/**
 * 비어 있지 않은 문자열이면 그대로, 아니면 null을 반환한다.
 *
 * @param value 읽을 값
 * @returns 문자열 또는 null
 */
const asNullableText = (value: unknown) =>
  typeof value === 'string' && value ? value : null;

const STATUSES: StorySubmissionStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'FAILED',
];

/**
 * 객체 키와 미리보기 URL로 제출본 이미지를 만든다.
 *
 * @param objectKey 객체 키
 * @param imageUrl 미리보기 URL
 * @returns 이미지. 객체 키가 없으면 null
 */
function readImage(
  objectKey: unknown,
  imageUrl: unknown,
): StorySubmissionImage | null {
  const key = asNullableText(objectKey);

  return key ? { objectKey: key, imageUrl: asNullableText(imageUrl) } : null;
}

/**
 * 제출본의 입력을 읽는다. 빠진 값은 빈 값으로 채운다.
 *
 * @param value 응답의 `payload`
 * @returns 제출본 입력
 */
export function readStorySubmissionPayload(
  value: unknown,
): StorySubmissionPayload {
  const payload = asObject(value);
  const settings = asObject(payload.storySettings);

  return {
    title: asText(payload.title),
    oneLineIntro: asText(payload.oneLineIntro),
    description: asText(payload.description),
    genres: asArray(payload.genres).filter(
      (genre): genre is string => typeof genre === 'string',
    ),
    protagonistName: asText(payload.protagonistName),
    storySettings: {
      worldSetting: asText(settings.worldSetting),
      characterSetting: asText(settings.characterSetting),
      userRoleSetting: asText(settings.userRoleSetting),
      ruleSetting: asText(settings.ruleSetting),
    },
    startSettings: asArray(payload.startSettings).map((item) => {
      const setting = asObject(item);

      return {
        name: asText(setting.name),
        prologue: asText(setting.prologue),
        startSituation: asText(setting.startSituation),
        suggestedInputs: asArray(setting.suggestedInputs).map(asText),
        endings: asArray(setting.endings).map((endingItem) => {
          const ending = asObject(endingItem);
          const requirement = asObject(ending.requirement);

          return {
            name: asText(ending.name),
            minTurns:
              typeof requirement.minTurns === 'number'
                ? requirement.minTurns
                : null,
            achievementCondition: asText(requirement.achievementCondition),
            epilogue: asText(ending.epilogue),
          };
        }),
      };
    }),
    mainEvents: asArray(payload.mainEvents).map((item) => {
      const event = asObject(item);

      return {
        name: asText(event.name),
        description: asText(event.description),
        keySentence: asText(event.keySentence),
      };
    }),
    visibility: payload.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
    cover: readImage(payload.thumbnailObjectKey, payload.thumbnailUrl),
    characters: asArray(payload.characters).map((item) => {
      const character = asObject(item);

      return {
        name: asText(character.name),
        description: asText(character.description),
        images: asArray(character.images).flatMap((imageItem) => {
          const image = asObject(imageItem);
          const read = readImage(image.objectKey, image.imageUrl);

          return read ? [read] : [];
        }),
      };
    }),
  };
}

/**
 * 제출본 상세(또는 목록 항목) 응답을 읽는다.
 *
 * @param data 응답 본문
 * @returns 제출본. id나 상태를 읽지 못하면 null
 */
export function readStorySubmission(data: unknown): StorySubmission | null {
  const item = asObject(data);
  const submissionId = asNullableText(item.submissionId);
  const status = STATUSES.find((value) => value === item.status);

  if (!submissionId || !status) return null;

  return {
    submissionId,
    kind: item.kind === 'UPDATE' ? 'UPDATE' : 'CREATE',
    status,
    storyId: asNullableText(item.storyId),
    createdAt: asNullableText(item.createdAt),
    errorCode: asNullableText(item.errorCode),
    issues: asArray(item.issues).flatMap((issueItem) => {
      const issue = asObject(issueItem);
      const path = asText(issue.path);

      return path ? [{ path, reason: asText(issue.reason) }] : [];
    }),
    imageErrors: asArray(item.imageErrors).flatMap((errorItem) => {
      const error = asObject(errorItem);
      const path = asText(error.path);

      return path ? [{ path, errorCode: asText(error.errorCode) }] : [];
    }),
    payload: readStorySubmissionPayload(item.payload),
  };
}

/**
 * 제출본 목록 응답에서 제작 탭에 보일 신규 등록 제출본만 고른다. 승인된 것과 수정(UPDATE) 제출본은 뺀다.
 *
 * @param data 목록 응답 본문
 * @returns 검토 중·반려·실패한 신규 등록 제출본
 */
export function readCreateSubmissions(data: unknown): StorySubmission[] {
  return asArray(data).flatMap((item) => {
    const submission = readStorySubmission(item);

    return submission &&
      submission.kind === 'CREATE' &&
      submission.status !== 'APPROVED'
      ? [submission]
      : [];
  });
}
