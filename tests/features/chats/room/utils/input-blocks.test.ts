import { describe, expect, it } from 'vitest';

import {
  createInputBlock,
  parseInputBlocks,
  serializeInputBlocks,
} from '@/features/chats/room/utils/input-blocks';

describe('serializeInputBlocks', () => {
  it('상황은 *...* 마커로 감싸고 대사는 그대로 공백으로 연결한다', () => {
    const blocks = [
      createInputBlock('situation', '비가 온다'),
      createInputBlock('dialogue', '우산 챙겼어?'),
    ];

    expect(serializeInputBlocks(blocks)).toBe('*비가 온다* 우산 챙겼어?');
  });

  it('블럭 순서를 그대로 유지한다', () => {
    const blocks = [
      createInputBlock('dialogue', '누구세요?'),
      createInputBlock('situation', '문이 열린다'),
      createInputBlock('dialogue', '들어오세요'),
    ];

    expect(serializeInputBlocks(blocks)).toBe(
      '누구세요? *문이 열린다* 들어오세요',
    );
  });

  it('값 앞뒤 공백은 잘라내고, 공백뿐인 블럭은 제외한다', () => {
    const blocks = [
      createInputBlock('situation', '  '),
      createInputBlock('dialogue', ' 안녕 '),
      createInputBlock('dialogue', ''),
    ];

    expect(serializeInputBlocks(blocks)).toBe('안녕');
  });

  it('모든 블럭이 비어 있으면 빈 문자열을 반환한다', () => {
    expect(serializeInputBlocks([createInputBlock('situation', ' ')])).toBe('');
    expect(serializeInputBlocks([])).toBe('');
  });
});

describe('parseInputBlocks', () => {
  it('마커 없는 텍스트는 대사 블럭 하나가 된다', () => {
    const blocks = parseInputBlocks('안녕하세요');

    expect(blocks.map((block) => [block.type, block.value])).toEqual([
      ['dialogue', '안녕하세요'],
    ]);
  });

  it('*...* 구간은 상황 블럭, 나머지는 대사 블럭으로 순서대로 분리한다', () => {
    const blocks = parseInputBlocks('*비가 온다* 우산 챙겼어?');

    expect(blocks.map((block) => [block.type, block.value])).toEqual([
      ['situation', '비가 온다'],
      ['dialogue', '우산 챙겼어?'],
    ]);
  });

  it('대사-상황-대사 순서를 유지한다', () => {
    const blocks = parseInputBlocks('누구세요? *문이 열린다* 들어오세요');

    expect(blocks.map((block) => [block.type, block.value])).toEqual([
      ['dialogue', '누구세요?'],
      ['situation', '문이 열린다'],
      ['dialogue', '들어오세요'],
    ]);
  });

  it('볼드(**...**)는 마커를 보존한 채 대사 블럭에 남긴다', () => {
    const blocks = parseInputBlocks('**중요**한 말이야');

    expect(blocks.map((block) => [block.type, block.value])).toEqual([
      ['dialogue', '**중요**한 말이야'],
    ]);
  });

  it('빈 문자열은 빈 배열을 반환한다', () => {
    expect(parseInputBlocks('')).toEqual([]);
  });

  it('줄바꿈으로 나뉜 텍스트도 순서대로 블럭이 된다', () => {
    const blocks = parseInputBlocks('*비가 온다*\n우산 챙겼어?');

    expect(blocks.map((block) => [block.type, block.value])).toEqual([
      ['situation', '비가 온다'],
      ['dialogue', '우산 챙겼어?'],
    ]);
  });

  it('직렬화 결과를 다시 파싱하면 같은 블럭 구성이 된다 (왕복 변환)', () => {
    const original = [
      createInputBlock('situation', '비가 온다'),
      createInputBlock('dialogue', '우산 챙겼어?'),
    ];

    const roundTripped = parseInputBlocks(serializeInputBlocks(original));

    expect(roundTripped.map((block) => [block.type, block.value])).toEqual(
      original.map((block) => [block.type, block.value]),
    );
  });

  it('블럭마다 고유 id를 부여한다', () => {
    const blocks = parseInputBlocks('*비가 온다* 우산 챙겼어?');

    expect(new Set(blocks.map((block) => block.id)).size).toBe(blocks.length);
  });
});
