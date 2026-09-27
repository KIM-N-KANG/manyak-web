/** 일반 제작 화면 정본 문구다. 폼(FE-SCREEN-009) 구현 전까지는 준비 중 안내만 둔다. */
export const GENERAL_STORY_CREATE_COPY = {
  title: '스토리 일반 제작',
  preparing: '일반 제작은 준비 중이에요',
  close: '스토리 만들기 닫기',
  draftSave: '임시 저장',
  draftSaved: '임시 저장됨',
} as const;

/**
 * 닫기 확인 다이얼로그의 종류. Android 간편 제작의 이탈 경고와 같은 기준으로 고른다.
 * `unsaved`는 임시 저장 뒤 편집이 남은 경우, `saved`는 임시 저장본만 남은 경우,
 * `nothing`은 저장한 것도 저장할 것도 없는 경우다.
 */
export type GeneralStoryExitWarning = 'unsaved' | 'saved' | 'nothing';

export const GENERAL_STORY_EXIT_WARNING_COPY = {
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
} as const satisfies Record<
  GeneralStoryExitWarning,
  { title: string; description: string; cancel: string; confirm: string }
>;
