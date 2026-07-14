import { describe, expect, it } from 'vitest';

import {
  normalizeInviteCode,
  resolveInviteCodeError,
  sanitizeInviteCodeInput,
} from '@/features/more/invite/utils/invite-code';
import { FetchError } from '@/lib/api-error';

describe('normalizeInviteCode', () => {
  it('앞뒤 공백을 제거하고 대문자로 변환한다', () => {
    expect(normalizeInviteCode('  cw6vzx7d  ')).toBe('CW6VZX7D');
  });

  it('공백뿐인 값은 빈 문자열이 된다', () => {
    expect(normalizeInviteCode('   ')).toBe('');
  });
});

describe('sanitizeInviteCodeInput', () => {
  it('공백을 제거하고 대문자로 변환한다', () => {
    expect(sanitizeInviteCodeInput('cw6vzx7d')).toBe('CW6VZX7D');
  });

  it('공백이 포함된 8자 코드를 손실 없이 정리한다', () => {
    expect(sanitizeInviteCodeInput(' CW6VZX7D ')).toBe('CW6VZX7D');
  });

  it('최대 길이를 초과한 입력은 8자로 자른다', () => {
    expect(sanitizeInviteCodeInput('CW6VZX7DEXTRA')).toBe('CW6VZX7D');
  });
});

describe('resolveInviteCodeError', () => {
  it.each([
    [
      new FetchError('bad', 400, { code: 'BAD_REQUEST' }),
      'not_found',
      '코드를 다시 확인해주세요',
    ],
    [
      new FetchError('missing', 404, { code: 'NOT_FOUND' }),
      'not_found',
      '코드를 다시 확인해주세요',
    ],
    [
      new FetchError('self', 409, { code: 'INVITE_SELF_CODE' }),
      'self_code',
      '내 코드는 입력할 수 없어요',
    ],
    [
      new FetchError('used', 409, { code: 'INVITE_ALREADY_REDEEMED' }),
      'already_redeemed',
      '이미 초대 코드를 입력했어요',
    ],
  ] as const)(
    'API 오류를 사용자 문구와 분석 사유로 변환한다',
    (error, errorType, message) => {
      expect(resolveInviteCodeError(error)).toEqual({ errorType, message });
    },
  );

  it('알 수 없는 오류는 network로 분류한다', () => {
    expect(resolveInviteCodeError(new Error('offline'))).toEqual({
      errorType: 'network',
      message: '초대 코드 입력에 실패했어요',
    });
  });

  it.each([
    new FetchError('unauthorized', 401, { code: 'UNAUTHORIZED' }),
    new FetchError('forbidden', 403, { code: 'FORBIDDEN' }),
    new FetchError('unknown conflict', 409, { code: 'CONFLICT' }),
    new FetchError('server', 500, { code: 'INTERNAL_SERVER_ERROR' }),
  ])('재시도 가능한 API 오류는 network로 분류한다', (error) => {
    expect(resolveInviteCodeError(error)).toEqual({
      errorType: 'network',
      message: '초대 코드 입력에 실패했어요',
    });
  });
});
