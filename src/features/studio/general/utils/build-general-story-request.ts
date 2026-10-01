import type {
  CreateGeneralStoryRequest,
  CreateGeneralStoryRequestVisibility,
  SimpleStoryTagListItemResponse,
} from '@/api/generated/models';
import {
  buildCharacterSetting,
  buildUserRoleSetting,
  type GeneralStoryCharacter,
} from '@/features/studio/general/utils/character-settings';
import type { GeneralStoryGenreSelection } from '@/features/studio/general/utils/genre-selection';
import type { GeneralStoryMainEventDraft } from '@/features/studio/general/utils/main-event-draft';
import type { GeneralStoryStartSettingDraft } from '@/features/studio/general/utils/start-setting-draft';
import { buildStorySettingTexts } from '@/features/studio/general/utils/story-setting-sections';

/** 주변 인물 이미지 이름의 접미다. 간편 제작 대표 이미지와 같은 접미를 쓴다. */
export const CHARACTER_IMAGE_SUFFIX = '기본';

export type GeneralStoryRequestInput = {
  texts: {
    title: string;
    oneLineIntro: string;
    world: string;
    progression: string;
  };
  coverObjectKey: string | null;
  descriptionRatio: number;
  protagonist: GeneralStoryCharacter;
  supporting: (GeneralStoryCharacter & { imageObjectKey: string | null })[];
  startSettings: GeneralStoryStartSettingDraft[];
  mainEvents: GeneralStoryMainEventDraft[];
  genres: GeneralStoryGenreSelection;
  description: string;
  visibility: CreateGeneralStoryRequestVisibility;
};

/**
 * 고른 장르를 고른 순서대로 이름으로 바꾼다.
 *
 * @param genres 장르 선택
 * @param tags 제공 장르 태그 목록
 * @returns 장르 이름 목록. 제공 장르의 이름을 찾지 못하면 null
 */
export function resolveGenreNames(
  genres: GeneralStoryGenreSelection,
  tags: SimpleStoryTagListItemResponse[],
): string[] | null {
  const names = genres.selected.map((key) =>
    key.kind === 'tag'
      ? tags.find(({ id }) => id === key.id)?.name
      : genres.customTags.find(({ id }) => id === key.id)?.name,
  );

  return names.every((name) => name !== undefined)
    ? names.map((name) => name.trim())
    : null;
}

/**
 * 일반 제작 폼 입력을 등록 요청 본문으로 바꾼다. 글은 앞뒤 공백을 빼고, 폼에서만 쓰는 id는 싣지 않는다.
 *
 * @param input 폼 입력
 * @param genreNames 고른 순서대로 놓인 장르 이름
 * @returns `POST /stories/general` 요청 본문
 */
export function buildGeneralStoryRequest(
  input: GeneralStoryRequestInput,
  genreNames: string[],
): CreateGeneralStoryRequest {
  const description = input.description.trim();

  return {
    title: input.texts.title.trim(),
    oneLineIntro: input.texts.oneLineIntro.trim(),
    ...(description && { description }),
    genres: genreNames,
    storySettings: {
      ...buildStorySettingTexts(input.texts, input.descriptionRatio),
      userRoleSetting: buildUserRoleSetting(input.protagonist),
      characterSetting: buildCharacterSetting(input.supporting),
    },
    startSettings: input.startSettings.map((setting) => ({
      name: setting.name.trim(),
      prologue: setting.prologue.trim(),
      startSituation: setting.situation.trim(),
      suggestedInputs: setting.suggestedInputs.map((text) => text.trim()),
      endings: setting.endings.map((ending) => ({
        name: ending.name.trim(),
        requirement: {
          minTurns: Number(ending.minTurns),
          achievementCondition: ending.condition.trim(),
        },
        epilogue: ending.epilogue.trim(),
      })),
    })),
    mainEvents: input.mainEvents.map((event) => ({
      name: event.name.trim(),
      description: event.description.trim(),
      keySentence: event.keySentence.trim(),
    })),
    visibility: input.visibility,
    thumbnailObjectKey: input.coverObjectKey,
    characters: input.supporting.map(({ name, imageObjectKey }) => ({
      name: name.trim(),
      images: imageObjectKey
        ? [
            {
              objectKey: imageObjectKey,
              imageName: `${name.trim()}_${CHARACTER_IMAGE_SUFFIX}`,
            },
          ]
        : [],
    })),
  };
}
