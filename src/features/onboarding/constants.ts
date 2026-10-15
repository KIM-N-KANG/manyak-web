import { type GalleryMotion } from './utils/onboarding-gallery';

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
  '키워드로 만든 스토리를 채팅으로 직접 이어가요';

/**
 * 푸터 Google Play 배지가 여는 스토어 페이지. `referrer`로 온보딩 푸터에서 온 설치를
 * Play Console 획득 보고서에서 구분한다.
 */
export const ONBOARDING_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=app.manyak&referrer=${encodeURIComponent(
  'utm_source=manyak_web&utm_medium=onboarding_footer',
)}`;

/** Partner Marketing Hub에서 받은 한국어 "Google Play에서 다운로드" 배지다. 수정하지 않고 그대로 쓴다. */
export const ONBOARDING_PLAY_STORE_BADGE_SRC = '/badges/google-play-ko.svg';

export const ONBOARDING_PLAY_STORE_BADGE_ALT = 'Google Play에서 다운로드';

/**
 * 첫 화면 이미지 카드에서 차례로 바뀌는 이미지. Android 로그인 화면 배경과 같은 이미지이며,
 * 테마와 무관해 라이트와 다크가 같이 쓴다.
 */
export const ONBOARDING_HERO_IMAGES = [
  '/onboarding/hero-1.webp',
  '/onboarding/hero-2.webp',
  '/onboarding/hero-3.webp',
  '/onboarding/hero-4.webp',
  '/onboarding/hero-5.webp',
] as const;

export const ONBOARDING_HERO_IMAGE_WIDTH = 941;
export const ONBOARDING_HERO_IMAGE_HEIGHT = 1672;

/** 스토리 만들기 소개 제목 위에 흩어 놓는 장르 키워드. 간편 제작이 제공하는 장르 일부다. */
export const ONBOARDING_GENRE_KEYWORDS = [
  '회귀',
  '빙의',
  '로맨스판타지',
  '아포칼립스',
  '헌터물',
  '계약결혼',
  '복수',
  '집착',
  '괴담',
  '먼치킨',
  '현대판타지',
  '탈출',
] as const;

/** 소개 화면 스크린샷 원본 크기. 24장 모두 같은 기기에서 캡처했다. */
export const ONBOARDING_SCREEN_WIDTH = 786;
export const ONBOARDING_SCREEN_HEIGHT = 1704;

/**
 * 가로 갤러리 카드 한 장. 테마별 스크린샷 중 `cropTop`(원본 px)부터 아래로 보이는
 * 부분만 박스에 잘라 넣고, 카드 아래에 짧은 제목과 설명을 붙인다.
 */
export interface OnboardingSlide {
  key: string;
  title: string;
  description: string;
  src: string;
  darkSrc: string;
  alt: string;
  cropTop: number;
}

export type OnboardingFeatureKey =
  | 'create'
  | 'storyline'
  | 'complete'
  | 'chat'
  | 'originals';

/**
 * 온보딩 버튼을 누른 위치. 버튼은 기능 소개 섹션 아래에만 있어 어느 섹션인지 함께 남긴다.
 * `source`는 헤더 버튼(`header`)과 본문 끝 버튼(`bottom`)이 있던 이전 기록과 같은 축으로
 * 비교하려고 유지한다.
 */
export interface OnboardingButtonSource {
  source: 'section';
  section: OnboardingFeatureKey;
}

/**
 * 기능 소개 섹션 아래 버튼. `create`는 간편 제작으로, `browse`는 홈으로 이동한다.
 */
export interface OnboardingFeatureAction {
  label: string;
  type: 'create' | 'browse';
}

/** 기능 소개 섹션 하나. 제목, 스크롤에 따라 카드가 바뀌는 갤러리, 아래 버튼으로 구성된다. */
export interface OnboardingFeature {
  key: OnboardingFeatureKey;
  motion: GalleryMotion;
  label: string;
  titleLines: readonly string[];
  description?: string;
  slides: readonly OnboardingSlide[];
  action: OnboardingFeatureAction;
}

/**
 * 화면 키로 테마별 스크린샷 경로를 채워 갤러리 카드 하나를 만든다.
 *
 * @param key `public/onboarding/{key}-light.webp`와 `-dark.webp`의 화면 키
 * @param cropTop 카드에 보이기 시작할 원본 세로 위치(px)
 * @param copy 카드 제목, 설명, 대체 텍스트
 * @returns 갤러리 카드
 */
function slide(
  key: string,
  cropTop: number,
  copy: Pick<OnboardingSlide, 'title' | 'description' | 'alt'>,
): OnboardingSlide {
  return {
    key,
    cropTop,
    src: `/onboarding/${key}-light.webp`,
    darkSrc: `/onboarding/${key}-dark.webp`,
    ...copy,
  };
}

/**
 * 기능 소개 섹션 목록. 한 스토리가 만들어지고 채팅으로 이어지는 실제 사용 순서를
 * 따르고, 마지막에 직접 만들지 않고 바로 즐기는 오리지널 스토리를 소개한다.
 * 문구 속 `\u00a0`은 한 덩어리로 읽혀야 하는 말이 줄바꿈으로 갈라지지 않게 붙인다.
 */
export const ONBOARDING_FEATURES: readonly OnboardingFeature[] = [
  {
    key: 'create',
    motion: 'gallery',
    action: { label: '키워드 고르러 가기', type: 'create' },
    label: '스토리 만들기',
    titleLines: ['어떤 스토리든', '키워드 몇 개면 시작돼요'],
    description: '글솜씨는 없어도 괜찮아요. 고르기만 하면 AI가 써 드려요.',
    slides: [
      slide('keyword-genre', 0, {
        title: '장르를 골라요',
        description:
          '공포, 스릴러, 로맨스판타지까지. 끌리는 장르를 3개까지 골라요.',
        alt: '장르 키워드를 고르는 화면',
      }),
      slide('keyword-protagonist', 140, {
        title: '주인공을 정해요',
        description: '이름과 특징 키워드를 골라요. 이름은 비워 둬도 돼요.',
        alt: '주인공 이름과 특징을 고르는 화면',
      }),
      slide('keyword-characters', 380, {
        title: '주변 인물을 더해요',
        description: '함께할 인물을 더하고 특징을 골라요.',
        alt: '주변 인물의 이름과 특징을 고르는 화면',
      }),
    ],
  },
  {
    key: 'storyline',
    motion: 'deck',
    action: { label: '내 스토리 만들어 보기', type: 'create' },
    label: '스토리라인과 이미지 스타일',
    titleLines: ['줄거리도 이미지 스타일도', '고르기만 하면 돼요'],
    slides: [
      slide('storyline-select', 140, {
        title: '스토리라인을 골라요',
        description: 'AI가 쓴 스토리라인 3개\u00a0중 마음에 드는 걸 골라요.',
        alt: 'AI가 쓴 스토리라인을 고르는 화면',
      }),
      slide('storyline-detail', 400, {
        title: '설정을 덧붙여요',
        description:
          '넣고 싶은 설정을 적거나, AI가\u00a0추천한 정보를 눌러 더해요.',
        alt: '스토리라인에 추가 정보를 입력하는 화면',
      }),
      slide('art-style', 140, {
        title: '이미지 스타일을 골라요',
        description:
          '애니메이션부터 수묵까지, 고른 이미지\u00a0스타일로 썸네일과 인물을 그려요.',
        alt: '이미지 스타일을 고르는 화면',
      }),
    ],
  },
  {
    key: 'complete',
    motion: 'gallery',
    action: { label: '첫 스토리 만들기', type: 'create' },
    label: '스토리 완성',
    titleLines: ['썸네일부터 첫 장면까지', '한 번에 완성돼요'],
    slides: [
      slide('story-cover', 0, {
        title: '썸네일이 완성돼요',
        description: '제목과 소개, 썸네일\u00a0이미지까지 한 번에 만들어져요.',
        alt: '완성된 스토리의 썸네일과 소개 화면',
      }),
      slide('story-start-situation', 100, {
        title: '첫 장면이 준비돼요',
        description: '채팅을 시작할 상황을 AI가 미리 써 둬요.',
        alt: '채팅 시작 상황을 보여주는 화면',
      }),
      slide('story-characters', 280, {
        title: '인물 소개도 함께',
        description: '주변 인물마다 이미지와 소개가 생겨요.',
        alt: '주변 인물 이미지와 소개를 보는 화면',
      }),
    ],
  },
  {
    key: 'chat',
    motion: 'stack',
    action: { label: '채팅할 스토리 고르기', type: 'browse' },
    label: '채팅',
    titleLines: ['다음 장면은', '내가 정해요'],
    slides: [
      slide('chat-prologue', 490, {
        title: '상황과 대사로 이어가요',
        description:
          '행동은 상황에, 말은 대사에 적어 보내요. 막막하면 AI 추천 입력을 눌러요.',
        alt: 'AI 추천 입력과 상황, 대사 입력이 보이는 채팅 화면',
      }),
      slide('chat-first-turn', 330, {
        title: '인물이 바로 반응해요',
        description: '보낸 내용에 맞춰 다음 장면이 이어져요.',
        alt: '첫 응답과 함께 인물 이미지가 생성된 채팅 화면',
      }),
      slide('chat-realtime-image', 480, {
        title: '장면이 바뀌면 이미지도 함께',
        description: '대화 흐름에 맞춰 AI가 이미지를 새로 그려요.',
        alt: '다음 장면에 맞춰 새 이미지가 생성된 채팅 화면',
      }),
    ],
  },
  {
    key: 'originals',
    motion: 'deck',
    action: { label: '오리지널 스토리 보기', type: 'browse' },
    label: '오리지널 스토리',
    titleLines: ['만들지 않아도', '바로 시작할 수 있어요'],
    description:
      '마냑 오리지널부터 다른 사람이 공개한\u00a0스토리까지, 끌리는 걸 골라 채팅해요.',
    slides: [
      slide('original-home', 100, {
        title: '취향대로 골라요',
        description:
          '장르별로 준비된 오리지널\u00a0스토리\u00a0중 끌리는 걸 골라요.',
        alt: '오리지널 스토리 목록이 보이는 홈 화면',
      }),
      slide('original-detail', 140, {
        title: '바로 채팅을 시작해요',
        description:
          '스토리를 만들 필요 없이 새\u00a0채팅\u00a0시작하기만 누르면 돼요.',
        alt: '오리지널 스토리 0호선의 상세 화면',
      }),
      slide('shared-detail', 290, {
        title: '다른 사람의 스토리도',
        description:
          '다른 사람이 공개한 스토리도 똑같이 골라 이어갈 수 있어요.',
        alt: '스토리 (알 수 없음)의 상세 화면',
      }),
    ],
  },
] as const;
