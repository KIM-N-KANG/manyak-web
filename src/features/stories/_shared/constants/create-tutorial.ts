import { getEuroParticle } from '@/lib/korean';

/**
 * 간편 제작 첫 진입 안내의 단계. 보이는 순서대로 둔다. 다음 단계는 바로 앞 단계를 마쳤을 때만 연다.
 * `completing`만 제작 탭에서 열고 나머지는 간편 제작 화면에서 연다.
 */
export const CREATE_TUTORIAL_STAGES = [
  'intro',
  'keyword',
  'storyline',
  'additional-info',
  'completing',
] as const;

export type CreateTutorialStage = (typeof CREATE_TUTORIAL_STAGES)[number];

/** 마지막으로 마친 단계를 담는 로컬스토리지 키다. 건너뛰거나 끝까지 보면 `done`이 된다. */
export const CREATE_TUTORIAL_STORAGE_KEY = 'manyak:create-tutorial-stage';

export const CREATE_TUTORIAL_DONE = 'done';

export const CREATE_TUTORIAL_COPY = {
  label: '스토리 만들기 안내',
  mascot: '마냑 캐릭터',
  start: '시작하기',
  skip: '건너뛰기',
  confirm: '확인',
  originals: '오리지널 스토리 보기',
  close: '닫기',
} as const;

/**
 * 단계 문구를 만든다. `\n`에서 줄을 바꾼다. 스토리라인 단계는 사용자가 고른 장르를 넣는다.
 *
 * @param stage 안내 단계
 * @param genres 스토리라인 생성 요청에 담긴 장르 이름(제공 장르와 직접 입력 장르)
 * @returns 대화창 문구
 */
export function getCreateTutorialMessage(
  stage: CreateTutorialStage,
  genres: readonly string[] = [],
): string {
  switch (stage) {
    case 'intro':
      return '반가워요! 키워드만 고르면\n세계관과 인물을 만들어 드려요.';
    case 'keyword':
      return '장르와 인물을 골라 주세요.\n내가 주인공인 1인칭 스토리예요.';
    case 'storyline': {
      const genre = genres.length > 0 ? genres.join(', ') : '장르';

      return `${genre}${getEuroParticle(genre)} 만든 스토리라인 3개예요.\n마음에 드는 하나를 골라 주세요.`;
    }
    case 'additional-info':
      return '마지막이에요!\n원하는 설정을 더하면 완성돼요.';
    case 'completing':
      return '곧 스토리가 완성돼요.\n그동안 오리지널 스토리 어때요?';
  }
}
