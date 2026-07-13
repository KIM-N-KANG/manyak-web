export type InAppBrowser = 'kakaotalk' | 'instagram' | 'threads';

/**
 * 인앱 브라우저 UA 감지.
 * - 카카오톡: iOS/Android 모두 UA에 'KAKAOTALK' 토큰 포함
 * - 인스타그램: UA에 'Instagram' 토큰 포함
 * - 쓰레드: UA에 'Barcelona'(쓰레드 앱 코드네임) 토큰 포함
 */
export function detectInAppBrowser(userAgent: string): InAppBrowser | null {
  if (/KAKAOTALK/i.test(userAgent)) {
    return 'kakaotalk';
  }

  if (/Instagram/i.test(userAgent)) {
    return 'instagram';
  }

  if (/Barcelona/i.test(userAgent)) {
    return 'threads';
  }

  return null;
}
