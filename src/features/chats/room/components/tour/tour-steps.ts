export type ChatTourStepId = 'add-blocks' | 'settings' | 'random-send';

export type ChatTourStep = {
  id: ChatTourStepId;
  title: string;
  description: string;
  /** 하이라이트 대상의 data-tour 셀렉터 목록. 발견된 요소들의 합집합 영역을 하이라이트한다. */
  selectors: string[];
};

/**
 * 채팅 화면 안내 투어의 스텝 정의.
 * 대상 요소가 하나도 없는 스텝은 진행 시 건너뛴다(예: 일반 입력 모드의 대사 추가).
 */
export const CHAT_TOUR_STEPS: ChatTourStep[] = [
  {
    id: 'add-blocks',
    title: '상황·대사 추가',
    description:
      '누르면 입력창이 하나 늘어나요. 상황 묘사와 대사를 나눠 담아 이야기를 이어가 보세요.',
    selectors: ['[data-tour="add-situation"]', '[data-tour="add-dialogue"]'],
  },
  {
    id: 'settings',
    title: '입력 설정',
    description:
      '추천 입력을 켜고 끄거나, 블럭·일반 입력 모드로 바꿀 수 있어요.',
    selectors: ['[data-tour="choices-menu"]', '[data-tour="input-mode-menu"]'],
  },
  {
    id: 'random-send',
    title: '랜덤 전송',
    description:
      '입력이 비어 있을 때 누르면 추천 입력 중 하나를 골라 바로 전송해요.',
    selectors: ['[data-tour="send"]'],
  },
];
