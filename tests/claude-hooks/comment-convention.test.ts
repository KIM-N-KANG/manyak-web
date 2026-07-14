import { describe, expect, it } from 'vitest';

import { shouldCheckFile } from '../../.claude/hooks/comment-convention/analyze.mjs';

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
