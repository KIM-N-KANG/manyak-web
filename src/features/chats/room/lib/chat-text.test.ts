import { describe, expect, it } from 'vitest';

import { parseEmphasisSegments } from './chat-text';

describe('parseEmphasisSegments', () => {
  it('marks a single *...* region as emphasis and strips the markers', () => {
    expect(parseEmphasisSegments('앞 *강조* 뒤')).toEqual([
      { text: '앞 ', emphasis: false },
      { text: '강조', emphasis: true },
      { text: ' 뒤', emphasis: false },
    ]);
  });

  it('treats a fully wrapped line as one emphasis segment', () => {
    expect(parseEmphasisSegments('*속마음입니다*')).toEqual([
      { text: '속마음입니다', emphasis: true },
    ]);
  });

  it('does NOT treat double ** as emphasis', () => {
    expect(parseEmphasisSegments('**굵게**')).toEqual([
      { text: '**굵게**', emphasis: false },
    ]);
  });

  it('handles multiple emphasis regions on one line', () => {
    expect(parseEmphasisSegments('*A* 그리고 *B*')).toEqual([
      { text: 'A', emphasis: true },
      { text: ' 그리고 ', emphasis: false },
      { text: 'B', emphasis: true },
    ]);
  });

  it('returns plain text when there is no emphasis', () => {
    expect(parseEmphasisSegments('일반 문장')).toEqual([
      { text: '일반 문장', emphasis: false },
    ]);
  });
});
