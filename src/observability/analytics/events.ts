import type { SimpleStoryTagListItemResponseCategory } from '@/api/generated/models';

/** 스토리 생성 플로우의 단계 이름. */
export type StepName =
  | 'keyword'
  | 'storylineSelect'
  | 'additionalInfo'
  | 'complete';

/** 이벤트 이름별 프로퍼티 정의. 프로퍼티가 없는 이벤트는 void로 표기한다. */
export type AnalyticsEventProps = {
  // onboarding
  client_onboarding_viewed: void;
  client_onboarding_createButton_clicked: void;
  // storyList
  client_storyList_viewed: void;
  client_storyList_createButton_clicked: { source: 'fab' | 'emptyState' };
  client_storyList_storyCard_clicked: { story_id: string; position?: number };
  client_storyList_storyCard_impressed: { story_id: string; position?: number };
  // storyCreate
  client_storyCreate_viewed: void;
  client_storyCreate_step_viewed: { step_name: StepName; step_number: number };
  client_storyCreate_tagCategory_selected: {
    from_category: SimpleStoryTagListItemResponseCategory;
    to_category: SimpleStoryTagListItemResponseCategory;
    direction: 'forward' | 'backward';
  };
  client_storyCreate_storyGeneration_requested: void;
  client_storyCreate_storylineOption_selected: {
    creation_id: string;
    position?: number;
  };
  client_storyCreate_selectedTagsButton_clicked: { creation_id: string };
  client_storyCreate_addTag_submitted: {
    category: SimpleStoryTagListItemResponseCategory;
  };
  client_storyCreate_regenerateButton_clicked: { creation_id: string };
  client_storyCreate_storylineTab_selected: {
    creation_id: string;
    position: number;
  };
  client_storyCreate_storylineRating_clicked: {
    storyline_id: string;
    rating: 'GOOD' | 'BAD';
    active: boolean;
  };
  client_storyCreate_backToStorylineButton_clicked: void;
  client_storyCreate_recommendedInfo_clicked: { selected: boolean };
  client_storyCreate_additionalInfoAddButton_clicked: void;
  client_storyCreate_additionalInfoRemoveButton_clicked: void;
  client_storyCreate_storyCompletion_requested: { creation_id: string };
  client_storyCreate_completeError_shown: { stage: 'story' | 'chat' };
  client_storyCreate_exitButton_clicked: {
    step_name: StepName;
    step_number: number;
  };
  client_storyCreate_completed: {
    story_id: string;
    chat_id: string;
    genres?: string[];
  };
  // storyDetail
  client_storyDetail_viewed: { story_id: string };
  client_storyDetail_chatStartButton_clicked: { story_id: string };
  // chatList
  client_chatList_viewed: void;
  client_chatList_chatCard_clicked: { chat_id: string; position?: number };
  client_chatList_chatCard_impressed: { chat_id: string; position?: number };
  // chat
  client_chat_viewed: { chat_id: string };
  client_chat_settingsButton_clicked: { chat_id: string };
  client_chat_inputMode_selected: { chat_id: string; mode: 'block' | 'plain' };
  client_chat_messageInput_submitted: {
    chat_id: string;
    turn_number: number;
    input_mode: 'block' | 'plain' | 'choice';
  };
  client_chat_situationInsertButton_clicked: { chat_id: string };
  client_chat_addBlockButton_clicked: {
    chat_id: string;
    block_type: 'situation' | 'dialogue';
  };
  client_chat_removeBlockButton_clicked: {
    chat_id: string;
    block_type: 'situation' | 'dialogue';
  };
  client_chat_choiceOption_selected: {
    chat_id: string;
    turn_number: number;
    position?: number;
  };
  client_chat_choiceFillButton_clicked: {
    chat_id: string;
    turn_number: number;
    position?: number;
  };
  client_chat_streamError_shown: { chat_id: string; turn_number: number };
  client_chat_loadError_shown: { chat_id: string };
  client_chat_retryButton_clicked: { chat_id: string };
  // feedback
  client_feedback_viewed: void;
  client_feedback_form_submitted: void;
};

/** 전송 가능한 분석 이벤트 이름. */
export type AnalyticsEventName = keyof AnalyticsEventProps;
