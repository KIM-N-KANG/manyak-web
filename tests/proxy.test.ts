import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { ONBOARDING_SEEN_COOKIE } from '@/features/onboarding/constants';
import { proxy } from '@/proxy';

/**
 * 온보딩 게이트에 걸리는 요청을 만든다. 쿠키가 없으면 신규 방문자로 판정된다.
 *
 * @param url 요청 URL
 * @param cookies 요청에 실을 쿠키
 * @returns 프록시에 넘길 요청
 */
function request(url: string, cookies: Record<string, string> = {}) {
  const headers = new Headers();
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');

  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  }

  return new NextRequest(new Request(url, { headers }));
}

/**
 * 응답의 `location` 헤더를 URL로 파싱한다.
 *
 * @param response 프록시 응답
 * @returns 리다이렉트 대상 URL
 */
function redirectTarget(response: Response) {
  const location = response.headers.get('location');

  expect(location).not.toBeNull();

  return new URL(location!);
}

describe('proxy', () => {
  it('redirects a new visitor to onboarding with the original destination', () => {
    const response = proxy(request('http://localhost:3000/chats'));
    const target = redirectTarget(response);

    expect(response.status).toBe(307);
    expect(target.pathname).toBe('/onboarding');
    expect(target.searchParams.get('from')).toBe('/chats');
  });

  it('preserves the original query string on the onboarding redirect', () => {
    const response = proxy(
      request(
        'http://localhost:3000/?utm_source=th&utm_medium=social&utm_campaign=organic&utm_content=bio',
      ),
    );
    const target = redirectTarget(response);

    expect(target.searchParams.get('utm_source')).toBe('th');
    expect(target.searchParams.get('utm_medium')).toBe('social');
    expect(target.searchParams.get('utm_campaign')).toBe('organic');
    expect(target.searchParams.get('utm_content')).toBe('bio');
    expect(target.searchParams.get('from')).toBe('/');
  });

  it('forwards arbitrary query keys so future parameters survive', () => {
    const response = proxy(
      request('http://localhost:3000/my?invite=ABC123&ref=friend'),
    );
    const target = redirectTarget(response);

    expect(target.searchParams.get('invite')).toBe('ABC123');
    expect(target.searchParams.get('ref')).toBe('friend');
    expect(target.searchParams.get('from')).toBe('/my');
  });

  it('keeps repeated query keys instead of collapsing them', () => {
    const response = proxy(request('http://localhost:3000/?tag=a&tag=b'));
    const target = redirectTarget(response);

    expect(target.searchParams.getAll('tag')).toEqual(['a', 'b']);
  });

  it('overrides an incoming from parameter with the actual destination', () => {
    const response = proxy(
      request('http://localhost:3000/chats?from=/spoofed'),
    );
    const target = redirectTarget(response);

    expect(target.searchParams.getAll('from')).toEqual(['/chats']);
  });

  it('passes through when the onboarding seen cookie is present', () => {
    const response = proxy(
      request('http://localhost:3000/?utm_source=th', {
        [ONBOARDING_SEEN_COOKIE]: '1',
      }),
    );

    expect(response.headers.get('location')).toBeNull();
  });

  it('passes through when a member session cookie is present', () => {
    const response = proxy(
      request('http://localhost:3000/?utm_source=th', {
        'authjs.session-token': 'token',
      }),
    );

    expect(response.headers.get('location')).toBeNull();
  });
});
