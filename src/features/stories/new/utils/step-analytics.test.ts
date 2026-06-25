import { describe, expect, it } from 'vitest';

import { mapStepToSpec } from './step-analytics';

describe('mapStepToSpec', () => {
  it('코드 step을 스펙 step_name/step_number로 매핑한다', () => {
    expect(mapStepToSpec('keyword')).toEqual({
      step_name: 'keyword',
      step_number: 1,
    });
    expect(mapStepToSpec('storyline-select')).toEqual({
      step_name: 'storylineSelect',
      step_number: 2,
    });
    expect(mapStepToSpec('additional-info')).toEqual({
      step_name: 'additionalInfo',
      step_number: 3,
    });
    expect(mapStepToSpec('complete')).toEqual({
      step_name: 'complete',
      step_number: 4,
    });
  });
});
