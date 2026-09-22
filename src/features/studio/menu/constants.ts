/** 제작 화면의 스토리 만들기 FAB 정본 문구다. */
export const CREATE_STORY_FAB_COPY = {
  accessibleLabel: '스토리 만들기',
  label: '만들기',
} as const;

/** 제작 화면의 빈 목록 안내 정본 문구다. 앱 `studio_stories_empty`와 같다. */
export const CREATED_STORY_LIST_COPY = {
  emptyTitle: '아직 만든 스토리가 없어요',
} as const;

/**
 * 제작 화면의 진행 카드(초안·완성 중) 정본 문구다. 앱 `studio_progress_*` 문자열과 같되,
 * 초안 설명은 멈춘 단계를 알려 주도록 단계별로 나눈다(앱 반영은 KNK-1395).
 */
export const CREATION_PROGRESS_CARD_COPY = {
  draftTitle: '만들고 있는 스토리',
  /** 초안이 멈춘 단계별 설명. 스토리라인 생성은 실제로 진행 중이라 현재형이다. */
  draftDescription: {
    keyword: '키워드를 선택하고 있었어요',
    generating: '스토리라인을 만들고 있어요',
    'storyline-select': '스토리라인을 선택하고 있었어요',
    'additional-info': '추가 정보를 입력하고 있었어요',
  },
  completingTitle: '스토리를 완성 중이에요',
  completingDescription: '조금만 기다리면 완성된 스토리를 볼 수 있어요',
  completingState: '스토리 완성 중',
  /** 날짜 줄의 스크린 리더 라벨. 화면에는 KST `yyyy-MM-dd HH:mm`만 보인다. */
  savedAtLabel: '처음 임시 저장한 시각',
  resume: '이어서 만들기',
  optionsKind: '만들던 스토리',
  optionsTrigger: '만들던 스토리 옵션 더보기',
  delete: '삭제하기',
  deleteConfirmTitle: '만들던 스토리를 삭제할까요?',
  deleteConfirmDescription: '삭제하면 만들던 내용이 사라져요',
} as const;
