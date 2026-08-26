import type {
  KeywordCharacterSnapshot,
  KeywordDraftSnapshot,
} from '@/features/stories/_shared/utils/creation-request-storage';

/**
 * 키워드 저장 스냅숏에 사용자가 입력한 값이 하나라도 있는지 판별한다.
 *
 * @param snapshot 판별할 키워드 저장 스냅숏
 * @returns 초기 빈 주변 인물만 있지 않고 실제 입력이 있으면 true
 */
export function hasKeywordDraftInput(snapshot: KeywordDraftSnapshot): boolean {
  const hasCharacterInput = (character: KeywordCharacterSnapshot) =>
    character.name.trim().length > 0 ||
    character.gender !== null ||
    character.selectedTagIds.length > 0 ||
    character.customTags.length > 0;

  return (
    snapshot.selectedGenreTagIds.length > 0 ||
    snapshot.customGenreTags.length > 0 ||
    hasCharacterInput(snapshot.protagonist) ||
    snapshot.supportingCharacters.some(hasCharacterInput)
  );
}
