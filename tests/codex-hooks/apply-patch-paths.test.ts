import { describe, expect, it } from 'vitest';

import { extractEditedPaths } from '../../.codex/hooks/comment-convention/apply-patch.mjs';

describe('extractEditedPaths', () => {
  it('apply_patch 본문의 Update/Add File 경로를 뽑는다', () => {
    const patch = [
      '*** Begin Patch',
      '*** Update File: src/features/a/utils/x.ts',
      '@@',
      '+const a = 1;',
      '*** Add File: src/features/a/utils/y.ts',
      '+export const b = 2;',
      '*** End Patch',
    ].join('\n');
    const input = { tool_name: 'apply_patch', tool_input: { input: patch } };

    expect(extractEditedPaths(input)).toEqual([
      'src/features/a/utils/x.ts',
      'src/features/a/utils/y.ts',
    ]);
  });

  it('tool_input이 JSON 객체로 감싸져 문자열화돼도 경로를 뽑는다', () => {
    const input = {
      tool_input: { patch: '*** Update File: src/a/z.ts\n@@\n+x' },
    };

    expect(extractEditedPaths(input)).toEqual(['src/a/z.ts']);
  });

  it('Move to(리네임) 대상 경로도 포함한다', () => {
    const input = {
      tool_input: {
        input:
          '*** Update File: src/a/old.ts\n*** Move to: src/a/new.ts\n@@\n+x',
      },
    };

    expect(extractEditedPaths(input)).toEqual(['src/a/old.ts', 'src/a/new.ts']);
  });

  it('Edit/Write 호환: tool_input.file_path가 있으면 함께 사용한다', () => {
    const input = { tool_input: { file_path: '/repo/src/a/w.ts' } };

    expect(extractEditedPaths(input)).toEqual(['/repo/src/a/w.ts']);
  });

  it('편집 정보가 없으면 빈 배열', () => {
    expect(extractEditedPaths({ tool_input: {} })).toEqual([]);
  });
});
