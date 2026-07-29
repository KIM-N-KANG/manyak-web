import { getGetChatShareUrl } from '@/api/generated/endpoints/chats/chats';
import type { ChatShareResponse } from '@/api/generated/models';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

/**
 * 메타데이터 생성용 타임아웃. 링크 미리보기 때문에 페이지 응답이 오래 잡히면 안 되므로
 * 일반 API 타임아웃보다 짧게 잡는다.
 */
const METADATA_TIMEOUT_MS = 5 * 1000;

/**
 * generateMetadata에서 공유본을 읽는다.
 *
 * 생성된 훅/함수는 브라우저 → /api 프록시 경유가 전제라(customInstance가 URL을
 * 상대경로로 바꾼다) 서버 내부 호출에는 쓸 수 없다. 다만 경로는 생성된 URL 빌더를
 * 재사용해 백엔드 스펙과의 드리프트를 막는다.
 *
 * 어떤 실패에도 throw하지 않는다. 메타데이터 때문에 페이지가 죽으면 안 되고,
 * 백엔드에 닿지 못하는 환경에서도 화면 자체는 떠야 한다.
 *
 * @param shareId 공유 열람 토큰
 * @returns 공유본. 없거나 읽지 못하면 null
 */
export async function fetchSharedChatForMetadata(
  shareId: string,
): Promise<ChatShareResponse | null> {
  const baseUrl = process.env.API_BASE_URL?.replace(/\/+$/, '');

  if (!baseUrl) {
    return null;
  }

  try {
    const response = await fetchWithTimeout(
      `${baseUrl}${getGetChatShareUrl(shareId)}`,
      { cache: 'no-store' },
      METADATA_TIMEOUT_MS,
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ChatShareResponse;
  } catch {
    return null;
  }
}
