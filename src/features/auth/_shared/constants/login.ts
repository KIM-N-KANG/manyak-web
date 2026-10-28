/**
 * 로그인 화면·외부 브라우저 로그인 랜딩·로그인 필요 시트가 함께 쓰는 문구.
 * 줄바꿈(`\n`)은 화면에서 그대로 두 줄로 그린다(`whitespace-pre-line`).
 */
export const LOGIN_COPY = {
  title: '로그인하고 나만의 스토리를\n어디서든 이어서 즐겨보세요',
  loginButton: '로그인하기',
  /** 가입 혜택 배지 "지금 가입하고 N 이프 받기"의 조각. N은 서버 `signupReward`다. */
  signupBenefit: { prefix: '지금 가입하고', unit: '이프', suffix: '받기' },
  legalTerms: '서비스 이용약관',
  legalPrivacy: '개인정보 처리방침',
} as const;
