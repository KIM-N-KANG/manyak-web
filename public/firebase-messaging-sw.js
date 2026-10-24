/* global importScripts, firebase */
// FCM 웹 푸시 서비스 워커. 서버가 웹 토큰에는 webpush notification(제목·본문·아이콘)과
// 클릭 링크(fcmOptions.link)를 실어 보내므로 표시는 브라우저가 맡는다. 클릭 이동은
// 직접 처리한다. SDK 기본 처리는 같은 host의 창이 하나라도 있으면 그 창을 focus만
// 하고 링크로 이동하지 않아, 창이 늘 살아 있는 iOS 홈 화면 설치본에서는 푸시를
// 눌러도 앱만 열린다. Firebase 설정은 등록 URL 쿼리스트링으로 받는다(SW는 env를
// 못 읽는다).

/**
 * 알림 데이터에서 클릭 이동 URL을 고른다. SDK가 payload를 두는 FCM_MSG 키 아래의
 * fcmOptions.link → notification.click_action → data.deepLink 순으로 찾고, 같은
 * origin이 아니거나 없으면 앱 루트로 보낸다. 쿼리(utm_*)는 그대로 둔다.
 *
 * @param {Record<string, unknown> | undefined} data 알림의 data
 * @param {string} origin 서비스 워커 origin
 * @returns {string} 이동할 절대 URL
 */
function resolveClickUrl(data, origin) {
  const payload = data?.FCM_MSG ?? {};
  const link =
    payload.fcmOptions?.link ??
    payload.notification?.click_action ??
    payload.data?.deepLink;

  try {
    // link가 없으면 new URL(undefined)가 "/undefined"를 만들므로 먼저 거른다.
    const url = link ? new URL(link, origin) : null;

    return url?.origin === origin ? url.href : `${origin}/`;
  } catch {
    return `${origin}/`;
  }
}

/**
 * 같은 origin의 열린 창이 있으면 그 창을 URL로 이동시킨 뒤 앞으로 가져오고, 없거나
 * 이동에 실패하면 새 창을 연다. navigate는 이 SW가 제어하는 창에서만 성공한다.
 *
 * @param {string} url 이동할 절대 URL
 */
async function openClient(url) {
  const windows = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  // ponytail: 첫 창만 시도한다. 창이 여럿인 데스크톱에서 다른 창을 고르고 싶으면 focused 우선으로 바꾼다.
  const client = windows.find(
    (candidate) => new URL(candidate.url).origin === self.location.origin,
  );

  if (client) {
    const navigated = await client.navigate(url).catch(() => null);

    if (navigated) {
      await navigated.focus();

      return;
    }
  }

  await self.clients.openWindow(url);
}

// SDK 리스너보다 먼저 등록해야 stopImmediatePropagation으로 SDK 기본 처리를 막을 수 있다.
self.addEventListener('notificationclick', (event) => {
  event.stopImmediatePropagation();
  event.notification.close();
  event.waitUntil(
    openClient(resolveClickUrl(event.notification.data, self.location.origin)),
  );
});

importScripts(
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js',
);
importScripts(
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js',
);

const config = Object.fromEntries(
  new URL(self.location.href).searchParams.entries(),
);

firebase.initializeApp(config);
firebase.messaging();
