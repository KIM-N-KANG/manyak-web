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
        content: <>여기서 첫 스토리를 만들어 보세요</>,
        selector: onbordaSelector(ONBOARDING_TARGET.CREATE_STORY),
        side: 'top' as const,
        showControls: false,
        pointerPadding: 8,
        pointerRadius: 20,
      },
    ],
  },
  {
    tour: ONBOARDING_TOURS.KEYWORD_SELECT,
    steps: [
      {
        icon: <>🗂️</>,
        title: '세 가지 키워드를 차례로 골라요',
        content: (
          <>장르 → 주인공 특징 → 주변 인물 특징의 키워드를 골라야 해요</>
        ),
        selector: onbordaSelector(ONBOARDING_TARGET.KEYWORD_TABS),
        side: 'bottom' as const,
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 18,
      },
    ],
  },
  {
    tour: ONBOARDING_TOURS.STORYLINE_SELECT,
    steps: [
      {
        title: '3개의 스토리라인을 비교해요',
        content: (
          <>탭을 눌러 후보 스토리라인을 살펴보고 마음에 드는 걸 골라요</>
        ),
        selector: onbordaSelector(ONBOARDING_TARGET.STORYLINE_TABS),
        side: 'bottom-left' as const,
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 18,
      },
    ],
  },
  {
    tour: ONBOARDING_TOURS.CHAT,
    steps: [
      {
        icon: <>📖</>,
        title: '이야기',
        content: <>AI와 함께 만든 이야기가 여기에 있어요.</>,
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
            당신의 행동이나 대사를 입력해 이야기를 이어가세요. ✱ 버튼을 누르고
            내용을 작성하면 상황을 묘사할 수도 있어요.
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
