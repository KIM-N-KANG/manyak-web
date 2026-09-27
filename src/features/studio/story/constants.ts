/** 제작 FAB로 들어오는 제작 방식 선택 화면 정본 문구다. */
export const STORY_MODE_SELECT_COPY = {
  title: '스토리 만들기',
  simple: {
    title: '간편 제작',
    description: '키워드를 고르면 스토리라인을 추천해 드려요.',
  },
  general: {
    title: '일반 제작',
    description: '제목부터 인물까지 하나하나 직접 입력해요.',
  },
} as const;

/**
 * 제작 방식 선택 일러스트의 예시 문구다. 장식(aria-hidden)이라 접근성 이름에 쓰지 않는다.
 * 단계 제목·탭 이름은 간편 제작 퍼널(`features/stories/new`)의 문구와 맞춘다.
 */
export const CREATE_STORY_MODE_ILLUSTRATION_COPY = {
  keywordTitleLines: ['만들고 싶은 스토리의', '키워드를 선택해주세요'],
  storylineTitleLines: ['마음에 드는', '스토리라인을 선택해주세요'],
  storylineTabs: ['첫 번째', '두 번째', '세 번째'],
  storylines: [
    '막차 안내 방송이 노선도에 없는 역을 불렀다. 문이 열렸고, 내린 사람은 나 하나뿐이었다.',
    '매일 같은 칸에 타던 여자가 오늘 처음으로 말을 걸었다. "이번 역에서 내리면 안 돼요."',
  ],
  genreLabel: '장르',
  genres: ['괴담', '로맨스', '미스터리', '무협', '타임루프', '생존'],
  pickedGenres: ['괴담', '미스터리', '생존'],
  titleLabel: '제목',
  title: '노선도에 없는 역',
  introLabel: '한 줄 소개',
  intro: '막차에서 내린 곳은 존재하지 않는 역이었다',
  charactersLabel: '인물',
  characters: [
    { avatar: '나', name: '막차 승객', isProtagonist: true },
    { avatar: '역', name: '얼굴 없는 역무원', isProtagonist: false },
  ],
} as const;
