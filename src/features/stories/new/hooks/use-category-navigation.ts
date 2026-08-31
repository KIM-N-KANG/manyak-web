'use client';

import { useState } from 'react';

import { track } from '@/observability/analytics';

import { TAG_CATEGORIES } from '../constants';
import type { TagCategory } from '../types';

const CATEGORY_VALUES = TAG_CATEGORIES.map(({ value }) => value);

type UseCategoryNavigationArgs = {
  isCategoryComplete: (category: TagCategory) => boolean;
};

/**
 * 키워드 스텝의 카테고리 탭 이동(버튼/스와이프)과 잠금 규칙을 관리한다.
 *
 * @param isCategoryComplete 해당 카테고리의 필수 선택이 완료됐는지 판별하는 함수
 * @returns 현재 카테고리와 이동·잠금 상태 및 이동 함수들
 */
export function useCategoryNavigation({
  isCategoryComplete,
}: UseCategoryNavigationArgs) {
  const [activeCategory, setActiveCategory] = useState<TagCategory>('GENRE');

  const activeIndex = CATEGORY_VALUES.indexOf(activeCategory);
  const isFirstCategory = activeIndex === 0;
  const isLastCategory = activeIndex === CATEGORY_VALUES.length - 1;

  const isCategoryUnlocked = (category: TagCategory) => {
    const index = CATEGORY_VALUES.indexOf(category);

    return TAG_CATEGORIES.slice(0, index).every(
      ({ value, required }) => !required || isCategoryComplete(value),
    );
  };

  /**
   * 카테고리 이동을 처리하는 단일 진입점. 버튼('다음'/'이전')과 탭 클릭·스와이프가
   * 모두 이 함수를 거치므로, 이동 방향과 함께 이벤트를 한 곳에서 추적한다.
   */
  const changeCategory = (nextCategory: TagCategory) => {
    if (nextCategory === activeCategory) {
      return;
    }

    const direction =
      CATEGORY_VALUES.indexOf(nextCategory) > activeIndex
        ? 'forward'
        : 'backward';

    track('client_storyCreate_tagCategory_selected', {
      from_category: activeCategory,
      to_category: nextCategory,
      direction,
    });

    setActiveCategory(nextCategory);
  };

  const goToNextCategory = () => {
    const nextCategory = CATEGORY_VALUES[activeIndex + 1];

    if (nextCategory) {
      changeCategory(nextCategory);
    }
  };

  const goToPreviousCategory = () => {
    const previousCategory = CATEGORY_VALUES[activeIndex - 1];

    if (previousCategory) {
      changeCategory(previousCategory);
    }
  };

  /** 저장본 복원 시 활성 탭을 영속하지 않고 첫 카테고리로 돌린다. */
  const resetActiveCategory = () => setActiveCategory('GENRE');

  return {
    activeCategory,
    changeCategory,
    isCategoryUnlocked,
    isFirstCategory,
    isLastCategory,
    goToNextCategory,
    goToPreviousCategory,
    resetActiveCategory,
  };
}
