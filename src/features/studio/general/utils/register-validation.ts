import {
  GENERAL_STORY_CHARACTER_COPY,
  GENERAL_STORY_DUPLICATE_NAME_ERROR,
  GENERAL_STORY_EVENT_COPY,
  GENERAL_STORY_REGISTER_COPY,
  GENERAL_STORY_REGISTER_ERROR_COPY,
  GENERAL_STORY_START_COPY,
  GENERAL_STORY_TABS,
  GENERAL_STORY_TEXT_FIELDS,
  type GeneralStoryTab,
  type GeneralStoryTextField,
} from '@/features/studio/general/constants';
import type { GeneralStoryCharacter } from '@/features/studio/general/utils/character-settings';
import {
  getDuplicateCharacterNameIds,
  getDuplicateNameIds,
} from '@/features/studio/general/utils/duplicate-name';
import {
  getMinLengthError,
  getRequiredError,
} from '@/features/studio/general/utils/general-story-text-error';
import type { GeneralStoryMainEventDraft } from '@/features/studio/general/utils/main-event-draft';
import type { GeneralStoryStartSettingDraft } from '@/features/studio/general/utils/start-setting-draft';

/** 등록 가능 여부를 판정하는 데 필요한 탭별 입력이다. */
export type GeneralStoryRegisterForm = {
  texts: Record<GeneralStoryTextField, string>;
  protagonist: GeneralStoryCharacter;
  supporting: (GeneralStoryCharacter & { id: string; description: string })[];
  startSettings: GeneralStoryStartSettingDraft[];
  mainEvents: GeneralStoryMainEventDraft[];
  genreCount: number;
  description: string;
};

/** 등록하기를 눌렀을 때 칸 하나에 보이는 오류다. */
export type GeneralStoryRegisterError = {
  /** 오류를 보일 칸이다. 칸 쪽은 `REGISTER_ERROR_KEY`로 같은 값을 만들어 찾는다. */
  key: string;
  tab: GeneralStoryTab;
  message: string;
  /** 오류 칸이 든 시작 상황이다. 선택하지 않은 시작 상황의 칩을 표시할 때 쓴다. */
  startSettingId?: string;
  /** 오류 칸이 든 접는 항목(`CollapsibleListItem`)의 id다. 접혀 있으면 펼친다. */
  collapsibleId?: string;
};

type CharacterPart = 'name' | 'gender' | 'description' | 'feature';

export const REGISTER_ERROR_KEY = {
  text: (field: GeneralStoryTextField) => field,
  protagonist: (part: CharacterPart) => `protagonist.${part}`,
  supporting: (id: string, part: CharacterPart) => `supporting.${id}.${part}`,
  start: (id: string, part: 'name' | 'prologue' | 'situation') =>
    `start.${id}.${part}`,
  suggested: (id: string, index: number) => `start.${id}.suggested.${index}`,
  ending: (id: string, part: 'name' | 'minTurns' | 'condition' | 'epilogue') =>
    `ending.${id}.${part}`,
  event: (id: string, part: 'name' | 'description' | 'keySentence') =>
    `event.${id}.${part}`,
  genre: 'genre',
  description: 'description',
  cover: 'cover',
  supportingImage: (id: string) => `supporting.${id}.image`,
};

/**
 * 글 칸 하나의 오류 문구를 반환한다. 비었으면 필수일 때만 입력을 요청하고, 쓴 글은 최소 글자 수와 이름 중복을 차례로 본다.
 *
 * @param label 오류 문구에 넣을 칸 이름
 * @param value 입력값
 * @param options 필수 여부와 이름 중복 여부
 * @returns 오류 문구, 없으면 null
 */
function getTextError(
  label: string,
  value: string,
  { required = true, duplicate = false } = {},
) {
  if (!value.trim()) {
    return required ? getRequiredError(label) : null;
  }

  return (
    getMinLengthError(label, value) ??
    (duplicate ? GENERAL_STORY_DUPLICATE_NAME_ERROR : null)
  );
}

/** 주인공 자리에 이름을 넣는 토큰이다. 조사 표기(`{username}이(가)` 등)도 이 글자로 시작한다. */
const NAME_TOKEN = '{username}';

/**
 * 주인공 이름 칸을 뺀 글 입력에 이름 토큰이 있는지 반환한다. 서버는 토큰이 있는 글을 기본 주인공 이름 없이 받지 않는다.
 *
 * @param form 탭별 입력
 * @returns 토큰이 있으면 true
 */
export function usesNameToken({
  protagonist,
  ...rest
}: GeneralStoryRegisterForm) {
  return (
    protagonist.feature.includes(NAME_TOKEN) ||
    JSON.stringify(rest).includes(NAME_TOKEN)
  );
}

/**
 * 등록하기를 눌렀을 때 보일 칸별 오류를 탭 순서와 탭 안의 칸 순서대로 반환한다. 비어 있으면 등록할 수 있다.
 *
 * @param form 탭별 입력
 * @returns 칸별 오류 목록
 */
