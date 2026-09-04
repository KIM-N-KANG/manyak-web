import { getGetOriginalStoriesUrl } from '@/api/generated/endpoints/stories/stories';
import type { StorySummaryResponse } from '@/api/generated/models';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

/**
 * 서버 렌더·메타데이터·사이트맵용 타임아웃. 첫 응답(TTFB)에 얹히는 시간이므로
 * 일반 API 타임아웃보다 짧게 잡는다.
 */
const SERVER_FETCH_TIMEOUT_MS = 5 * 1000;

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
      { cache: 'no-store' },
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
