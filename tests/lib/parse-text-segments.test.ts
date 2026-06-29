import { describe, expect, it } from 'vitest';

import { parseTextSegments } from '@/lib/parse-text-segments';

describe('parseTextSegments', () => {
  it('marks a single *...* region as emphasis and strips the markers', () => {
    expect(parseTextSegments('앞 *강조* 뒤')).toEqual([
      { text: '앞 ', emphasis: false, bold: false },
      { text: '강조', emphasis: true, bold: false },
      { text: ' 뒤', emphasis: false, bold: false },
    ]);
  });

  it('treats a fully wrapped line as one emphasis segment', () => {
    expect(parseTextSegments('*속마음입니다*')).toEqual([
      { text: '속마음입니다', emphasis: true, bold: false },
    ]);
  });

  it('marks a **...** region as bold and strips the markers', () => {
    expect(parseTextSegments('**지훈:** 안녕')).toEqual([
      { text: '지훈:', emphasis: false, bold: true },
      { text: ' 안녕', emphasis: false, bold: false },
    ]);
  });

  it('treats a fully wrapped line as one bold segment', () => {
    expect(parseTextSegments('**굵게**')).toEqual([
      { text: '굵게', emphasis: false, bold: true },
    ]);
  });

  it('handles bold and emphasis on the same line', () => {
    expect(parseTextSegments('**지훈:** *차분하게*')).toEqual([
      { text: '지훈:', emphasis: false, bold: true },
      { text: ' ', emphasis: false, bold: false },
      { text: '차분하게', emphasis: true, bold: false },
    ]);
  });

  it('handles multiple emphasis regions on one line', () => {
    expect(parseTextSegments('*A* 그리고 *B*')).toEqual([
      { text: 'A', emphasis: true, bold: false },
      { text: ' 그리고 ', emphasis: false, bold: false },
      { text: 'B', emphasis: true, bold: false },
    ]);
  });

  it('returns plain text when there is no marker', () => {
    expect(parseTextSegments('일반 문장')).toEqual([
      { text: '일반 문장', emphasis: false, bold: false },
    ]);
  });
});
