import type {
  GeneralCharacterImageInput,
  GeneralCharacterInput,
  SimpleStoryTagListItemResponse,
  StoryEditFormResponse,
  UpdateStoryRequest,
} from '@/api/generated/models';
import {
  readStorySubmission,
  readStorySubmissionPayload,
  type StorySubmission,
} from '@/features/studio/_shared/utils/story-submission';
import {
  buildGeneralStoryRequest,
  CHARACTER_IMAGE_SUFFIX,
  resolveGenreNames,
  toCharacterDescription,
} from '@/features/studio/general/utils/build-general-story-request';
import {
  type GeneralStoryFormInitial,
  submissionToFormInitial,
} from '@/features/studio/general/utils/submission-form';

/** 수정 폼을 연 시점의 서버 인물이다. 이미지는 기존 이미지면 id, 승인 전 새 이미지면 객체 키로 가리킨다. */
type StoryEditServerCharacter = {
  /** 이 인물과 짝지은 폼 주변 인물의 id다. 폼에 없는 인물이면 null이다. */
  formId: string | null;
  id: string | null;
  name: string;
  images: {
    id: string | null;
    objectKey: string | null;
    imageName: string;
    imageUrl: string;
  }[];
};

/** 수정 요청을 만들 때 다시 보는 서버 값이다. */
export type StoryEditBase = {
  /** 서버에 있는 시작 설정 id다. 폼 항목 id가 여기 있으면 기존 시작 설정으로 보낸다. */
  startSettingIds: string[];
  characters: StoryEditServerCharacter[];
  /** 폼을 연 시점의 입력으로 만든 요청 후보다. 이것과 달라진 필드만 보낸다. */
  baseline: UpdateStoryRequest;
  /**
   * 반려·실패한 미승인 수정 제출본이 있는지다. 다시 PATCH하면 그 제출본을 덮어쓰므로, 폼에 합쳐진
   * 제출본 입력을 잃지 않게 바뀌지 않은 필드도 모두 보낸다.
   */
  sendAll: boolean;
};

export type StoryEdit = {
  initial: GeneralStoryFormInitial;
  base: StoryEditBase;
  /** 미승인 수정 제출본이다. 없거나 승인됐으면 null이다. */
  submission: StorySubmission | null;
};

/** 수정 본문에 실을 수 있는 필드다. */
const EDIT_FIELDS = [
  'title',
  'oneLineIntro',
  'description',
  'genres',
  'storySettings',
  'startSettings',
  'mainEvents',
  'visibility',
  'thumbnailObjectKey',
  'characters',
] as const satisfies readonly (keyof UpdateStoryRequest)[];

/**
 * 서버 이미지를 요청 항목으로 바꾼다. 기존 이미지는 id로, 승인 전 새 이미지는 객체 키로 남긴다.
 *
 * @param image 서버 이미지
 * @returns 요청의 이미지 항목
 */
const toImageInput = (
  image: StoryEditServerCharacter['images'][number],
): GeneralCharacterImageInput =>
  image.id
    ? { id: image.id }
    : { objectKey: image.objectKey, imageName: image.imageName };

/**
 * 폼 입력을 수정 요청의 전체 후보로 만든다. 글은 등록 요청과 같은 규칙으로 만들고, 시작 설정과 인물에
 * 서버 id를 붙인다. 인물마다 이미지를 모두 실어, 바꾼 대표 이미지만 새 객체 키로 갈아끼우고 나머지는 남긴다.
 * 대표 이미지를 지우면 그 이미지만 빼고 나머지는 남긴다.
 * 인물 소개는 늘 실어 비운 소개를 빈 문자열로 지운다. 폼에 없는 서버 인물은 소개 없이 그대로 실어 인물 목록을
 * 보낼 때 인물과 소개가 지워지지 않게 한다.
 *
 * @param form 폼 입력
 * @param genreNames 고른 순서대로 놓인 장르 이름
 * @param base 서버 시작 설정 id와 인물
 * @returns 수정 요청 후보. 바뀐 필드만 고르기 전의 전체 값이다
 */
export function buildStoryEditCandidate(
  form: GeneralStoryFormInitial,
  genreNames: string[],
  base: Pick<StoryEditBase, 'startSettingIds' | 'characters'>,
): UpdateStoryRequest {
  const request = buildGeneralStoryRequest(
    {
      ...form,
      coverObjectKey: null,
      supporting: form.supporting.map((character) => ({
        ...character,
        imageObjectKey: null,
      })),
    },
    genreNames,
  );
  const supporting: GeneralCharacterInput[] = form.supporting.map(
    (character) => {
      const name = character.name.trim();
      const server = base.characters.find(
        ({ formId }) => formId === character.id,
      );
      const kept = (server?.images ?? []).map(toImageInput);
      const uploadedKey =
        character.image?.objectKey &&
        character.image.objectKey !== (server?.images[0]?.objectKey ?? '')
          ? character.image.objectKey
          : null;

      return {
        ...(server?.id && { id: server.id }),
        name,
        description: toCharacterDescription(character.description),
        images: uploadedKey
          ? [
              {
                objectKey: uploadedKey,
                imageName: `${name}_${CHARACTER_IMAGE_SUFFIX}`,
              },
              ...kept.slice(1),
            ]
          : character.image
            ? kept
            : kept.slice(1),
      };
    },
  );
  const unmatched: GeneralCharacterInput[] = base.characters
    .filter(({ formId }) => formId === null)
    .map(({ id, name, images }) => ({
      ...(id && { id }),
      name,
      images: images.map(toImageInput),
    }));

  return {
    ...request,
    description: request.description ?? '',
    startSettings: request.startSettings?.map((setting, index) => {
      const { id } = form.startSettings[index];

      return base.startSettingIds.includes(id) ? { id, ...setting } : setting;
    }),
    thumbnailObjectKey: form.cover?.objectKey || null,
    characters: [...supporting, ...unmatched],
  };
}

