/** `navigator.share` 실패를 어떻게 처리할지 나타내는 값. */
export type ShareFailure = 'cancelled' | 'fallback';

/**
 * `navigator.share`가 던진 오류를 취소와 실패로 가른다.
 *
 * 사용자가 공유 시트를 그냥 닫으면 AbortError로 reject되는데 이건 실패가 아니라
 * 취소다. 여기서 클립보드 폴백을 타면 "안 보낼래" 하고 닫은 사람의 클립보드를
 * 덮어쓰게 된다.
 *
 * @param error share()가 던진 값
 * @returns 취소면 'cancelled', 폴백해야 하면 'fallback'
 */
export function classifyShareFailure(error: unknown): ShareFailure {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'cancelled';
  }

  return 'fallback';
}
