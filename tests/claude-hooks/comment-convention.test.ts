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

describe('analyzeSource - 훅/유틸 JSDoc', () => {
  it('완전한 JSDoc 유틸은 통과', () => {
    const src = [
      '/**',
      ' * 날짜를 포맷한다.',
      ' * @param date 대상 날짜',
      ' * @returns 포맷 문자열',
      ' */',
      'export function formatDate(date: Date): string {',
      '  return String(date);',
      '}',
    ].join('\n');

    expect(analyzeSource(src, 'src/a/utils/format.ts')).toEqual([]);
  });

  it('JSDoc 없는 유틸은 missing-jsdoc', () => {
    const src = `export function formatDate(date: Date): string {\n  return String(date);\n}`;
    const v = analyzeSource(src, 'src/a/utils/format.ts');

    expect(v.map((x) => x.kind)).toContain('missing-jsdoc');
  });

  it('@param 누락은 missing-param', () => {
    const src = [
      '/**',
      ' * 더한다.',
      ' * @returns 합',
      ' */',
      'export function add(a: number, b: number): number {',
      '  return a + b;',
      '}',
    ].join('\n');
    const v = analyzeSource(src, 'src/a/utils/add.ts');

    expect(v.filter((x) => x.kind === 'missing-param')).toHaveLength(2);
  });

  it('값 반환인데 @returns 누락은 missing-returns', () => {
    const src = [
      '/**',
      ' * 하나 증가.',
      ' * @param a 입력',
      ' */',
      'export const inc = (a: number) => a + 1;',
    ].join('\n');
    const v = analyzeSource(src, 'src/a/utils/inc.ts');

    expect(v.map((x) => x.kind)).toContain('missing-returns');
  });

  it('throw 있는데 @throws 누락은 missing-throws', () => {
    const src = [
      '/**',
      ' * 검증.',
      ' * @param ok 여부',
      ' */',
      'export function assertOk(ok: boolean): void {',
      '  if (!ok) throw new Error("no");',
      '}',
    ].join('\n');
    const v = analyzeSource(src, 'src/a/utils/assert.ts');

    expect(v.map((x) => x.kind)).toContain('missing-throws');
  });

  it('use 훅도 JSDoc 필수', () => {
    const src = `export function useThing() {\n  return 1;\n}`;
    const v = analyzeSource(src, 'src/a/hooks/use-thing.ts');

    expect(v.map((x) => x.kind)).toContain('missing-jsdoc');
  });

  it('컴포넌트 내부 핸들러는 JSDoc 요구하지 않는다', () => {
    const src = [
      'export function Card() {',
      '  const handleClick = (e: unknown) => { console.log(e); };',
      '  return <button onClick={handleClick} />;',
      '}',
    ].join('\n');

    expect(analyzeSource(src, 'src/a/components/card.tsx')).toEqual([]);
  });

  it('제외 경로는 위반 코드라도 통과 (shouldCheckFile 게이트)', () => {
    expect(shouldCheckFile('src/api/generated/x.ts')).toBe(false);
  });

  it('중첩 객체 메서드의 return은 유틸의 @returns를 요구하지 않는다', () => {
    const src = [
      '/**',
      ' * 설명.',
      ' * @param a 입력',
      ' */',
      'export function util(a) {',
      '  const obj = { method() { return 5; } };',
      '}',
    ].join('\n');
    const v = analyzeSource(src, 'src/a/utils/util.ts');

    expect(v).toEqual([]);
  });

  it('중첩 객체 메서드의 throw는 유틸의 @throws를 요구하지 않는다', () => {
    const src = [
      '/**',
      ' * 설명.',
      ' * @param a 입력',
      ' * @returns 객체',
      ' */',
      'export function build(a) {',
      '  const obj = { method() { throw new Error("x"); } };',
      '  return obj;',
      '}',
    ].join('\n');
    const v = analyzeSource(src, 'src/a/utils/build.ts');

    expect(v.map((x) => x.kind)).not.toContain('missing-throws');
  });
});
