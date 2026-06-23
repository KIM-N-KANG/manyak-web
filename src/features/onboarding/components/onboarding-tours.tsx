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
        content: <>버튼을 눌러 3단계로 스토리를 만들어 보세요</>,
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
        title: '키워드를 순서대로 선택해요',
        content: <>장르, 주인공 특징, 주변 인물 특징을 차례로 선택해 주세요</>,
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
        icon: <>🧭</>,
        title: '스토리라인을 비교해요',
        content: <>후보 3개를 살펴보고 가장 마음에 드는 흐름을 선택해 주세요</>,
        selector: onbordaSelector(ONBOARDING_TARGET.STORYLINE_TABS),
        side: 'bottom-left' as const,
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 18,
      },
    ],
  },
  {
    tour: ONBOARDING_TOURS.ADDITIONAL_INFO,
    steps: [
      {
        icon: <>💡</>,
        title: '추천 정보를 더해 보세요',
        content: (
          <>
            AI가 추천해준 스토리에 어울리는 설정 중 마음에 드는 항목을 눌러
            추가해 보세요
          </>
        ),
        selector: onbordaSelector(ONBOARDING_TARGET.RECOMMENDED_INFO),
        side: 'bottom' as const,
        showControls: true,
        pointerPadding: 16,
        pointerRadius: 18,
      },
      {
        icon: <>📝</>,
        title: '원하는 설정을 직접 입력해요',
        content: (
          <>더하고 싶은 설정이나 사건을 직접 적어 스토리에 반영할 수 있어요.</>
        ),
        selector: onbordaSelector(ONBOARDING_TARGET.ADDITIONAL_INFO_INPUT),
        side: 'top' as const,
        showControls: true,
        pointerPadding: 16,
        pointerRadius: 18,
      },
    ],
  },
  {
    tour: ONBOARDING_TOURS.CHAT,
    steps: [
      {
        icon: <>✍️</>,
        title: '이야기 이어가기',
        content: (
          <>
            행동이나 대사를 입력해 다음 장면을 만들어 보세요 ✱ 버튼으로 상황
            묘사도 추가할 수 있어요
          </>
        ),
        selector: onbordaSelector(ONBOARDING_TARGET.CHAT_INPUT),
        side: 'top' as const,
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 20,
      },
    ],
  },
];
