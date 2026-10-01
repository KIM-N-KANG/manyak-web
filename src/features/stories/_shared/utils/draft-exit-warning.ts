import type { DraftExitWarning } from '@/features/stories/_shared/constants/draft-exit-warning';

type DraftExitState = {
  /** 지금 폼에 입력이 있는지 */
  hasInput: boolean;
  /** 임시 저장본이 있는지 */
  hasSavedDraft: boolean;
  /** 지금 폼이 마지막 임시 저장본과 같은지 */
  isSaved: boolean;
  /** 등록을 요청해 입력이 서버 제출본에 있는지 */
  hasSubmitted?: boolean;
  /** 지금 폼이 마지막으로 등록을 요청한 입력과 같은지 */
  isSubmittedUnchanged?: boolean;
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
  hasSubmitted = false,
  isSubmittedUnchanged = false,
}: DraftExitState): DraftExitWarning {
  // 등록을 요청하면 임시 저장본을 지우고 서버 제출본을 정본으로 삼는다.
  if (hasSubmitted) {
    return isSubmittedUnchanged ? 'submitted' : 'submittedEdited';
  }

  if (hasSavedDraft) {
    return isSaved ? 'saved' : 'unsaved';
  }

  return hasInput ? 'unsavedNew' : 'nothing';
}
