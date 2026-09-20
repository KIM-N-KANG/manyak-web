import { getGetOriginalStoriesUrl } from '@/api/generated/endpoints/stories/stories';
import type { StorySummaryResponse } from '@/api/generated/models';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

/**
 * 서버 렌더·메타데이터·사이트맵용 타임아웃. 첫 응답(TTFB)에 얹히는 시간이므로
 * 일반 API 타임아웃보다 짧게 잡는다.
 */
const SERVER_FETCH_TIMEOUT_MS = 5 * 1000;

/** 서버 데이터 캐시에 오리지널 목록을 재사용하는 시간. */
const SERVER_FETCH_REVALIDATE_SECONDS = 60;

/**
 * 서버(BFF)에서 오리지널 스토리 목록을 백엔드에 직접 읽는다.
 *
 * 홈 서버 렌더·스토리 상세 메타데이터·사이트맵이 공유한다. 오리지널 목록은 인증이
 * 필요 없어 세션 없이 호출할 수 있다. 생성된 훅/함수는 브라우저 → /api 프록시 경유가
 * 전제라 쓰지 않고, 경로만 생성된 URL 빌더를 재사용해 스펙 드리프트를 막는다.
 *
 * 어떤 실패에도 throw하지 않는다. 서버 조회가 실패하면 홈은 클라이언트 조회로
 * 폴백하고, 메타데이터·사이트맵은 오리지널이 없는 것으로 다룬다.
 *
 * @returns 오리지널 스토리 요약 목록. 읽지 못하면 null
 */
export async function fetchOriginalStoriesOnServer(): Promise<
  StorySummaryResponse[] | null
> {
  const baseUrl = process.env.API_BASE_URL?.replace(/\/+$/, '');

  if (!baseUrl) {
    return null;
  }

  try {
    const response = await fetchWithTimeout(
      `${baseUrl}${getGetOriginalStoriesUrl()}`,
      // 오리지널 목록은 자주 바뀌지 않아 서버 데이터 캐시로 60초 재사용한다. `no-store`였을 때는
      // 홈이 요청마다 서버 렌더돼 탭 이동마다 백엔드를 기다렸고, 재검증 fetch로 바꾸면 동적
      // API가 없는 홈은 60초 ISR 정적 페이지가 돼 CDN·라우터 캐시에서 즉시 열린다.
      // 사이트맵(force-dynamic)·상세 메타데이터도 같은 캐시를 써 최대 60초 늦은 목록을 본다.
      { next: { revalidate: SERVER_FETCH_REVALIDATE_SECONDS } },
      SERVER_FETCH_TIMEOUT_MS,
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as StorySummaryResponse[];
  } catch {
    return null;
  }
}
