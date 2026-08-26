import type {
  SimpleStoryCharacterRequestGender,
  SimpleStorylineResponse,
  SimpleStoryTagListItemResponse,
  SimpleStoryTagListItemResponseCategory,
  StorylineRatingRequestRating,
} from '@/api/generated/models';

import type { STORY_CREATE_STEP_ORDER } from './constants';

export type TagCategory = SimpleStoryTagListItemResponseCategory;

/** 인물 입력을 받는 태그 카테고리(주인공·주변 인물) */
export type CharacterTagCategory = Exclude<TagCategory, 'GENRE'>;

/** 사용자가 고를 수 있는 성별. 비워 두면(null) AI가 정한다. */
export type CharacterGender = NonNullable<SimpleStoryCharacterRequestGender>;

export type StoryCreateStep = (typeof STORY_CREATE_STEP_ORDER)[number];

export type StorylineRating =
  (typeof StorylineRatingRequestRating)[keyof typeof StorylineRatingRequestRating];

export type TagCategoryConfig = {
  value: TagCategory;
  label: string;
  placeholder: string;
  namePlaceholder?: string;
  required: boolean;
  maxSelectionCount: number;
};

export type CustomTag = {
  id: string;
  name: string;
};

/** 인물 하나의 입력값. 이름·성별은 선택 항목이라 비어 있을 수 있다. */
export type CharacterInput = {
  id: string;
  name: string;
  gender: CharacterGender | null;
  selectedTagIds: number[];
  selectedCustomTagIds: string[];
  customTags: CustomTag[];
};

export type SelectedTagGroup = {
  id: string;
  label: string;
  tags: string[];
};

export type AdditionalInfoInput = {
  id: string;
  value: string;
};

export type TagsByCategory = Record<
  TagCategory,
  SimpleStoryTagListItemResponse[]
>;

export type StorylineSelectStepSectionProps = {
  storylines: SimpleStorylineResponse[];
  creationId?: string;
  selectedTagGroups: SelectedTagGroup[];
  activeStorylineIndex: number;
  isGeneratingStorylines: boolean;
  hasGenerateStorylinesError: boolean;
  isGuestLimitReached: boolean;
  onActiveStorylineIndexChange: (index: number) => void;
  onRegenerateStorylines: () => void;
  onSelectStoryline: () => void;
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
};
