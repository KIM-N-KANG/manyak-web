import type { SimpleStoryTagListItemResponseCategory } from '@/api/generated/models';

export type StepName =
  | 'keyword'
  | 'storylineSelect'
  | 'additionalInfo'
  | 'complete';

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
  client_storyCreate_keywordCategory_selected: {
    from_category: SimpleStoryTagListItemResponseCategory;
    to_category: SimpleStoryTagListItemResponseCategory;
    direction: 'forward' | 'backward';
  };
  client_storyCreate_storyGeneration_requested: void;
  client_storyCreate_storylineOption_selected: {
    creation_id: string;
    position?: number;
  };
  client_storyCreate_selectedKeywordsButton_clicked: { creation_id: string };
  client_storyCreate_addKeyword_submitted: {
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
    genre?: string[];
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
  client_chat_messageInput_submitted: { chat_id: string; turn_number: number };
  client_chat_choiceOption_selected: {
    chat_id: string;
    turn_number: number;
    position?: number;
  };
  client_chat_loadError_shown: { chat_id: string };
  client_chat_retryButton_clicked: { chat_id: string };
  // feedback
  client_feedback_viewed: void;
  client_feedback_form_submitted: void;
};

export type AnalyticsEventName = keyof AnalyticsEventProps;
