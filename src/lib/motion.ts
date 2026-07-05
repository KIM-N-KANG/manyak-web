/** 화면 상태 전환에 공통으로 사용하는 페이드 인/아웃 모션 프리셋 */
export const FADE_TRANSITION_PROPS = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};
