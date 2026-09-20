import type { ConsentKey } from '@/features/auth/_shared/utils/consent-status';

/** 로그인 직후 필수 동의 바텀 시트의 문구. 스펙 FE-SCREEN-010 동의 모델이 소유한다. */
export const CONSENT_SHEET_COPY = {
  title: '서비스 이용을 위해 동의가 필요해요',
  agreeAll: '전체 동의',
  items: {
    terms: '[필수] 서비스 이용약관 동의',
    privacy: '[필수] 개인정보 처리방침 동의',
    age14: '[필수] 만 14세 이상입니다',
  } satisfies Record<ConsentKey, string>,
  viewDocument: {
    label: '보기',
    terms: '서비스 이용약관 보기',
    privacy: '개인정보 처리방침 보기',
  },
  submit: '동의하기',
  submitPending: '동의 저장 중',
  logout: '로그아웃',
  logoutPending: '로그아웃 중',
  retry: '다시 시도',
  error: {
    retryable: '동의를 저장하지 못했어요. 잠시 후 다시 시도해주세요',
    versionMismatch: '약관이 갱신되어 최신 내용으로 다시 확인해주세요',
    forbidden: '지금 계정으로는 서비스를 이용할 수 없어요',
  },
  loadError: {
    title: '동의 상태를 확인하지 못했어요',
    description: '잠시 후 다시 시도해주세요',
  },
  forbidden: {
    title: '지금 계정으로는 서비스를 이용할 수 없어요',
    description: '계정 상태를 확인할 수 없어 이용이 제한됐어요',
  },
} as const;
