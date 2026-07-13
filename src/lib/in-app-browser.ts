/** 카카오톡 인앱 브라우저 UA 감지. iOS/Android 모두 UA에 'KAKAOTALK' 토큰이 포함된다. */
export function isKakaoTalkInAppBrowser(userAgent: string): boolean {
  return /KAKAOTALK/i.test(userAgent);
}
