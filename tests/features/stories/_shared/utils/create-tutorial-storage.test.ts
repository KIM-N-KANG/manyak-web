import { describe, expect, it } from 'vitest';

import {
  getNextCreateTutorialStage,
  resolveCreateTutorialStage,
} from '@/features/stories/_shared/utils/create-tutorial-storage';

describe('getNextCreateTutorialStage', () => {
  it('저장값이 없으면 첫 인사부터 보인다', () => {
    expect(getNextCreateTutorialStage(null)).toBe('intro');
  });

  it('마친 단계의 다음 단계를 보인다', () => {
    expect(getNextCreateTutorialStage('intro')).toBe('keyword');
    expect(getNextCreateTutorialStage('additional-info')).toBe('completing');
  });

  it('마지막 단계를 마쳤거나 건너뛰었거나 알 수 없는 값이면 보이지 않는다', () => {
    expect(getNextCreateTutorialStage('completing')).toBeNull();
    expect(getNextCreateTutorialStage('done')).toBeNull();
    expect(getNextCreateTutorialStage('unknown')).toBeNull();
  });
});

describe('resolveCreateTutorialStage', () => {
  it('키워드 화면은 첫 인사와 키워드 안내를 받는다', () => {
    expect(resolveCreateTutorialStage('intro', 'keyword')).toBe('intro');
    expect(resolveCreateTutorialStage('keyword', 'keyword')).toBe('keyword');
  });

  it('다음 단계가 지금 화면의 단계일 때만 연다', () => {
    expect(resolveCreateTutorialStage('storyline', 'storyline')).toBe(
      'storyline',
    );
    expect(resolveCreateTutorialStage('completing', 'completing')).toBe(
      'completing',
    );
  });

  it('앞 단계를 마치지 않고 중간 화면에 들어오면 열지 않는다', () => {
    expect(resolveCreateTutorialStage('intro', 'storyline')).toBeNull();
    expect(resolveCreateTutorialStage('keyword', 'additional-info')).toBeNull();
    expect(resolveCreateTutorialStage('storyline', 'completing')).toBeNull();
  });

  it('끝났거나 화면이 준비되지 않았으면 열지 않는다', () => {
    expect(resolveCreateTutorialStage(null, 'keyword')).toBeNull();
    expect(resolveCreateTutorialStage('intro', null)).toBeNull();
  });
});
