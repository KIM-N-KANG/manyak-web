import { parseTextSegments } from '@/lib/parse-text-segments';

export type InputBlockType = 'situation' | 'dialogue';

export type InputBlock = {
  id: string;
  type: InputBlockType;
  value: string;
};

export function createInputBlock(type: InputBlockType, value = ''): InputBlock {
  return { id: crypto.randomUUID(), type, value };
}

/**
 * 블럭들을 서버 전송용 텍스트로 직렬화한다.
 * 상황은 *...* 강조 마커로 감싸고, 빈 블럭은 제외하며, 순서대로 공백으로 연결한다.
 */
export function serializeInputBlocks(blocks: InputBlock[]): string {
  return blocks
    .map((block) => {
      const value = block.value.trim();

      if (!value) return '';

      return block.type === 'situation' ? `*${value}*` : value;
    })
    .filter(Boolean)
    .join(' ');
}

/**
 * *...* 강조 마커가 포함된 텍스트를 블럭 목록으로 변환한다.
 * 강조 구간은 상황 블럭, 나머지는 대사 블럭이 되며 원문 순서를 유지한다.
 * 볼드(**...**)는 마커를 보존한 채 대사 블럭에 남긴다.
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
