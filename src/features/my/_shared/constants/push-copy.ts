/** 제작 요청 직후 알림 권한 프롬프트 시트의 사용자 문구 정본. */
export const PUSH_PROMPT_COPY = {
  title: '완성되면 알림으로 알려드릴까요?',
  description: '스토리가 완성되면 브라우저 알림으로 바로 알려드려요',
  marketingConsent: '[선택] 광고성 알림 수신 동의',
  marketingDescription:
    '새로운 이벤트와 혜택 소식, 출석 리마인드를 광고 알림으로 보내드려요',
  accept: '알림 받기',
  later: '나중에',
  installTitle: '홈 화면에 추가하면 알림을 받을 수 있어요',
  installDescription:
    'iOS에서는 홈 화면에 추가한 마냑에서만 알림을 받을 수 있어요. 공유 버튼을 누른 뒤 "홈 화면에 추가"를 선택해 주세요',
  installClose: '확인',
} as const;

/** 알림 설정 화면의 사용자 문구 정본. Android 알림 설정 화면과 같은 문구를 쓴다. */
export const PUSH_SETTINGS_COPY = {
  title: '알림 설정',
  menuLabel: '알림 설정',
  bannerDisabled: '브라우저 알림 설정이 꺼져 있어요',
  bannerDenied: '브라우저 알림이 차단되어 있어요',
  bannerInstall:
    '홈 화면에 추가한 마냑에서만 알림을 받을 수 있어요. 공유 버튼을 누른 뒤 "홈 화면에 추가"를 선택해 주세요',
  bannerUnsupported: '이 브라우저에서는 알림을 지원하지 않아요',
  enable: '알림 켜기',
  service: '서비스 알림',
  serviceDescription: '스토리 완성처럼 내 활동의 결과를 알려드려요',
  marketing: '광고 알림',
  marketingDescription: '이벤트·혜택 소식과 출석 리마인드를 받아요',
  marketingNight: '야간 광고 허용',
  marketingNightDescription: '밤 9시부터 아침 8시 사이에도 광고 알림을 받아요',
  privacyPolicy: '개인정보 처리방침 보기',
  loadFailed: '알림 설정을 불러오지 못했어요',
} as const;

/**
 * 광고·야간 동의를 켜거나 끌 때 즉시 표시하는 처리 결과 통지 문구(정보통신망법 제50조).
 * 전송자·의사 표시 일시·처리 내용을 담는다. 일시는 의사 표시 시점의 기기 시각이다.
 */
export const PUSH_CONSENT_NOTICE_COPY = {
  title: '알림 수신 동의 처리 안내',
  sender: '마냑 운영자 강동우(팀명 김앤강)',
  senderLabel: '전송자',
  dateLabel: '의사 표시 일시',
  resultLabel: '처리 내용',
  close: '확인',
  result: {
    marketingOn: '광고 알림 수신 동의 완료',
    marketingOff: '광고 알림 수신 동의 철회 완료',
    nightOn: '야간 광고 알림 수신 동의 완료',
    nightOff: '야간 광고 알림 수신 동의 철회 완료',
  },
} as const;

export type PushConsentNoticeResult =
  keyof typeof PUSH_CONSENT_NOTICE_COPY.result;
