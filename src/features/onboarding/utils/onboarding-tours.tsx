import {
  ONBOARDING_TARGET,
  ONBOARDING_TOURS,
  onbordaSelector,
} from '../constants';

export const onboardingTours = [
  {
    tour: ONBOARDING_TOURS.STORY_LIST,
    steps: [
      {
        icon: <>👋</>,
        title: '마냑에 오신 걸 환영해요',
        content: (
          <>여기서 나만의 첫 스토리를 만들어 보세요. 버튼을 누르면 시작돼요!</>
        ),
        selector: onbordaSelector(ONBOARDING_TARGET.CREATE_STORY),
        side: 'top' as const,
        showControls: false,
        pointerPadding: 8,
        pointerRadius: 16,
      },
    ],
  },
  {
    tour: ONBOARDING_TOURS.STORY_CREATE,
    steps: [
      {
        icon: <>🏷️</>,
        title: '키워드 선택',
        content: <>장르·주인공 같은 키워드를 골라 AI에게 알려주세요.</>,
        selector: onbordaSelector(ONBOARDING_TARGET.KEYWORD_CATEGORIES),
        side: 'bottom' as const,
        showControls: true,
        pointerPadding: 6,
        pointerRadius: 8,
      },
      {
        icon: <>✨</>,
        title: '스토리라인 만들기',
        content: <>키워드를 다 고르면 여기서 AI가 스토리라인을 만들어요.</>,
        selector: onbordaSelector(ONBOARDING_TARGET.GENERATE_BUTTON),
        side: 'top' as const,
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
      },
    ],
  },
  {
    tour: ONBOARDING_TOURS.CHAT,
    steps: [
      {
        icon: <>📖</>,
        title: '이야기',
        content: <>AI가 만든 이야기가 여기에 펼쳐져요.</>,
        selector: onbordaSelector(ONBOARDING_TARGET.CHAT_STORY),
        side: 'bottom' as const,
        showControls: true,
        pointerPadding: 6,
        pointerRadius: 12,
      },
      {
        icon: <>✍️</>,
        title: '이야기 이어가기',
        content: (
          <>
            당신의 행동이나 대사를 입력해 이야기를 이어가세요. ✱ 버튼으로 강조할
            수도 있어요.
          </>
        ),
        selector: onbordaSelector(ONBOARDING_TARGET.CHAT_INPUT),
        side: 'top' as const,
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
      },
    ],
  },
];
