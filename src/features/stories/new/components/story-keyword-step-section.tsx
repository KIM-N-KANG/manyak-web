'use client';

import { useMemo, useState } from 'react';

import type {
  SimpleStoryCustomTagRequestCategory,
  SimpleStoryTagListItemResponse,
  SimpleStoryTagListItemResponseCategory,
} from '@/api/generated/api/model';
import {
  useGenerateSimpleStorylines,
  useGetSimpleStoryTags,
} from '@/api/generated/api/simple-story-creation/simple-story-creation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleChip } from '@/components/ui/toggle-chip';

import { AddKeywordDialog } from './add-keyword-dialog';

type TagCategory = SimpleStoryTagListItemResponseCategory;

type CustomKeyword = {
  id: string;
  name: string;
  category: SimpleStoryCustomTagRequestCategory;
};

const TAG_CATEGORIES = [
  {
    value: 'GENRE',
    label: '장르',
    required: true,
    maxSelectionCount: 5,
  },
  {
    value: 'PROTAGONIST',
    label: '주인공',
    required: true,
    maxSelectionCount: 5,
  },
  {
    value: 'SUPPORTING_CHARACTER',
    label: '주변 인물',
    required: false,
    maxSelectionCount: 10,
  },
] satisfies {
  value: TagCategory;
  label: string;
  required: boolean;
  maxSelectionCount: number;
}[];

const createEmptySelectedTagIdsByCategory = () => ({
  GENRE: [] as number[],
  PROTAGONIST: [] as number[],
  SUPPORTING_CHARACTER: [] as number[],
});

const createEmptySelectedCustomKeywordIdsByCategory = () => ({
  GENRE: [] as string[],
  PROTAGONIST: [] as string[],
  SUPPORTING_CHARACTER: [] as string[],
});

const createEmptyCustomKeywordsByCategory = () => ({
  GENRE: [] as CustomKeyword[],
  PROTAGONIST: [] as CustomKeyword[],
  SUPPORTING_CHARACTER: [] as CustomKeyword[],
});

const createEmptyTagsByCategory = () => ({
  GENRE: [] as SimpleStoryTagListItemResponse[],
  PROTAGONIST: [] as SimpleStoryTagListItemResponse[],
  SUPPORTING_CHARACTER: [] as SimpleStoryTagListItemResponse[],
});

const getMaxSelectionCount = (category: TagCategory) =>
  TAG_CATEGORIES.find((item) => item.value === category)?.maxSelectionCount ??
  0;

const SKELETON_TAG_CHIP_WIDTH_CLASSES = [
  'w-14',
  'w-16',
  'w-20',
  'w-24',
  'w-28',
  'w-32',
  'w-36',
  'w-40',
] as const;

