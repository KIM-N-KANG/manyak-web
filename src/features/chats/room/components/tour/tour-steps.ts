import { type ChatInputMode } from '../../utils/chat-input-config';

export type ChatTourStepId =
  | 'add-blocks'
  | 'add-emphasis'
  | 'settings'
  | 'random-send';

export type ChatTourStep = {
  id: ChatTourStepId;
  title: string;
  description: string;
  /** 하이라이트 대상의 data-tour 셀렉터 목록. 발견된 요소들의 합집합 영역을 하이라이트한다. */
  selectors: string[];
};

/** 블럭 입력 모드의 첫 스텝. 상황·대사 추가 버튼이 각각 입력 블럭을 늘린다. */
const ADD_BLOCKS_STEP: ChatTourStep = {
  id: 'add-blocks',
  title: '상황·대사 추가',
  description:
    '누르면 입력창이 하나 늘어나요. 상황 묘사와 대사를 나눠 담아 이야기를 이어가 보세요.',
  selectors: ['[data-tour="add-situation"]', '[data-tour="add-dialogue"]'],
};

/** 일반 입력 모드의 첫 스텝. 대사 추가가 없고, 상황 추가는 강조 마커를 넣는다. */
const ADD_EMPHASIS_STEP: ChatTourStep = {
  id: 'add-emphasis',
  title: '상황 추가',
  description:
    '선택한 문장을 상황 묘사로 표시해요. 대사와 구분해서 쓰고 싶을 때 눌러 보세요.',
  selectors: ['[data-tour="add-situation"]'],
};

const COMMON_STEPS: ChatTourStep[] = [
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

/**
 * 입력 모드에 맞는 채팅 화면 안내 투어의 스텝 목록을 만든다.
 * 첫 스텝은 모드마다 버튼 구성과 동작이 달라 문구와 대상이 갈린다.
 *
 * @param mode 현재 입력 모드
 * @returns 순서대로 안내할 스텝 목록
 */
export function getChatTourSteps(mode: ChatInputMode): ChatTourStep[] {
  return [
    mode === 'block' ? ADD_BLOCKS_STEP : ADD_EMPHASIS_STEP,
    ...COMMON_STEPS,
  ];
}
