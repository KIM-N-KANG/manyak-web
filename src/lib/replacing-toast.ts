import { toast } from 'sonner';

let current: string | number | undefined;

/**
 * 직전에 이 함수로 띄운 토스트를 지우고 새로 띄운다.
 * 잠긴 입력창 탭이나 이프 부족처럼 연타를 거를 가드가 없는 자리에서 같은 문구가
 * 누른 횟수만큼 쌓이지 않게 한다.
 *
 * @param message 토스트 문구
 * @param variant 오류 토스트 여부(기본은 일반)
 */
export function showReplacingToast(
  message: string,
  variant: 'default' | 'error' = 'default',
): void {
  if (current !== undefined) toast.dismiss(current);

  current = variant === 'error' ? toast.error(message) : toast(message);
}
