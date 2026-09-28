import type { GeneralStoryExitWarning } from '@/features/studio/general/constants';

type DraftExitState = {
  /** 지금 폼에 입력이 있는지 */
  hasInput: boolean;
  /** 임시 저장본이 있는지 */
  hasSavedDraft: boolean;
  /** 지금 폼이 마지막 임시 저장본과 같은지 */
  isSaved: boolean;
};

/**
 * 닫기·뒤로가기 확인 다이얼로그의 종류를 고른다.
 *
 * @param state 입력·임시 저장 상태
 * @returns 다이얼로그 종류
 */
export function getDraftExitWarning({
  hasInput,
  hasSavedDraft,
  isSaved,
}: DraftExitState): GeneralStoryExitWarning {
  if (hasSavedDraft) {
    return isSaved ? 'saved' : 'unsaved';
  }

  return hasInput ? 'unsavedNew' : 'nothing';
}
