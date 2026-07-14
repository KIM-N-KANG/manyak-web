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

/** 초대 코드 길이(영문·숫자 8자). */
export const INVITE_CODE_MAX_LENGTH = 8;

/**
 * 초대 코드를 제출용으로 정규화한다. 앞뒤 공백을 제거하고 대문자화한다.
 *
 * @param value 사용자가 입력한 초대 코드
 * @returns 정규화된 초대 코드
 */
export const normalizeInviteCode = (value: string): string =>
  value.trim().toUpperCase();

/**
 * 입력 단계에서 초대 코드를 정리한다. 공백을 제거하고 대문자화한 뒤 최대 길이로 자른다.
 * `maxLength` 속성은 붙여넣기 원문을 trim 이전에 잘라 공백 포함 코드를 손상시키므로,
 * 입력값을 여기서 정규화해 제한한다.
 *
 * @param value 사용자가 입력한 초대 코드
 * @returns 정규화되고 최대 길이로 잘린 초대 코드
 */
export const sanitizeInviteCodeInput = (value: string): string =>
  value.replace(/\s+/g, '').toUpperCase().slice(0, INVITE_CODE_MAX_LENGTH);

/**
 * 초대 코드 등록 실패 원인을 사용자용 에러 타입과 메시지로 변환한다.
 *
 * @param error 등록 요청에서 발생한 에러
 * @returns 에러 타입과 사용자에게 보여줄 메시지
 */
export function resolveInviteCodeError(error: unknown): InviteCodeError {
  if (error instanceof FetchError) {
    if (error.status === 400 || error.status === 404) {
      return { errorType: 'not_found', message: '코드를 다시 확인해주세요' };
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
    message: '초대 코드 입력에 실패했어요',
  };
}
