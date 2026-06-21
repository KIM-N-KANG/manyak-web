import { describe, expect, it } from 'vitest';

import { insertEmphasisMarkers } from './insert-emphasis-markers';

describe('insertEmphasisMarkers', () => {
  it('inserts ** and places the cursor between the markers when nothing is selected', () => {
    const result = insertEmphasisMarkers('', 0, 0);

    expect(result.value).toBe('**');
    expect(result.cursorStart).toBe(1);
    expect(result.cursorEnd).toBe(1);
  });

  it('inserts at the caret position inside existing text', () => {
    const result = insertEmphasisMarkers('가나다', 2, 2);

    expect(result.value).toBe('가나**다');
    expect(result.cursorStart).toBe(3);
    expect(result.cursorEnd).toBe(3);
  });

  it('wraps the selected text and keeps the inner text selected', () => {
    const result = insertEmphasisMarkers('가나다', 1, 2);

    expect(result.value).toBe('가*나*다');
    expect(result.cursorStart).toBe(2);
    expect(result.cursorEnd).toBe(3);
  });
});
