import { describe, expect, it } from 'vitest';

import { resolvePaymentRewindDistance } from '@/features/my/credits/utils/payment-return-history';

describe('resolvePaymentRewindDistance', () => {
  it('결제창과 완료 화면을 지나 돌아오면 결제 전 화면까지의 칸 수를 돌려준다', () => {
    // [마이, 충전(0..1), 결제창(2), 완료(3), 복귀(4)] — 기록 길이 3, 복귀 길이 5
    expect(resolvePaymentRewindDistance('3', 5)).toBe(3);
  });

  it('결제창 한 칸만 지난 복귀는 두 칸을 되감는다', () => {
    expect(resolvePaymentRewindDistance('3', 4)).toBe(2);
  });

  it('기록이 없거나 손상됐으면 되감지 않는다', () => {
    expect(resolvePaymentRewindDistance(null, 5)).toBeNull();
    expect(resolvePaymentRewindDistance('', 5)).toBeNull();
    expect(resolvePaymentRewindDistance('abc', 5)).toBeNull();
    expect(resolvePaymentRewindDistance('2.5', 5)).toBeNull();
    expect(resolvePaymentRewindDistance('1', 5)).toBeNull();
  });

  it('히스토리 상한에 닿았으면 오래된 칸이 버려졌을 수 있어 되감지 않는다', () => {
    expect(resolvePaymentRewindDistance('40', 49)).toBe(10);
    expect(resolvePaymentRewindDistance('40', 50)).toBeNull();
  });

  it('결제창 칸이 끼지 않은 길이 관계는 되감지 않는다', () => {
    expect(resolvePaymentRewindDistance('5', 5)).toBeNull();
    expect(resolvePaymentRewindDistance('5', 4)).toBeNull();
  });

  it('소스만으로 실행해도 같은 결과를 낸다(복귀 문서 인라인 스크립트)', () => {
    const serialized = new Function(
      `return (${resolvePaymentRewindDistance.toString()})`,
    )() as typeof resolvePaymentRewindDistance;

    expect(serialized('3', 5)).toBe(3);
    expect(serialized('40', 50)).toBeNull();
    expect(serialized(null, 5)).toBeNull();
  });
});
