import type { SimpleStoryTagListItemResponse } from '@/api/generated/models';
import type { GeneralStoryDraftSnapshot } from '@/features/studio/_shared/utils/general-story-draft';
import type {
  StorySubmissionImage,
  StorySubmissionPayload,
} from '@/features/studio/_shared/utils/story-submission';
import type { DraftImage } from '@/features/studio/general/hooks/use-draft-image-picker';
import {
  type GeneralStoryCharacter,
  parseCharacterSetting,
  parseUserRoleSetting,
} from '@/features/studio/general/utils/character-settings';
import type { GeneralStoryGenreSelection } from '@/features/studio/general/utils/genre-selection';
import { createStartSettingDraft } from '@/features/studio/general/utils/start-setting-draft';
import { parseStorySettingTexts } from '@/features/studio/general/utils/story-setting-sections';

/** 일반 제작 폼의 초기 입력이다. 임시 저장본과 달리 이미지는 화면에 바로 쓰는 형태다. */
export type GeneralStoryFormInitial = Omit<
  GeneralStoryDraftSnapshot,
  'cover' | 'supporting'
> & {
  cover: DraftImage | null;
  supporting: (GeneralStoryCharacter & {
    id: string;
    image: DraftImage | null;
  })[];
};

/**
 * 제출본 이미지를 폼 이미지로 바꾼다. 파일이 없어 미리보기는 서버 URL을 쓴다.
 *
 * @param image 제출본 이미지
 * @returns 폼 이미지. 없으면 null
 */
const toFormImage = (image: StorySubmissionImage | null | undefined) =>
  image
    ? {
        objectKey: image.objectKey,
        previewUrl: image.imageUrl ?? '',
        blob: null,
      }
    : null;

/**
 * 장르 이름을 폼의 장르 선택으로 되돌린다. 제공 장르와 이름이 같으면 그 태그를, 아니면 직접 추가한 장르로 둔다.
 *
 * @param names 제출본의 장르 이름
 * @param tags 제공 장르 태그 목록
 * @returns 장르 선택
 */
function toGenreSelection(
  names: string[],
  tags: SimpleStoryTagListItemResponse[],
): GeneralStoryGenreSelection {
  const selection: GeneralStoryGenreSelection = {
    selected: [],
    customTags: [],
  };

  for (const name of names) {
    const tag = tags.find(
      (item) => item.category === 'GENRE' && item.name === name,
    );

    if (tag?.id !== undefined) {
      selection.selected.push({ kind: 'tag', id: tag.id });
    } else {
      const id = crypto.randomUUID();

      selection.customTags.push({ id, name });
      selection.selected.push({ kind: 'custom', id });
    }
  }

  return selection;
}

/**
 * 검수 제출본의 입력을 일반 제작 폼의 초기 입력으로 바꾼다. 설정 글은 수정 폼과 같은 규칙으로 칸에 나누고,
 * 주변 인물 이미지는 같은 이름(없으면 같은 순서)의 인물에 붙인다.
 *
 * @param payload 제출본 입력
 * @param tags 제공 장르 태그 목록
 * @returns 폼 초기 입력
 */
export function submissionToFormInitial(
  payload: StorySubmissionPayload,
  tags: SimpleStoryTagListItemResponse[],
): GeneralStoryFormInitial {
  const { values, descriptionRatio } = parseStorySettingTexts(
    payload.storySettings.worldSetting,
    payload.storySettings.ruleSetting,
  );
  const parsedSupporting = parseCharacterSetting(
    payload.storySettings.characterSetting,
  );
  const supportingBase: GeneralStoryCharacter[] =
    parsedSupporting.length > 0
      ? parsedSupporting
      : payload.characters.map(({ name }) => ({
          name,
          gender: null,
          feature: '',
        }));
  const supporting = (
    supportingBase.length > 0
      ? supportingBase
      : [{ name: '', gender: null, feature: '' }]
  ).map((character, index) => {
    const images =
      payload.characters.find(
        ({ name }) => name.trim() === character.name.trim(),
      )?.images ?? payload.characters[index]?.images;

    return {
      ...character,
      id: crypto.randomUUID(),
      image: toFormImage(images?.[0]),
    };
  });

  return {
    texts: {
      title: payload.title,
      oneLineIntro: payload.oneLineIntro,
      world: values.world,
      progression: values.progression,
    },
    cover: toFormImage(payload.cover),
    descriptionRatio,
    protagonist: parseUserRoleSetting(payload.storySettings.userRoleSetting),
    supporting,
    startSettings:
      payload.startSettings.length === 0
        ? [createStartSettingDraft()]
        : payload.startSettings.map((setting) => ({
            id: crypto.randomUUID(),
            name: setting.name,
            prologue: setting.prologue,
            situation: setting.startSituation,
            suggestedInputs: [0, 1, 2].map(
              (index) => setting.suggestedInputs[index] ?? '',
            ) as [string, string, string],
            endings: setting.endings.map((ending) => ({
              id: crypto.randomUUID(),
              name: ending.name,
              minTurns: ending.minTurns === null ? '' : String(ending.minTurns),
              condition: ending.achievementCondition,
              epilogue: ending.epilogue,
            })),
          })),
    mainEvents: payload.mainEvents.map((event) => ({
      id: crypto.randomUUID(),
      ...event,
    })),
    genres: toGenreSelection(payload.genres, tags),
    description: payload.description,
    visibility: payload.visibility,
  };
}
