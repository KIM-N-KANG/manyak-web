import type { CreateGeneralStoryRequestVisibility } from '@/api/generated/models';
import type { GeneralStoryTextField } from '@/features/studio/general/constants';
import type { GeneralStoryCharacter } from '@/features/studio/general/utils/character-settings';
import type { GeneralStoryGenreSelection } from '@/features/studio/general/utils/genre-selection';
import {
  type GeneralStoryMainEventDraft,
  hasMainEventInput,
} from '@/features/studio/general/utils/main-event-draft';
import {
  type GeneralStoryStartSettingDraft,
  hasStartSettingInput,
} from '@/features/studio/general/utils/start-setting-draft';

/**
 * 임시 저장한 이미지다. 새로고침 뒤에도 미리보기를 다시 만들 수 있게 원본 파일을 함께 둔다.
 * 검수 제출본에서 복원한 이미지는 파일이 없어(`null`) 임시 저장하지 않는다.
 */
export type GeneralStoryDraftImage = { objectKey: string; blob: Blob | null };

/** 일반 제작 폼 전체의 임시 저장 스냅숏이다. 제작 탭 카드와 폼 복원이 함께 읽는다. */
export type GeneralStoryDraftSnapshot = {
  texts: Record<GeneralStoryTextField, string>;
  cover: GeneralStoryDraftImage | null;
  descriptionRatio: number;
  protagonist: GeneralStoryCharacter;
  supporting: (GeneralStoryCharacter & {
    id: string;
    image: GeneralStoryDraftImage | null;
  })[];
  startSettings: GeneralStoryStartSettingDraft[];
  mainEvents: GeneralStoryMainEventDraft[];
  genres: GeneralStoryGenreSelection;
  description: string;
  visibility: CreateGeneralStoryRequestVisibility;
};

/**
 * 공백이 아닌 글이 있는지 반환한다.
 *
 * @param value 검사할 글
 * @returns 공백을 뺀 글이 있으면 참
 */
const hasText = (value: string) => value.trim() !== '';

/**
 * 인물 입력(이름·성별·특징)이 있는지 반환한다.
 *
 * @param character 검사할 인물 입력
 * @returns 한 항목이라도 입력했으면 참
 */
const hasCharacterInput = ({ name, gender, feature }: GeneralStoryCharacter) =>
  hasText(name) || gender !== null || hasText(feature);

/**
 * 임시 저장할 입력이 있는지 반환한다. 기본값이 있는 분량 배분과 공개 범위는 입력으로 치지 않는다.
 *
 * @param snapshot 검사할 폼 스냅숏
 * @returns 글·이미지·성별·장르 중 하나라도 입력했으면 참
 */
export function hasGeneralStoryDraftInput(
  snapshot: GeneralStoryDraftSnapshot,
): boolean {
  return (
    Object.values(snapshot.texts).some(hasText) ||
    snapshot.cover !== null ||
    hasCharacterInput(snapshot.protagonist) ||
    snapshot.supporting.some(
      (character) => hasCharacterInput(character) || character.image !== null,
    ) ||
    snapshot.startSettings.some(hasStartSettingInput) ||
    snapshot.mainEvents.some(hasMainEventInput) ||
    snapshot.genres.selected.length > 0 ||
    hasText(snapshot.description)
  );
}
