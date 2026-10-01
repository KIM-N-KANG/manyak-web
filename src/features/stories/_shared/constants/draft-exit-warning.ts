/**
 * 간편·일반 제작의 닫기·뒤로가기 확인 다이얼로그 종류. Android 간편 제작의 이탈 경고와 같은 기준으로 고른다.
 * `unsavedNew`는 임시 저장한 적 없이 입력만 있는 경우, `unsaved`는 임시 저장 뒤 편집이 남은 경우,
 * `saved`는 임시 저장본만 남은 경우, `nothing`은 저장한 것도 저장할 것도 없는 경우다.
 * `submitted`는 일반 제작에서 등록을 요청해 입력이 서버 제출본에 있는 경우, `submittedEdited`는 그 뒤에 고친 내용이 있는 경우다.
 */
export type DraftExitWarning =
  | 'unsavedNew'
  | 'unsaved'
  | 'saved'
  | 'nothing'
  | 'submitted'
  | 'submittedEdited';

export const DRAFT_EXIT_WARNING_COPY = {
  unsavedNew: {
    title: '임시 저장하지 않은 내용이 있어요',
    description: '지금 나가면 입력한 내용이 사라져요',
    cancel: '닫기',
    confirm: '나가기',
  },
  unsaved: {
    title: '임시 저장하지 않은 내용이 있어요',
    description: '지금 나가면 임시 저장한 뒤에 만든 내용은 사라져요',
    cancel: '닫기',
    confirm: '나가기',
  },
  saved: {
    title: '스토리 만들기를 그만둘까요?',
    description: '만들던 내용은 제작 탭의 이어서 만들기에서 계속할 수 있어요',
    cancel: '닫기',
    confirm: '나가기',
  },
  nothing: {
    title: '스토리를 그만 만들까요?',
    description: '지금 나가면 만들고 있는 내용이 사라져요',
    cancel: '닫기',
    confirm: '그만 만들기',
  },
  submitted: {
    title: '스토리 만들기를 그만둘까요?',
    description: '등록을 요청한 내용은 제작 탭에서 확인할 수 있어요',
    cancel: '닫기',
    confirm: '나가기',
  },
  submittedEdited: {
    title: '등록하지 않은 수정 내용이 있어요',
    description: '지금 나가면 등록을 요청한 뒤에 고친 내용은 사라져요',
    cancel: '닫기',
    confirm: '나가기',
  },
} as const satisfies Record<
  DraftExitWarning,
  { title: string; description: string; cancel: string; confirm: string }
>;