export function getRegisterErrors(form: GeneralStoryRegisterForm) {
  const {
    texts,
    protagonist,
    supporting,
    startSettings,
    mainEvents,
    genreCount,
    description,
  } = form;
  const errors: GeneralStoryRegisterError[] = [];
  const push = (
    error: Omit<GeneralStoryRegisterError, 'message'>,
    message: string | null,
  ) => {
    if (message) {
      errors.push({ ...error, message });
    }
  };
  const { nameLabel, featureLabel, introductionLabel } =
    GENERAL_STORY_CHARACTER_COPY;
  const { ending } = GENERAL_STORY_START_COPY;
  const duplicateCharacterIds = getDuplicateCharacterNameIds(
    protagonist.name,
    supporting,
  );
  const duplicateEventIds = getDuplicateNameIds(mainEvents);

  GENERAL_STORY_TABS.forEach(({ value: tab, fields }) => {
    fields.forEach((field) =>
      push(
        { key: REGISTER_ERROR_KEY.text(field), tab },
        getTextError(GENERAL_STORY_TEXT_FIELDS[field].label, texts[field]),
      ),
    );
  });

  push(
    { key: REGISTER_ERROR_KEY.protagonist('name'), tab: 'protagonist' },
    !protagonist.name.trim() && usesNameToken(form)
      ? GENERAL_STORY_REGISTER_ERROR_COPY.protagonistNameForToken
      : null,
  );
  push(
    { key: REGISTER_ERROR_KEY.protagonist('gender'), tab: 'protagonist' },
    protagonist.gender ? null : GENERAL_STORY_REGISTER_ERROR_COPY.gender,
  );
  push(
    { key: REGISTER_ERROR_KEY.protagonist('feature'), tab: 'protagonist' },
    getTextError(featureLabel, protagonist.feature),
  );

  supporting.forEach((character) => {
    const target = {
      tab: 'supporting' as const,
      collapsibleId: `general-story-supporting-${character.id}`,
    };

    push(
      { ...target, key: REGISTER_ERROR_KEY.supporting(character.id, 'name') },
      getTextError(nameLabel, character.name, {
        duplicate: duplicateCharacterIds.has(character.id),
      }),
    );
    push(
      { ...target, key: REGISTER_ERROR_KEY.supporting(character.id, 'gender') },
      character.gender ? null : GENERAL_STORY_REGISTER_ERROR_COPY.gender,
    );
    push(
      {
        ...target,
        key: REGISTER_ERROR_KEY.supporting(character.id, 'description'),
      },
      getTextError(introductionLabel, character.description, {
        required: false,
      }),
    );
    push(
      {
        ...target,
        key: REGISTER_ERROR_KEY.supporting(character.id, 'feature'),
      },
      getTextError(featureLabel, character.feature, { required: false }),
    );
  });

  startSettings.forEach((startSetting) => {
    const { id } = startSetting;
    const target = { tab: 'start' as const, startSettingId: id };
    const duplicateEndingIds = getDuplicateNameIds(startSetting.endings);

    push(
      { ...target, key: REGISTER_ERROR_KEY.start(id, 'name') },
      getTextError(GENERAL_STORY_START_COPY.name.label, startSetting.name),
    );
    push(
      { ...target, key: REGISTER_ERROR_KEY.start(id, 'prologue') },
      getTextError(
        GENERAL_STORY_START_COPY.prologue.label,
        startSetting.prologue,
      ),
    );
    push(
      { ...target, key: REGISTER_ERROR_KEY.start(id, 'situation') },
      getTextError(
        GENERAL_STORY_START_COPY.situation.label,
        startSetting.situation,
      ),
    );
    startSetting.suggestedInputs.forEach((value, index) =>
      push(
        { ...target, key: REGISTER_ERROR_KEY.suggested(id, index) },
        value.trim()
          ? getMinLengthError(
              GENERAL_STORY_START_COPY.suggestedInput.label,
              value,
            )
          : GENERAL_STORY_REGISTER_ERROR_COPY.suggestedInput,
      ),
    );
    startSetting.endings.forEach((endingItem) => {
      const endingTarget = {
        ...target,
        collapsibleId: `general-story-ending-${endingItem.id}`,
      };

      push(
        {
          ...endingTarget,
          key: REGISTER_ERROR_KEY.ending(endingItem.id, 'name'),
        },
        getTextError(ending.name.label, endingItem.name, {
          duplicate: duplicateEndingIds.has(endingItem.id),
        }),
      );
      push(
        {
          ...endingTarget,
          key: REGISTER_ERROR_KEY.ending(endingItem.id, 'minTurns'),
        },
        endingItem.minTurns ? null : getRequiredError(ending.minTurns.label),
      );
      push(
        {
          ...endingTarget,
          key: REGISTER_ERROR_KEY.ending(endingItem.id, 'condition'),
        },
        getTextError(ending.condition.label, endingItem.condition),
      );
      push(
        {
          ...endingTarget,
          key: REGISTER_ERROR_KEY.ending(endingItem.id, 'epilogue'),
        },
        getTextError(ending.epilogue.label, endingItem.epilogue),
      );
    });
  });

  mainEvents.forEach((mainEvent) => {
    const target = {
      tab: 'event' as const,
      collapsibleId: `general-story-event-${mainEvent.id}`,
    };

    push(
      { ...target, key: REGISTER_ERROR_KEY.event(mainEvent.id, 'name') },
      getTextError(GENERAL_STORY_EVENT_COPY.name.label, mainEvent.name, {
        duplicate: duplicateEventIds.has(mainEvent.id),
      }),
    );
    push(
      { ...target, key: REGISTER_ERROR_KEY.event(mainEvent.id, 'description') },
      getTextError(
        GENERAL_STORY_EVENT_COPY.description.label,
        mainEvent.description,
      ),
    );
    push(
      { ...target, key: REGISTER_ERROR_KEY.event(mainEvent.id, 'keySentence') },
      getTextError(
        GENERAL_STORY_EVENT_COPY.keySentence.label,
        mainEvent.keySentence,
      ),
    );
  });

  push(
    { key: REGISTER_ERROR_KEY.genre, tab: 'publish' },
    genreCount > 0 ? null : GENERAL_STORY_REGISTER_ERROR_COPY.genre,
  );
  push(
    { key: REGISTER_ERROR_KEY.description, tab: 'publish' },
    getTextError(GENERAL_STORY_REGISTER_COPY.description.label, description, {
      required: false,
    }),
  );

  return errors;
}
