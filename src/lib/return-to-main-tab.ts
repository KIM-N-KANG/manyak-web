import type { useRouter } from 'next/navigation';

import { APP_PATH, type MainAppPath } from '@/constants/app-path';
import { leaveLayers } from '@/lib/history-layers';

type HistoryEntry = { url: string | null; sameDocument: boolean };

/** TypeScript DOM 타입에 아직 없는 Navigation API 중 아래 기록을 읽는 데 쓰는 부분이다. */
type NavigationHistory = {
  currentEntry: { index: number } | null;
  entries: () => HistoryEntry[];
};

const MAIN_TAB_PATHS: readonly string[] = Object.values(APP_PATH.MAIN);

/**
 * 지금 화면 아래에서 가장 가까운 하단 탭 기록을 찾는다.
 *
 * @returns 몇 칸 아래인지와 그 기록. Navigation API가 없거나 아래에 탭 기록이 없으면 null
 */
function findMainTabBelow() {
  const navigation = (window as Window & { navigation?: NavigationHistory })
    .navigation;
  const index = navigation?.currentEntry?.index;

  if (!navigation || index === undefined) return null;

  const entries = navigation.entries();

  for (let distance = 1; distance <= index; distance++) {
    const entry = entries[index - distance];

    if (!entry?.url) return null;

    const { pathname } = new URL(entry.url);

    if (MAIN_TAB_PATHS.includes(pathname)) {
      return { distance, pathname, sameDocument: entry.sameDocument };
    }
  }

  return null;
}

/**
 * Android의 popToMainTabs처럼 쌓인 화면을 걷어내고 하단 탭 tab으로 돌아간다.
 *
 * 아래 탭 기록이 tab이면 거기까지 뒤로 가고, 다른 탭이면 거기까지 뒤로 간 뒤 tab을 쌓아 걷어낸 화면이
 * 앞으로 가기에도 남지 않게 한다. 지금 화면을 탭으로 바꾸기만 하면 들어온 탭이 기록에 두 번 남아
 * 뒤로가기 한 번이 아무 변화를 만들지 않는다. 아래 기록을 알 수 없거나 탭 기록이 이전 문서(새로고침 전)에
 * 있으면 지금 화면을 tab으로 바꾼다. 이전 문서로 돌아가면 문서를 다시 열어 떠나며 띄운 토스트가 사라지고
 * 이어서 이동할 수도 없다.
 *
 * @param router 앱 라우터
 * @param tab 돌아갈 하단 탭 경로
 */
export function returnToMainTab(
  router: ReturnType<typeof useRouter>,
  tab: MainAppPath,
) {
  // 확인 다이얼로그 같은 레이어의 더미를 먼저 소비해야 아래 탭 기록까지의 거리가 맞는다.
  leaveLayers(() => {
    const below = findMainTabBelow();

    if (!below?.sameDocument) {
      router.replace(tab);

      return;
    }

    if (below.pathname !== tab) {
      window.addEventListener('popstate', () => router.push(tab), {
        once: true,
      });
    }

    window.history.go(-below.distance);
  });
}