export function StoryKeywordStepSection() {
  const [activeCategory, setActiveCategory] = useState<TagCategory>('GENRE');
  const [selectedTagIdsByCategory, setSelectedTagIdsByCategory] = useState(
    createEmptySelectedTagIdsByCategory,
  );
  const [
    selectedCustomKeywordIdsByCategory,
    setSelectedCustomKeywordIdsByCategory,
  ] = useState(createEmptySelectedCustomKeywordIdsByCategory);
  const [customKeywordsByCategory, setCustomKeywordsByCategory] = useState(
    createEmptyCustomKeywordsByCategory,
  );

  const simpleStoryTags = useGetSimpleStoryTags();
  const generateStorylines = useGenerateSimpleStorylines({
    mutation: {
      onSuccess: (response) => {
        console.log('스토리라인 생성 응답', response);
      },
    },
  });

  const tagsByCategory = useMemo(() => {
    const tags = simpleStoryTags.data?.data ?? [];

    return TAG_CATEGORIES.reduce((acc, { value: category }) => {
      acc[category] = tags.filter((tag) => tag.category === category);

      return acc;
    }, createEmptyTagsByCategory());
  }, [simpleStoryTags.data?.data]);

  const hasGenreKeyword =
    selectedTagIdsByCategory.GENRE.length > 0 ||
    selectedCustomKeywordIdsByCategory.GENRE.length > 0;
  const hasProtagonistKeyword =
    selectedTagIdsByCategory.PROTAGONIST.length > 0 ||
    selectedCustomKeywordIdsByCategory.PROTAGONIST.length > 0;
  const canGenerateStoryline = hasGenreKeyword && hasProtagonistKeyword;

  const getSelectedCount = (category: TagCategory) =>
    selectedTagIdsByCategory[category].length +
    selectedCustomKeywordIdsByCategory[category].length;

  const togglePredefinedTag = (
    category: TagCategory,
    tagId: number,
    pressed: boolean,
  ) => {
    setSelectedTagIdsByCategory((previous) => {
      const selectedTagIds = previous[category];

      if (!pressed) {
        return {
          ...previous,
          [category]: selectedTagIds.filter(
            (selectedTagId) => selectedTagId !== tagId,
          ),
        };
      }

      if (
        selectedTagIds.includes(tagId) ||
        selectedTagIds.length +
          selectedCustomKeywordIdsByCategory[category].length >=
          getMaxSelectionCount(category)
      ) {
        return previous;
      }

      return {
        ...previous,
        [category]: [...selectedTagIds, tagId],
      };
    });
  };

  const toggleCustomKeyword = (
    category: TagCategory,
    keywordId: string,
    pressed: boolean,
  ) => {
    setSelectedCustomKeywordIdsByCategory((previous) => {
      const selectedKeywordIds = previous[category];

      if (!pressed) {
        return {
          ...previous,
          [category]: selectedKeywordIds.filter(
            (selectedKeywordId) => selectedKeywordId !== keywordId,
          ),
        };
      }

      if (
        selectedKeywordIds.includes(keywordId) ||
        selectedTagIdsByCategory[category].length + selectedKeywordIds.length >=
          getMaxSelectionCount(category)
      ) {
        return previous;
      }

      return {
        ...previous,
        [category]: [...selectedKeywordIds, keywordId],
      };
    });
  };

  const addCustomKeyword = (category: TagCategory, keyword: string) => {
    if (getSelectedCount(category) >= getMaxSelectionCount(category)) {
      return;
    }

    const customKeyword: CustomKeyword = {
      id: crypto.randomUUID(),
      name: keyword,
      category,
    };

    setCustomKeywordsByCategory((previous) => ({
      ...previous,
      [category]: [...previous[category], customKeyword],
    }));
    setSelectedCustomKeywordIdsByCategory((previous) => ({
      ...previous,
      [category]: [...previous[category], customKeyword.id],
    }));
  };

  const handleGenerateStoryline = () => {
    if (!canGenerateStoryline) {
      return;
    }

    const selectedTagIds = TAG_CATEGORIES.flatMap(
      ({ value }) => selectedTagIdsByCategory[value],
    );
    const customTags = TAG_CATEGORIES.flatMap(({ value }) =>
      customKeywordsByCategory[value]
        .filter((keyword) =>
          selectedCustomKeywordIdsByCategory[value].includes(keyword.id),
        )
        .map((keyword) => ({
          name: keyword.name,
          category: keyword.category,
        })),
    );

    generateStorylines.mutate({
      data: {
        selectedTagIds: selectedTagIds,
        customTags: customTags,
      },
    });
  };

  return (
    <main className="flex flex-1 flex-col pb-16">
      <section className="flex flex-1 flex-col">
        <Tabs
          value={activeCategory}
          onValueChange={(value) => setActiveCategory(value as TagCategory)}>
          <TabsList variant="line">
            {TAG_CATEGORIES.map(({ value, label, required }) => (
              <TabsTrigger key={value} value={value} className="gap-0.5">
                {label}
                {required && <span className="text-destructive">*</span>}
              </TabsTrigger>
            ))}
          </TabsList>
          {TAG_CATEGORIES.map(
            ({ value: category, label, maxSelectionCount }) => {
              const selectedTagIds = selectedTagIdsByCategory[category];
              const selectedCustomKeywordIds =
                selectedCustomKeywordIdsByCategory[category];
              const selectedCount = getSelectedCount(category);
              const isMaxSelectionReached = selectedCount >= maxSelectionCount;

              return (
                <TabsContent key={category} value={category}>
                  <div className="flex flex-col gap-4 px-4 pb-4">
                    <p className="text-sm text-foreground-secondary">
                      최대 {maxSelectionCount}개까지 선택할 수 있어요
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {simpleStoryTags.isLoading && (
                        <>
                          {SKELETON_TAG_CHIP_WIDTH_CLASSES.map(
                            (widthClass, index) => (
                              <Skeleton
                                key={`${category}-tag-skeleton-${index}`}
                                className={`h-10 ${widthClass}`}
                                aria-hidden="true"
                              />
                            ),
                          )}
                        </>
                      )}
                      {simpleStoryTags.isError && (
                        <p className="py-2 text-sm text-destructive">
                          키워드를 불러오지 못했어요
                        </p>
                      )}
                      {tagsByCategory[category].map((tag) => {
                        if (tag.tagId == null || !tag.name) {
                          return null;
                        }

                        const isSelected = selectedTagIds.includes(tag.tagId);

                        return (
                          <ToggleChip
                            key={tag.tagId}
                            pressed={isSelected}
                            disabled={!isSelected && isMaxSelectionReached}
                            onPressedChange={(pressed) =>
                              togglePredefinedTag(
                                category,
                                tag.tagId as number,
                                pressed,
                              )
                            }>
                            {tag.name}
                          </ToggleChip>
                        );
                      })}
                      {customKeywordsByCategory[category].map((keyword) => {
                        const isSelected = selectedCustomKeywordIds.includes(
                          keyword.id,
                        );

                        return (
                          <ToggleChip
                            key={keyword.id}
                            pressed={isSelected}
                            disabled={!isSelected && isMaxSelectionReached}
                            onPressedChange={(pressed) =>
                              toggleCustomKeyword(category, keyword.id, pressed)
                            }>
                            {keyword.name}
                          </ToggleChip>
                        );
                      })}
                      <AddKeywordDialog
                        category={category}
                        categoryLabel={label}
                        disabled={isMaxSelectionReached}
                        onAddKeyword={(keyword) =>
                          addCustomKeyword(category, keyword)
                        }
                      />
                    </div>
                  </div>
                </TabsContent>
              );
            },
          )}
        </Tabs>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto h-16 max-w-md border-t border-border bg-background px-4">
        <div className="flex h-full w-full items-center justify-between">
          <p className="text-sm font-medium">1 / 3</p>
          <Button
            type="button"
            size="lg"
            disabled={!canGenerateStoryline || generateStorylines.isPending}
            onClick={handleGenerateStoryline}>
            스토리라인 만들기
          </Button>
        </div>
      </nav>
    </main>
  );
}
