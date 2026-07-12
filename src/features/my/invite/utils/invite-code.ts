import { FetchError, getApiErrorCode } from '@/lib/api-error';

export type InviteCodeSource = 'invite_page' | 'onboarding';
export type InviteCodeErrorType =
  | 'not_found'
  | 'self_code'
  | 'already_redeemed'
  | 'network';

export type InviteCodeError = {
  errorType: InviteCodeErrorType;
  message: string;
};

export const normalizeInviteCode = (value: string): string =>
  value.trim().toUpperCase();

export function resolveInviteCodeError(error: unknown): InviteCodeError {
  if (error instanceof FetchError) {
    if (error.status === 400 || error.status === 404) {
      return { errorType: 'not_found', message: '코드를 다시 확인해 주세요' };
    }

    if (error.status === 409) {
      const code = getApiErrorCode(error);

      if (code === 'INVITE_SELF_CODE') {
        return {
          errorType: 'self_code',
          message: '내 코드는 입력할 수 없어요',
        };
      }

      if (code === 'INVITE_ALREADY_REDEEMED') {
        return {
          errorType: 'already_redeemed',
          message: '이미 초대 코드를 입력했어요',
        };
      }
    }
  }

  return {
    errorType: 'network',
    message: '초대 코드 입력에 실패했어요. 잠시 후 다시 시도해 주세요',
  };
}
