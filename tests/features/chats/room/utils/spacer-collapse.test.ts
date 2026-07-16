import { describe, expect, it } from 'vitest';

import { computeCollapsedSpacerHeight } from '@/features/chats/room/utils/spacer-collapse';

describe('computeCollapsedSpacerHeight', () => {
  it('맨 아래(여유 스크롤 0)에서는 스페이서를 줄이지 않는다', () => {
    expect(
      computeCollapsedSpacerHeight({
        spacerHeight: 300,
        scrollTop: 1000,
        scrollHeight: 1600,
        clientHeight: 600,
      }),
    ).toBe(300);
  });

  it('위로 스크롤한 만큼(여유 스크롤)만 스페이서를 회수한다', () => {
    expect(
      computeCollapsedSpacerHeight({
        spacerHeight: 300,
        scrollTop: 900,
        scrollHeight: 1600,
        clientHeight: 600,
      }),
    ).toBe(200);
  });

  it('여유 스크롤이 스페이서보다 크면 0으로 전부 회수한다', () => {
    expect(
      computeCollapsedSpacerHeight({
        spacerHeight: 300,
        scrollTop: 0,
        scrollHeight: 1600,
        clientHeight: 600,
      }),
    ).toBe(0);
  });

  it('러버밴드 등으로 여유 스크롤이 음수면 그대로 유지한다', () => {
    expect(
      computeCollapsedSpacerHeight({
        spacerHeight: 300,
        scrollTop: 1100,
        scrollHeight: 1600,
        clientHeight: 600,
      }),
    ).toBe(300);
  });

  it('스페이서가 0이면 0을 유지한다', () => {
    expect(
      computeCollapsedSpacerHeight({
        spacerHeight: 0,
        scrollTop: 100,
        scrollHeight: 1600,
        clientHeight: 600,
      }),
    ).toBe(0);
  });
});