/**
 * 수정 PATCH 본문을 만든다. 폼을 연 시점과 달라진 필드만 실어 보내지 않은 필드는 서버가 그대로 두고,
 * 미승인 제출본을 덮어쓰는 경우에는 모든 필드를 싣는다. null은 서버에서 미전송과 같아 싣지 않는다.
 *
 * @param candidate 현재 폼으로 만든 요청 후보
 * @param baseline 폼을 연 시점의 요청 후보
 * @param sendAll 바뀌지 않은 필드도 모두 실을지
 * @returns PATCH 본문. 바뀐 것이 없으면 빈 객체
 */
export function buildStoryEditRequest(
  candidate: UpdateStoryRequest,
  baseline: UpdateStoryRequest,
  sendAll: boolean,
): UpdateStoryRequest {
  const request: UpdateStoryRequest = {};

  for (const field of EDIT_FIELDS) {
    const value = candidate[field];

    if (value === null || value === undefined) continue;

    if (sendAll || JSON.stringify(value) !== JSON.stringify(baseline[field])) {
      Object.assign(request, { [field]: value });
    }
  }

  return request;
}

/**
 * 수정 폼 응답을 폼 초기 입력과 요청에 쓸 서버 값으로 나눈다. 설정 글과 장르는 제출본 복원과 같은 규칙으로
 * 칸에 나누고, 시작 설정과 짝지은 주변 인물의 폼 id는 서버 id로 둬 요청에서 같은 항목을 가리키게 한다.
 * 주변 인물은 이름이 같은 서버 인물과 짝지어 그 첫 이미지를 보인다. 기존 이미지의 객체 키는 빈 문자열이다.
 *
 * @param data 수정 폼 응답
 * @param tags 제공 장르 태그 목록
 * @returns 폼 초기 입력, 서버 값, 미승인 제출본
 */
export function readStoryEdit(
  data: StoryEditFormResponse,
  tags: SimpleStoryTagListItemResponse[],
): StoryEdit {
  const parsed = submissionToFormInitial(
    readStorySubmissionPayload(data),
    tags,
  );
  const characters: StoryEditServerCharacter[] = (data.characters ?? []).map(
    (character) => ({
      formId: null,
      id: character.id ?? null,
      name: character.name ?? '',
      images: (character.images ?? []).map((image) => ({
        id: image.id ?? null,
        objectKey: image.objectKey ?? null,
        imageName: image.imageName ?? '',
        imageUrl: image.imageUrl ?? '',
      })),
    }),
  );
  const supporting = parsed.supporting.map((character) => {
    const server = characters.find(
      ({ formId, name }) =>
        formId === null && name.trim() === character.name.trim(),
    );

    // 짝이 없는 인물은 새 인물이라 순서로 붙은 다른 서버 인물의 소개를 비운다.
    if (!server) return { ...character, description: '', image: null };

    server.formId = server.id ?? character.id;

    const first = server.images[0];

    return {
      ...character,
      id: server.formId,
      image: first
        ? {
            objectKey: first.objectKey ?? '',
            previewUrl: first.imageUrl,
            blob: null,
          }
        : null,
    };
  });
  const initial: GeneralStoryFormInitial = {
    ...parsed,
    cover:
      parsed.cover ??
      (data.thumbnailUrl
        ? { objectKey: '', previewUrl: data.thumbnailUrl, blob: null }
        : null),
    supporting,
    startSettings: parsed.startSettings.map((setting, index) => ({
      ...setting,
      id: data.startSettings?.[index]?.id ?? setting.id,
    })),
  };
  const startSettingIds = (data.startSettings ?? []).flatMap(({ id }) =>
    id ? [id] : [],
  );
  const read = data.submission
    ? readStorySubmission({ ...data.submission, kind: 'UPDATE', payload: data })
    : null;
  const submission = read && read.status !== 'APPROVED' ? read : null;

  return {
    initial,
    submission,
    base: {
      startSettingIds,
      characters,
      baseline: buildStoryEditCandidate(
        initial,
        resolveGenreNames(initial.genres, tags) ?? [],
        { startSettingIds, characters },
      ),
      sendAll:
        submission?.status === 'REJECTED' || submission?.status === 'FAILED',
    },
  };
}
