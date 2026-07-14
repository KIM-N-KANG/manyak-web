import { describe, expect, it } from 'vitest';

import {
  analyzeSource,
  shouldCheckFile,
} from '../../.claude/hooks/comment-convention/analyze.mjs';

describe('shouldCheckFile', () => {
  it('src 아래 .ts / .tsx 는 검사한다', () => {
    expect(shouldCheckFile('/repo/src/features/a/utils/x.ts')).toBe(true);
    expect(shouldCheckFile('/repo/src/features/a/components/x.tsx')).toBe(true);
  });

  it('생성 코드/테스트/비대상 확장자는 제외한다', () => {
    expect(shouldCheckFile('/repo/src/api/generated/endpoints/x.ts')).toBe(
      false,
    );
    expect(shouldCheckFile('/repo/src/features/a/x.test.ts')).toBe(false);
    expect(shouldCheckFile('/repo/e2e/flow.spec.ts')).toBe(false);
    expect(shouldCheckFile('/repo/tests/lib/x.test.ts')).toBe(false);
    expect(shouldCheckFile('/repo/src/app/globals.css')).toBe(false);
    expect(shouldCheckFile('/repo/README.md')).toBe(false);
  });
});

describe('analyzeSource - 컴포넌트 주석 금지', () => {
  it('주석 없는 컴포넌트는 통과', () => {
    const src = `export function StoryCard() {\n  return <div />;\n}`;

    expect(
      analyzeSource(src, 'src/features/a/components/story-card.tsx'),
    ).toEqual([]);
  });

  it('컴포넌트 위 설명 주석은 위반', () => {
    const src = `// 스토리 카드\nexport function StoryCard() {\n  return <div />;\n}`;
    const v = analyzeSource(src, 'src/features/a/components/story-card.tsx');

    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('component-comment');
    expect(v[0].name).toBe('StoryCard');
  });

  it('컴포넌트 위 도구 지시자 주석은 허용', () => {
    const src = `// eslint-disable-next-line react/display-name\nexport const Row = () => <div />;`;

    expect(analyzeSource(src, 'src/features/a/components/row.tsx')).toEqual([]);
  });

  it('컴포넌트 내부 주석은 위반', () => {
    const src = `export function Card() {\n  // 내부 설명\n  return <div />;\n}`;
    const v = analyzeSource(src, 'src/features/a/components/card.tsx');

    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('component-comment');
  });

  it('PascalCase 화살표 / forwardRef 도 컴포넌트로 본다', () => {
    const arrow = `/** 카드 */\nexport const Card = () => <div />;`;

    expect(analyzeSource(arrow, 'src/a/components/card.tsx')[0].kind).toBe(
      'component-comment',
    );

    const fwd = `/** 인풋 */\nexport const Input = forwardRef((p, ref) => <input ref={ref} />);`;

    expect(analyzeSource(fwd, 'src/a/components/input.tsx')[0].kind).toBe(
      'component-comment',
    );
  });

  it('컴포넌트 위 도구 지시자 뒤에 숨은 설명 주석도 위반', () => {
    const src = `// TODO: 리팩터링 필요\n// eslint-disable-next-line react/display-name\nexport const Foo = () => <div />;`;
    const v = analyzeSource(src, 'src/a/components/foo.tsx');

    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('component-comment');
  });
});
