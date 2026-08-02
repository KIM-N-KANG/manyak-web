import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearLinkResultCookie,
  readLinkResultCookie,
} from '@/features/my/_shared/utils/link-result-cookie';
import {
  LINK_RESULT_COOKIE,
  serializeLinkResult,
} from '@/lib/auth/link-account';

const documentStub = { cookie: '' };

beforeEach(() => {
  documentStub.cookie = '';
  vi.stubGlobal('document', documentStub);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readLinkResultCookie', () => {
  it('쿠키에서 연동 결과 페이로드를 파싱한다', () => {
    documentStub.cookie = `${LINK_RESULT_COOKIE}=${serializeLinkResult({
      result: 'success',
      provider: 'kakao',
    })}`;

    expect(readLinkResultCookie()).toEqual({
      result: 'success',
      provider: 'kakao',
    });
  });

  it('다른 쿠키와 함께 있어도 결과 쿠키만 골라 읽는다', () => {
    documentStub.cookie = [
      'other=1',
      `${LINK_RESULT_COOKIE}=${serializeLinkResult({
        result: 'linked_to_other_user',
        provider: 'google',
      })}`,
      'another=2',
    ].join('; ');

    expect(readLinkResultCookie()).toEqual({
      result: 'linked_to_other_user',
      provider: 'google',
    });
  });

  it('결과 쿠키가 없거나 손상됐으면 null을 반환한다', () => {
    expect(readLinkResultCookie()).toBeNull();

    documentStub.cookie = `${LINK_RESULT_COOKIE}=broken`;

    expect(readLinkResultCookie()).toBeNull();
  });

  it('document가 없는 환경에서는 null을 반환한다', () => {
    vi.stubGlobal('document', undefined);

    expect(readLinkResultCookie()).toBeNull();
  });
});

describe('clearLinkResultCookie', () => {
  it('과거 만료를 지정해 결과 쿠키를 지운다', () => {
    clearLinkResultCookie();

    expect(documentStub.cookie).toContain(`${LINK_RESULT_COOKIE}=;`);
    expect(documentStub.cookie).toContain('expires=Thu, 01 Jan 1970');
  });
});
