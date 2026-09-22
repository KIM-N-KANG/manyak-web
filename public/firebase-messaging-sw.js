/* global importScripts, firebase */
// FCM 웹 푸시 서비스 워커. 서버가 웹 토큰에는 webpush notification(제목·본문·아이콘)과
// 클릭 링크를 실어 보내므로 compat SDK만 초기화하면 브라우저가 표시와 클릭 이동을
// 처리한다. Firebase 설정은 등록 URL 쿼리스트링으로 받는다(SW는 env를 못 읽는다).
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
