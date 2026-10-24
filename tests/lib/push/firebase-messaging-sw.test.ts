import { beforeAll, beforeEach, expect, it, vi } from 'vitest';

const ORIGIN = 'https://manyak.app';

type ClickListener = (event: {
  notification: { data?: Record<string, unknown>; close: () => void };
  stopImmediatePropagation: () => void;
  waitUntil: (promise: Promise<unknown>) => void;
}) => void;

let onClick: ClickListener;
const matchAll = vi.fn();
const openWindow = vi.fn();

beforeAll(async () => {
  vi.stubGlobal('importScripts', vi.fn());
  vi.stubGlobal('firebase', { initializeApp: vi.fn(), messaging: vi.fn() });
  vi.stubGlobal('self', {
    location: { href: `${ORIGIN}/firebase-messaging-sw.js`, origin: ORIGIN },
    clients: { matchAll, openWindow },
    addEventListener: (_type: string, listener: ClickListener) => {
      onClick = listener;
    },
  });

  // @ts-expect-error public의 서비스 워커 스크립트는 타입 선언이 없다.
  await import('../../../public/firebase-messaging-sw.js');
});

beforeEach(() => {
  matchAll.mockReset();
  openWindow.mockReset();
});

/** 클릭 이벤트를 흘려보내고 waitUntil에 넘긴 작업이 끝날 때까지 기다린다. */
async function click(data?: Record<string, unknown>) {
  let pending: Promise<unknown> = Promise.resolve();
  const event = {
    notification: { data, close: vi.fn() },
    stopImmediatePropagation: vi.fn(),
    waitUntil: (promise: Promise<unknown>) => {
      pending = promise;
    },
  };

  onClick(event);
  await pending;

  return event;
}

const DEEP_LINK = `${ORIGIN}/stories/abc?utm_source=push`;
const fcmData = (link: string) => ({ FCM_MSG: { fcmOptions: { link } } });

it('열린 창이 있으면 SDK 기본 처리를 막고 그 창을 딥링크로 이동한 뒤 앞으로 가져온다', async () => {
  const focus = vi.fn();
  const navigate = vi.fn().mockResolvedValue({ focus });

  matchAll.mockResolvedValue([{ url: `${ORIGIN}/`, navigate }]);

  const event = await click(fcmData(DEEP_LINK));

  expect(event.stopImmediatePropagation).toHaveBeenCalledOnce();
  expect(event.notification.close).toHaveBeenCalledOnce();
  expect(navigate).toHaveBeenCalledWith(DEEP_LINK);
  expect(focus).toHaveBeenCalledOnce();
  expect(openWindow).not.toHaveBeenCalled();
});

it('열린 창이 없으면 새 창으로 딥링크를 연다', async () => {
  matchAll.mockResolvedValue([]);

  await click(fcmData(DEEP_LINK));

  expect(openWindow).toHaveBeenCalledWith(DEEP_LINK);
});

it('창 이동이 실패하면 새 창으로 연다', async () => {
  matchAll.mockResolvedValue([
    { url: `${ORIGIN}/`, navigate: vi.fn().mockRejectedValue(new Error()) },
  ]);

  await click(fcmData(DEEP_LINK));

  expect(openWindow).toHaveBeenCalledWith(DEEP_LINK);
});

it('다른 origin 링크나 링크 없음은 앱 루트로 연다', async () => {
  matchAll.mockResolvedValue([]);

  await click(fcmData('https://evil.example/x'));
  await click(undefined);

  expect(openWindow).toHaveBeenNthCalledWith(1, `${ORIGIN}/`);
  expect(openWindow).toHaveBeenNthCalledWith(2, `${ORIGIN}/`);
});

it('fcmOptions.link가 없으면 data.deepLink를 쓴다', async () => {
  matchAll.mockResolvedValue([]);

  await click({ FCM_MSG: { data: { deepLink: '/notices/n1' } } });

  expect(openWindow).toHaveBeenCalledWith(`${ORIGIN}/notices/n1`);
});
