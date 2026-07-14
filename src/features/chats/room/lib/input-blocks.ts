import { createClientId } from '@/lib/create-client-id';
import { parseTextSegments } from '@/lib/parse-text-segments';

export type InputBlockType = 'situation' | 'dialogue';

export type InputBlock = {
  id: string;
  type: InputBlockType;
  value: string;
};

/**
 * 고유 ID가 부여된 입력 블럭을 생성한다.
 *
 * @param type 생성할 블럭 종류(묘사/대사)
 * @param value 블럭 초기 값(기본값 빈 문자열)
 * @returns 고유 ID가 부여된 입력 블럭
 */
export function createInputBlock(type: InputBlockType, value = ''): InputBlock {
  return { id: createClientId(), type, value };
}

/**
 * 블럭 입력 모드의 기본 상태. 묘사 1개와 대사 1개를 순서대로 보여준다.
 *
 * @returns 묘사 블럭과 대사 블럭으로 구성된 기본 블럭 목록
 */
export function createDefaultInputBlocks(): InputBlock[] {
  return [createInputBlock('situation'), createInputBlock('dialogue')];
}

/**
 * 블럭들을 서버 전송용 텍스트로 직렬화한다.
 * 상황은 *...* 강조 마커로 감싸고, 빈 블럭은 제외하며, 순서대로 구분자로 연결한다.
 *
 * @param blocks 직렬화할 입력 블럭 목록
 * @param separator 블럭 사이를 연결할 구분자(기본값 공백)
 * @returns 서버 전송용으로 직렬화된 텍스트
 */
export function serializeInputBlocks(
  blocks: InputBlock[],
  separator = ' ',
): string {
  return blocks
    .map((block) => {
      const value = block.value.trim();

      if (!value) return '';

      return block.type === 'situation' ? `*${value}*` : value;
    })
    .filter(Boolean)
    .join(separator);
}

/**
 * *...* 강조 마커가 포함된 텍스트를 블럭 목록으로 변환한다.
 * 강조 구간은 상황 블럭, 나머지는 대사 블럭이 되며 원문 순서를 유지한다.
 * 볼드(**...**)는 마커를 보존한 채 대사 블럭에 남긴다.
 *
 * @param text 변환할 원본 텍스트
 * @returns 원문 순서를 유지한 입력 블럭 목록
 */
export function parseInputBlocks(text: string): InputBlock[] {
  const blocks: InputBlock[] = [];

  for (const line of text.split('\n')) {
    let dialogueBuffer = '';

    const flushDialogue = () => {
      const value = dialogueBuffer.trim();

      if (value) {
        blocks.push(createInputBlock('dialogue', value));
      }

      dialogueBuffer = '';
    };

    for (const segment of parseTextSegments(line)) {
      if (segment.emphasis) {
        flushDialogue();

        const value = segment.text.trim();

        if (value) {
          blocks.push(createInputBlock('situation', value));
        }
      } else {
        dialogueBuffer += segment.bold ? `**${segment.text}**` : segment.text;
      }
    }

    flushDialogue();
  }

  return blocks;
}
