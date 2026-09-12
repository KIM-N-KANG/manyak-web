/** 제작 화면의 스토리 만들기 FAB 정본 문구다. */
export const CREATE_STORY_FAB_COPY = {
  accessibleLabel: '스토리 만들기',
  label: '만들기',
} as const;

/** 제작 화면의 진행 카드(초안·완성 중) 정본 문구다. 앱 `studio_progress_*` 문자열과 같다. */
export const CREATION_PROGRESS_CARD_COPY = {
  draftTitle: '만들고 있는 스토리',
  draftDescription: '임시 저장한 내용부터 이어서 만들 수 있어요',
  completingTitle: '스토리를 완성 중이에요',
  completingDescription: '조금만 기다리면 완성된 스토리를 볼 수 있어요',
  completingState: '스토리 완성 중',
  resume: '이어서 만들기',
  optionsTitle: '만들던 스토리 옵션',
  optionsTrigger: '만들던 스토리 옵션 더보기',
  delete: '삭제하기',
  deleteConfirmTitle: '만들던 스토리를 삭제할까요?',
  deleteConfirmDescription: '삭제하면 만들던 내용이 사라져요',
} as const;
