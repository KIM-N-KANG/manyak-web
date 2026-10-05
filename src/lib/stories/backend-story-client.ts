import { getGetPublicStoriesUrl } from '@/api/generated/endpoints/stories/stories';
import type {
  GetPublicStoriesParams,
  StoryPageResponse,
  StorySummaryResponse,
} from '@/api/generated/models';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

/**
 * 서버 렌더·메타데이터·사이트맵용 타임아웃. 첫 응답(TTFB)에 얹히는 시간이므로
 * 일반 API 타임아웃보다 짧게 잡는다.
 */
const SERVER_FETCH_TIMEOUT_MS = 5 * 1000;

/** 서버 데이터 캐시에 공개 목록을 재사용하는 시간. */
const SERVER_FETCH_REVALIDATE_SECONDS = 60;

/** 오리지널 목록을 한 번에 읽는 개수. 서버가 1~50으로 보정한다. */
const ORIGINAL_PAGE_LIMIT = 50;

/** 오리지널 목록을 읽는 최대 페이지 수. 커서가 끝나지 않아도 요청이 무한히 이어지지 않게 막는다. */
const ORIGINAL_MAX_PAGES = 10;

/**
 * 서버(BFF)에서 인증 없는 공개 조회 API를 백엔드에 직접 읽는다.
 *
 * 생성된 훅/함수는 브라우저 → /api 프록시 경유가 전제라 쓰지 않고, 경로만 생성된
 * URL 빌더를 재사용해 스펙 드리프트를 막는다. 어떤 실패에도 throw하지 않는다.
 *
 * @param path 생성된 URL 빌더가 만든 API 경로
 * @returns 응답 본문. 읽지 못하면 null
 */
async function fetchPublicOnServer<T>(path: string): Promise<T | null> {
  const baseUrl = process.env.API_BASE_URL?.replace(/\/+$/, '');

  if (!baseUrl) {
    return null;
  }

  try {
    const response = await fetchWithTimeout(
      `${baseUrl}${path}`,
      // 공개 목록은 자주 바뀌지 않아 서버 데이터 캐시로 60초 재사용한다. `no-store`였을 때는
      // 홈이 요청마다 서버 렌더돼 탭 이동마다 백엔드를 기다렸고, 재검증 fetch로 바꾸면 동적
      // API가 없는 홈은 60초 ISR 정적 페이지가 돼 CDN·라우터 캐시에서 즉시 열린다.
      // 사이트맵(force-dynamic)·상세 메타데이터도 같은 캐시를 써 최대 60초 늦은 목록을 본다.
      { next: { revalidate: SERVER_FETCH_REVALIDATE_SECONDS } },
      SERVER_FETCH_TIMEOUT_MS,
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/**
 * 서버(BFF)에서 공개 스토리 목록의 첫 페이지를 백엔드에 직접 읽는다.
 *
 * 홈 서버 렌더가 검색 크롤러용 첫 HTML에 목록을 싣는 데 쓴다. 실패하면 홈은 클라이언트 조회로 폴백한다.
 *
 * @param params 필터·정렬
 * @returns 첫 페이지 응답. 읽지 못하면 null
 */
export function fetchPublicStoriesOnServer(
  params: GetPublicStoriesParams,
): Promise<StoryPageResponse | null> {
  return fetchPublicOnServer(getGetPublicStoriesUrl(params));
}

/**
 * 서버(BFF)에서 오리지널 스토리 전체를 `GET /stories?filter=original` 커서로 이어 읽는다.
 *
 * 스토리 상세 메타데이터·사이트맵이 공유한다. 한 페이지라도 실패하면 일부만 보고 오리지널
 * 여부를 잘못 판정하지 않도록 전체를 읽지 못한 것으로 다룬다.
 *
 * @returns 오리지널 스토리 요약 목록. 읽지 못하면 null
 */
export async function fetchOriginalStoriesOnServer(): Promise<
  StorySummaryResponse[] | null
> {
  const stories: StorySummaryResponse[] = [];
  let cursor: string | undefined;

  // ponytail: 최대 500편까지만 읽는다. 오리지널이 그보다 많아지면 상한을 올리거나 단건 판정 API로 바꾼다.
  for (let page = 0; page < ORIGINAL_MAX_PAGES; page += 1) {
    const response = await fetchPublicStoriesOnServer({
      filter: 'original',
      sort: 'latest',
      limit: ORIGINAL_PAGE_LIMIT,
      ...(cursor ? { cursor } : {}),
    });

    if (!response) {
      return null;
    }

    stories.push(...(response.items ?? []));
    cursor = response.nextCursor ?? undefined;

    if (!cursor) {
      break;
    }
  }

  return stories;
}
