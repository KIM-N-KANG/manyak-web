'use client';

/**
 * 알림 권한이 바뀐 뒤(프롬프트·설정 화면에서 허용) 토큰 동기화와 권한 표시를 다시
 * 계산하기 위한 window 이벤트 이름. 권한을 요청한 곳이 `notifyPushPermissionChanged()`로
 * 알린다.
 */
export const PUSH_PERMISSION_EVENT = 'manyak:push-permission-changed';

/** 알림 권한이 바뀌었음을 구독자(토큰 동기화·설정 화면)에 알린다. */
export function notifyPushPermissionChanged(): void {
  window.dispatchEvent(new Event(PUSH_PERMISSION_EVENT));
}

/**
 * 브라우저 알림 권한을 요청한다. 사용자 제스처 안에서 불러야 하며, 결과가 바뀌면
 * 구독자에게 알린다.
 *
 * @returns 요청 뒤 권한 상태
 */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (readNotificationPermission() === 'unsupported') {
    return 'unsupported';
  }

  const permission = await Notification.requestPermission();

  notifyPushPermissionChanged();

  return permission;
}

/**
 * 브라우저 알림 권한 상태를 읽는다. Notification API가 없는 브라우저는 `unsupported`다.
 *
 * @returns 권한 상태
 */
export function readNotificationPermission():
  | NotificationPermission
  | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission;
}

/**
 * 홈 화면 설치본(standalone)으로 열렸는지 판정한다. iOS는 설치본에서만 웹 푸시를
 * 받을 수 있어 권한 요청 대신 설치 안내를 보여줄지 정하는 데 쓴다.
 *
 * @returns 설치본이면 true
 */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari 전용 속성. 표준 display-mode가 잡히지 않는 구버전 대비.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * iOS 기기인지 판정한다. iPadOS 13+는 데스크톱 UA를 쓰므로 터치 포인트로 보정한다.
 *
 * @param userAgent 판정할 User-Agent. 생략하면 현재 브라우저 값
 * @param maxTouchPoints 판정할 터치 포인트 수. 생략하면 현재 브라우저 값
 * @returns iOS면 true
 */
export function isIosDevice(
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  maxTouchPoints = typeof navigator === 'undefined'
    ? 0
    : navigator.maxTouchPoints,
): boolean {
  return (
    /iPhone|iPad|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
  );
}

/**
 * 지금 알림 권한을 요청해도 되는 상태인지 판정한다. iOS는 설치본이 아니면 권한 요청
 * 자체가 무의미해 설치 안내로 대신한다.
 *
 * @param input 권한·iOS·설치본 여부
 * @returns `prompt`(요청 가능) · `install`(iOS 설치 안내) · `granted` · `denied` · `unsupported`
 */
export function resolvePushPromptState(input: {
  permission: NotificationPermission | 'unsupported';
  isIos: boolean;
  isStandalone: boolean;
}): 'prompt' | 'install' | 'granted' | 'denied' | 'unsupported' {
  if (input.isIos && !input.isStandalone) {
    return 'install';
  }

  if (input.permission === 'default') {
    return 'prompt';
  }

  return input.permission;
}
