import type {
  StorySubmissionImageError,
  StorySubmissionIssue,
} from '@/features/studio/_shared/utils/story-submission';
import {
  GENERAL_STORY_REVIEW_COPY,
  GENERAL_STORY_TABS,
  type GeneralStoryTab,
  type GeneralStoryTextField,
} from '@/features/studio/general/constants';
import type { GeneralStoryCharacter } from '@/features/studio/general/utils/character-settings';
import type { GeneralStoryGenreSelection } from '@/features/studio/general/utils/genre-selection';
import type { GeneralStoryMainEventDraft } from '@/features/studio/general/utils/main-event-draft';
import {
  type GeneralStoryRegisterError,
  REGISTER_ERROR_KEY,
} from '@/features/studio/general/utils/register-validation';
import type { GeneralStoryStartSettingDraft } from '@/features/studio/general/utils/start-setting-draft';

/** 검수 결과를 칸에 짝지을 때 보는 폼 입력이다. 이미지는 객체 키만 본다. */
export type GeneralStoryReviewForm = {
  texts: Record<GeneralStoryTextField, string>;
  cover: { objectKey: string } | null;
  protagonist: GeneralStoryCharacter;
  supporting: (GeneralStoryCharacter & {
    id: string;
    description: string;
    image: { objectKey: string } | null;
  })[];
  startSettings: GeneralStoryStartSettingDraft[];
  mainEvents: GeneralStoryMainEventDraft[];
  genres: GeneralStoryGenreSelection;
  description: string;
};

/** 칸 하나로 짚을 수 없어 폼 위 안내에 보이는 검수 결과다. */
export type GeneralStoryReviewNotice = {
  tab: GeneralStoryTab | null;
  message: string;
};

type ReviewTarget = Omit<GeneralStoryRegisterError, 'message'> & {
  /** 이 칸을 고쳤는지 판단할 값이다. 제출한 값과 달라지면 검수 결과를 내린다. */
  valueOf: (form: GeneralStoryReviewForm) => unknown;
  /** 칸이 없는 탭 단위 결과면 참이다. 탭만 빨갛게 하고 문구는 폼 위 안내에 둔다. */
  tabOnly?: boolean;
};

const TEXT_PATHS: Record<string, GeneralStoryTextField> = {
  title: 'title',
  oneLineIntro: 'oneLineIntro',
  'storySettings.worldSetting': 'world',
  'storySettings.ruleSetting': 'progression',
};

const START_PARTS = {
  name: 'name',
  prologue: 'prologue',
  startSituation: 'situation',
} as const;

const ENDING_PARTS = {
  name: 'name',
  'requirement.achievementCondition': 'condition',
  epilogue: 'epilogue',
} as const;

/**
 * 검수 결과의 요청 필드 경로를 제출한 폼의 칸으로 옮긴다. 배열 순번은 제출한 폼의 항목 id로 바꿔,
 * 뒤에 항목을 지우거나 추가해도 같은 항목을 가리킨다.
 *
 * @param path 요청 필드 경로
 * @param submitted 제출한 폼
 * @returns 칸. 짚을 수 없는 경로면 null
 */
