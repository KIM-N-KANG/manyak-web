export const ONBOARDING_SEEN_STORAGE_KEY = 'manyak:onboarding-seen';
export const ONBOARDING_SEEN_VALUE = '1';

/**
 * 온보딩 리다이렉트 게이트가 닫혔음을 서버(proxy)에 알리는 쿠키.
 * 노출 판정의 정본은 로컬스토리지이지만 서버는 읽을 수 없으므로,
 * proxy는 이 쿠키의 부재만으로 낙관적으로 리다이렉트한다.
 */
export const ONBOARDING_SEEN_COOKIE = 'manyak_onboarding_seen';
export const ONBOARDING_SEEN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const ONBOARDING_TITLE_LINES = [
  '눈을 떠보니',
  '스토리 속 주인공이 되었다',
] as const;

export const ONBOARDING_DESCRIPTION =
  'AI와 함께 나만의 다음 장면을 만들어보세요';

/**
 * 온보딩 랜딩 섹션에서 보여주는 화면 스크린샷 한 장.
 * 크기를 생략하면 전체 화면 스크린샷 공통 크기(1082×2402)를 쓴다.
 */
export interface OnboardingScene {
  src: string;
  darkSrc: string;
  alt: string;
  width?: number;
  height?: number;
}

/** 온보딩 랜딩 섹션 하나. 스크린샷 묶음과 소개 문구로 구성된다. */
export interface OnboardingSection {
  key: string;
  eyebrow: string;
  title: string;
  description: string;
  scenes: readonly OnboardingScene[];
}

/**
 * 온보딩 랜딩 섹션 목록. 실제 사용 흐름(스토리 만들기 → 채팅 → 공유)
 * 순서를 그대로 따르므로 섹션 순번이 곧 사용 순서다.
 */
export const ONBOARDING_SECTIONS: readonly OnboardingSection[] = [
  {
    key: 'keywords',
    eyebrow: '스토리 만들기',
    title: '키워드만 고르면 준비 끝',
    description:
      '장르, 주인공, 주변 인물까지. 원하는 키워드를 고르면 나머지는 AI가 채워요.',
    scenes: [
      {
        src: '/onboarding/keyword-genre-light.webp',
        darkSrc: '/onboarding/keyword-genre-dark.webp',
        alt: '장르 키워드를 선택하는 화면',
      },
      {
        src: '/onboarding/keyword-protagonist-light.webp',
        darkSrc: '/onboarding/keyword-protagonist-dark.webp',
        alt: '주인공 키워드를 선택하는 화면',
      },
      {
        src: '/onboarding/keyword-characters-light.webp',
        darkSrc: '/onboarding/keyword-characters-dark.webp',
        alt: '주변 인물 키워드를 선택하는 화면',
      },
    ],
  },
  {
    key: 'storyline',
    eyebrow: '스토리 만들기',
    title: '마음에 드는 흐름을 골라요',
    description:
      'AI가 제안한 스토리라인 중 하나를 고르고, 더하고 싶은 정보를 자유롭게 적어 완성해요.',
    scenes: [
      {
        src: '/onboarding/storyline-select-light.webp',
        darkSrc: '/onboarding/storyline-select-dark.webp',
        alt: '스토리라인을 선택하는 화면',
      },
      {
        src: '/onboarding/storyline-detail-light.webp',
        darkSrc: '/onboarding/storyline-detail-dark.webp',
        alt: '스토리라인에 추가 정보를 입력하는 화면',
      },
    ],
  },
  {
    key: 'chat',
    eyebrow: '채팅',
    title: '이야기 속 주인공은 이제 나',
    description:
      '완성한 스토리에서 바로 대화가 시작돼요. 내가 보내는 말에 따라 다음 장면이 흘러가요.',
    scenes: [
      {
        src: '/onboarding/chat-first-input-light.webp',
        darkSrc: '/onboarding/chat-first-input-dark.webp',
        alt: '채팅에서 상황과 대사를 입력하는 화면',
      },
      {
        src: '/onboarding/chat-response-light.webp',
        darkSrc: '/onboarding/chat-response-dark.webp',
        alt: '인물 이미지와 함께 응답이 도착한 채팅 화면',
      },
    ],
  },
  {
    key: 'image-generation',
    eyebrow: '채팅',
    title: '장면이 바뀌면, 이미지도 함께',
    description:
      '대화의 흐름에 맞춰 AI가 이미지를 새로 만들어요. 달라지는 표정과 배경으로 이야기에 더 몰입해보세요.',
    scenes: [
      {
        src: '/onboarding/chat-image-generation-1-light.webp',
        darkSrc: '/onboarding/chat-image-generation-1-dark.webp',
        alt: '대화 중 장면에 맞는 인물 이미지가 생성된 화면',
      },
      {
        src: '/onboarding/chat-image-generation-2-light.webp',
        darkSrc: '/onboarding/chat-image-generation-2-dark.webp',
        alt: '다음 장면에 맞춰 인물의 표정과 구도가 달라진 화면',
      },
    ],
  },
  {
    key: 'suggestion',
    eyebrow: '채팅',
    title: '다음 장면이 막막할 땐',
    description:
      'AI가 지금 상황에 어울리는 입력을 추천해요. 탭 한 번이면 바로 전송돼요.',
    scenes: [
      {
        src: '/onboarding/chat-suggestion-light.webp',
        darkSrc: '/onboarding/chat-suggestion-dark.webp',
        alt: 'AI가 추천한 입력을 보여주는 채팅 화면',
      },
    ],
  },
  {
    key: 'share',
    eyebrow: '공유',
    title: '완성된 이야기는 함께 봐요',
    description:
      '링크 하나면 내가 이어온 채팅을 친구에게 그대로 보여줄 수 있어요.',
    scenes: [
      {
        src: '/onboarding/share-view-light.webp',
        darkSrc: '/onboarding/share-view-dark.webp',
        alt: '친구가 공유한 채팅을 보는 화면',
      },
    ],
  },
] as const;

/** 헤더 왼쪽 보조 버튼. 온보딩을 건너뛰고 홈으로 이동한다. */
export const ONBOARDING_BROWSE_LABEL = '둘러보기';

/** 헤더 오른쪽·본문 끝 주 CTA. 스토리 생성 퍼널로 바로 이동한다. */
export const ONBOARDING_START_LABEL = '바로 시작하기';
