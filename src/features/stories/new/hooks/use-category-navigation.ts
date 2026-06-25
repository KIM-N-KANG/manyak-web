'use client';

import { useState } from 'react';

import { TAG_CATEGORIES } from '../constants';
import type { TagCategory } from '../types';

const CATEGORY_VALUES = TAG_CATEGORIES.map(({ value }) => value);

type UseCategoryNavigationArgs = {
  isCategoryComplete: (category: TagCategory) => boolean;
};

/**
 * 키워드 스텝의 카테고리 탭 이동(버튼/스와이프)과 잠금 규칙을 관리한다.
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

  const goToNextCategory = () => {
    const nextCategory = CATEGORY_VALUES[activeIndex + 1];

    if (nextCategory) {
      setActiveCategory(nextCategory);
    }
  };

  const goToPreviousCategory = () => {
    const previousCategory = CATEGORY_VALUES[activeIndex - 1];

    if (previousCategory) {
      setActiveCategory(previousCategory);
    }
  };

  return {
    activeCategory,
    setActiveCategory,
    isCategoryUnlocked,
    isFirstCategory,
    isLastCategory,
    goToNextCategory,
    goToPreviousCategory,
  };
}