function resolveTarget(
  path: string,
  submitted: GeneralStoryReviewForm,
): ReviewTarget | null {
  const textField = TEXT_PATHS[path];

  if (textField) {
    const tab = GENERAL_STORY_TABS.find(({ fields }) =>
      (fields as readonly string[]).includes(textField),
    )?.value;

    return tab
      ? {
          key: REGISTER_ERROR_KEY.text(textField),
          tab,
          valueOf: (form) => form.texts[textField],
        }
      : null;
  }

  if (path === 'thumbnailUrl') {
    return {
      key: REGISTER_ERROR_KEY.cover,
      tab: 'basic',
      valueOf: (form) => form.cover?.objectKey,
    };
  }

  if (path === 'description') {
    return {
      key: REGISTER_ERROR_KEY.description,
      tab: 'publish',
      valueOf: (form) => form.description,
    };
  }

  if (/^genres\[\d+\]$/.test(path)) {
    return {
      key: REGISTER_ERROR_KEY.genre,
      tab: 'publish',
      valueOf: (form) => form.genres,
    };
  }

  if (path === 'protagonistName') {
    return {
      key: REGISTER_ERROR_KEY.protagonist('name'),
      tab: 'protagonist',
      valueOf: (form) => form.protagonist.name,
    };
  }

  if (path === 'storySettings.userRoleSetting') {
    return {
      key: REGISTER_ERROR_KEY.protagonist('feature'),
      tab: 'protagonist',
      valueOf: (form) => form.protagonist,
    };
  }

  if (path === 'storySettings.characterSetting') {
    return {
      key: 'review.supporting',
      tab: 'supporting',
      tabOnly: true,
      valueOf: (form) =>
        form.supporting.map(({ name, gender, feature }) => ({
          name,
          gender,
          feature,
        })),
    };
  }

  const character = /^characters\[(\d+)\]\.(.+)$/.exec(path);

  if (character) {
    const target = submitted.supporting[Number(character[1])];

    if (!target) return null;

    const base = {
      tab: 'supporting' as const,
      collapsibleId: `general-story-supporting-${target.id}`,
    };
    const find = (form: GeneralStoryReviewForm) =>
      form.supporting.find(({ id }) => id === target.id);

    if (/^images\[\d+\]\.imageUrl$/.test(character[2])) {
      return {
        ...base,
        key: REGISTER_ERROR_KEY.supportingImage(target.id),
        valueOf: (form) => find(form)?.image?.objectKey,
      };
    }

    if (
      character[2] === 'name' ||
      /^images\[\d+\]\.imageName$/.test(character[2])
    ) {
      return {
        ...base,
        key: REGISTER_ERROR_KEY.supporting(target.id, 'name'),
        valueOf: (form) => find(form)?.name,
      };
    }

    if (character[2] === 'description') {
      return {
        ...base,
        key: REGISTER_ERROR_KEY.supporting(target.id, 'description'),
        valueOf: (form) => find(form)?.description,
      };
    }

    return null;
  }

  const start = /^startSettings\[(\d+)\]\.(.+)$/.exec(path);

  if (start) {
    const setting = submitted.startSettings[Number(start[1])];

    if (!setting) return null;

    const base = { tab: 'start' as const, startSettingId: setting.id };
    const findSetting = (form: GeneralStoryReviewForm) =>
      form.startSettings.find(({ id }) => id === setting.id);
    const startPart = START_PARTS[start[2] as keyof typeof START_PARTS];

    if (startPart) {
      return {
        ...base,
        key: REGISTER_ERROR_KEY.start(setting.id, startPart),
        valueOf: (form) => findSetting(form)?.[startPart],
      };
    }

    const suggested = /^suggestedInputs\[(\d+)\]$/.exec(start[2]);

    if (suggested) {
      const index = Number(suggested[1]);

      return {
        ...base,
        key: REGISTER_ERROR_KEY.suggested(setting.id, index),
        valueOf: (form) => findSetting(form)?.suggestedInputs[index],
      };
    }

    const endingMatch = /^endings\[(\d+)\]\.(.+)$/.exec(start[2]);
    const ending = endingMatch && setting.endings[Number(endingMatch[1])];
    const endingPart =
      endingMatch && ENDING_PARTS[endingMatch[2] as keyof typeof ENDING_PARTS];

    if (ending && endingPart) {
      return {
        ...base,
        collapsibleId: `general-story-ending-${ending.id}`,
        key: REGISTER_ERROR_KEY.ending(ending.id, endingPart),
        valueOf: (form) =>
          findSetting(form)?.endings.find(({ id }) => id === ending.id)?.[
            endingPart
          ],
      };
    }

    return null;
  }

  const event = /^mainEvents\[(\d+)\]\.(name|description|keySentence)$/.exec(
    path,
  );
  const mainEvent = event && submitted.mainEvents[Number(event[1])];

  if (event && mainEvent) {
    const part = event[2] as 'name' | 'description' | 'keySentence';

    return {
      key: REGISTER_ERROR_KEY.event(mainEvent.id, part),
      tab: 'event',
      collapsibleId: `general-story-event-${mainEvent.id}`,
      valueOf: (form) =>
        form.mainEvents.find(({ id }) => id === mainEvent.id)?.[part],
    };
  }

  return null;
}

/**
 * 이미지 실행 오류 코드를 안내 문구로 바꾼다.
 *
 * @param errorCode 오류 코드
 * @returns 안내 문구
 */
export function getImageErrorMessage(errorCode: string): string {
  const { imageError } = GENERAL_STORY_REVIEW_COPY;

  return errorCode === 'IMAGE_INVALID' || errorCode === 'IMAGE_UNREADABLE'
    ? imageError[errorCode]
    : imageError.default;
}

/**
 * 검수 결과를 칸별 오류와 폼 위 안내로 나눈다. 제출한 뒤 고친 칸의 결과는 내린다.
 *
 * @param review 검수 결과(내용 위반과 이미지 오류)
 * @param current 지금 폼
 * @param submitted 제출한 폼
 * @returns 탭 순서로 놓인 칸별 오류와 폼 위 안내
 */
export function getReviewErrors(
  review: {
    issues: StorySubmissionIssue[];
    imageErrors: StorySubmissionImageError[];
  },
  current: GeneralStoryReviewForm,
  submitted: GeneralStoryReviewForm,
): {
  fieldErrors: GeneralStoryRegisterError[];
  notices: GeneralStoryReviewNotice[];
} {
  const fieldErrors: GeneralStoryRegisterError[] = [];
  const notices: GeneralStoryReviewNotice[] = [];
  const items = [
    ...review.issues.map(({ path, reason }) => ({
      path,
      message: reason.trim() || GENERAL_STORY_REVIEW_COPY.issueFallback,
    })),
    ...review.imageErrors.map(({ path, errorCode }) => ({
      path,
      message: getImageErrorMessage(errorCode),
    })),
  ];

  for (const { path, message } of items) {
    const target = resolveTarget(path, submitted);

    if (!target) {
      notices.push({ tab: null, message });

      continue;
    }

    const { valueOf, tabOnly, ...error } = target;

    if (JSON.stringify(valueOf(current)) !== JSON.stringify(valueOf(submitted)))
      continue;

    if (tabOnly) notices.push({ tab: error.tab, message });

    if (!fieldErrors.some(({ key }) => key === error.key))
      fieldErrors.push({ ...error, message });
  }

  const tabOrder = (tab: GeneralStoryTab) =>
    GENERAL_STORY_TABS.findIndex(({ value }) => value === tab);

  fieldErrors.sort((a, b) => tabOrder(a.tab) - tabOrder(b.tab));

  return { fieldErrors, notices };
}
