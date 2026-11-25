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
  /** 탭 이름 */
  label: string;
  /** 직접 추가 다이얼로그의 예시다. 제공 장르만 고르는 장르에는 없다. */
  placeholder?: string;
  /** 인물 이름 입력의 예시다. 인물 카테고리에만 있다. */
  namePlaceholder?: string;
  /** 참이면 이 카테고리를 채워야 뒤 카테고리 탭이 열린다. */
  required: boolean;
  /** 한 카테고리(인물 카테고리는 인물 한 명)에서 고를 수 있는 키워드 수 상한 */
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

/** 스토리라인 단계에서 보여 주는 키워드 선택 묶음. 장르 한 묶음, 인물마다 한 묶음이다. */
export type SelectedTagGroup = {
  /** `GENRE`, `PROTAGONIST`, `SUPPORTING_CHARACTER-{순번}` 중 하나. 장르 묶음은 `GENRE`로 찾는다. */
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
  /** 생성된 스토리라인. 비어 있으면 탭 골격과 빈 안내를 그린다. */
  storylines: SimpleStorylineResponse[];
  /** 서버 간편 제작 ID. 선택 키워드 서랍의 분석 이벤트에 싣는다. */
  creationId?: string;
  /** 스토리라인을 만든 요청의 키워드 묶음. 하단 서랍에서 보여 준다. */
  selectedTagGroups: SelectedTagGroup[];
  /** 보고 있는 탭의 순번. 바뀌면 본문을 맨 위로 올린다. */
  activeStorylineIndex: number;
  /** 참이면 탭 대신 생성 로딩을 그리고 하단 버튼을 숨긴다. */
  isGeneratingStorylines: boolean;
  /** 생성 실패 안내를 보일지. 이전 결과가 있으면 재생성 실패 문구로 바꾼다. */
  hasGenerateStorylinesError: boolean;
  onActiveStorylineIndexChange: (index: number) => void;
  onRegenerateStorylines: () => void;
  /** 보고 있는 탭의 스토리라인을 고른다. 고를 스토리라인이 없으면 버튼이 비활성이다. */
  onSelectStoryline: () => void;
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
};
