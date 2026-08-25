import type { SimpleStoryTagListItemResponseCategory } from '@/api/generated/models';
import {
  type InviteCodeErrorType,
  type InviteCodeSource,
} from '@/features/my/invite/utils/invite-code';
import type { SocialLoginProvider } from '@/lib/auth/social-provider';
import { type InAppBrowser } from '@/lib/in-app-browser';

/** 스토리 생성 플로우의 단계 이름. */
export type StepName =
  | 'keyword'
  | 'storylineSelect'
  | 'additionalInfo'
  | 'complete';

/** 게스트 체험 한도 초과(402) 다이어로그를 연 발생 지점. */
export type GuestLimitTrigger =
  | 'storyline_generate'
  | 'story_create'
  | 'chat_start'
  | 'chat_turn';

/** 회원 크레딧 부족(402·INSUFFICIENT_CREDIT) 다이얼로그를 연 발생 지점. 게스트 한도와 동일한 지점 집합이다. */
export type CreditShortageTrigger = GuestLimitTrigger;

/** 홈 스토리 카드가 속한 섹션. 오리지널 노출·클릭 기여를 내가 만든 스토리와 분리해 본다. */
export type StoryCardSection = 'original' | 'created';

/** 이벤트 이름별 프로퍼티 정의. 프로퍼티가 없는 이벤트는 void로 표기한다. */
export type AnalyticsEventProps = {
  // login
  client_login_viewed: void;
  client_login_googleButton_clicked: void;
  client_login_kakaoButton_clicked: void;
  // OAuth 콜백 단계 실패는 백엔드에 도달하지 않아 서버 이벤트가 못 잡는 사각지대라
  // NextAuth가 error 쿼리와 함께 /login으로 복귀시키는 시점에 발화한다(스펙 §6-4-3).
  // NextAuth error 쿼리에는 시작 provider 정보가 없어 provider는 null로 보낸다.
  client_login_oauthError_shown: {
    error_code: string;
    provider: string | null;
  };
  // in-app browser (감지·탈출 — 스펙 §6-4-2-12)
  client_inappBrowser_detected: { app: InAppBrowser };
  client_inappBrowser_escapeAttempted: { app: 'kakaotalk' };
  client_inappBrowser_bannerShown: { app: InAppBrowser };
  // login handoff (인앱 로그인 핸드오프 퍼널 — 스펙 §6-4-2-12)
  // 생성 시점(인앱)에는 handoff_id를 확보하지만, 외부 랜딩은 확인 응답에 id가 없어
  // handoff_id 없이 발화한다(비밀 코드는 어떤 이벤트에도 싣지 않는다).
  client_inappBrowser_loginHandoffCreated: {
    app: InAppBrowser;
    handoff_id: string;
  };
  client_loginContinue_viewed: void;
  client_loginContinue_loginButton_clicked: { provider: SocialLoginProvider };
  // guest limit (게스트 체험 한도 초과 → 로그인 유도)
  client_guestLimitDialog_shown: { trigger: GuestLimitTrigger };
  client_guestLimitDialog_loginButton_clicked: {
    trigger: GuestLimitTrigger;
    provider: SocialLoginProvider;
  };
  client_guestLimitDialog_dismissed: { trigger: GuestLimitTrigger };
  // credit shortage (회원 크레딧 부족 → 크레딧 획득 유도)
  client_creditShortageDialog_shown: { trigger: CreditShortageTrigger };
  client_creditShortageDialog_earnButton_clicked: {
    trigger: CreditShortageTrigger;
  };
  client_creditShortageDialog_attendanceButton_clicked: {
    trigger: CreditShortageTrigger;
  };
  client_creditShortageDialog_dismissed: { trigger: CreditShortageTrigger };
  // onboarding
  client_onboarding_viewed: void;
  client_onboarding_createButton_clicked: void;
  client_onboarding_skipButton_clicked: void;
  // storyList
  client_storyList_viewed: void;
  client_storyList_loginButton_clicked: void;
  client_storyList_createButton_clicked: { source: 'fab' | 'emptyState' };
  client_storyList_storyCard_clicked: {
    story_id: string;
    position?: number;
    section: StoryCardSection;
  };
  client_storyList_storyCard_impressed: {
    story_id: string;
    position?: number;
    section: StoryCardSection;
  };
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
  client_storyCreate_draftSaved: {
    step: 'storyline-select' | 'additional-info';
  };
  client_storyCreate_resumeDialog_shown: void;
  client_storyCreate_resumeDialog_continued: void;
  client_storyCreate_resumeDialog_discarded: void;
  client_storyCreate_continueBanner_shown: {
    stage: 'STORYLINE_GENERATION' | 'STORY_COMPLETION' | 'STORY_DRAFT';
  };
  client_storyCreate_continueBanner_clicked: {
    stage: 'STORYLINE_GENERATION' | 'STORY_COMPLETION' | 'STORY_DRAFT';
  };
  client_storyCreate_continueBanner_dismissed: {
    stage: 'STORYLINE_GENERATION' | 'STORY_COMPLETION' | 'STORY_DRAFT';
  };
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
  client_storyDetail_thumbnail_clicked: { story_id: string };
  // chatList
  client_chatList_viewed: void;
  client_chatList_chatCard_clicked: { chat_id: string; position?: number };
  client_chatList_chatCard_impressed: { chat_id: string; position?: number };
  // chat
  client_chat_viewed: { chat_id: string };
  client_chat_inputMode_selected: { chat_id: string; mode: 'block' | 'plain' };
  client_chat_choicesToggle_clicked: { chat_id: string; enabled: boolean };
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
  client_chat_regenerateButton_clicked: {
    chat_id: string;
    turn_number: number;
  };
  client_chat_streamError_shown: { chat_id: string; turn_number: number };
  client_chat_loadError_shown: { chat_id: string };
  client_chat_retryButton_clicked: { chat_id: string };
  client_chat_tour_shown: { chat_id: string };
  client_chat_tourStep_viewed: {
    chat_id: string;
    step_number: number;
    step_id: string;
  };
  client_chat_tour_completed: { chat_id: string };
  client_chat_tourSkipButton_clicked: { chat_id: string; step_number: number };
  client_chatShareDialog_shown: { chat_id: string; turn_number: number };
  client_chat_shareButton_clicked: { chat_id: string; turn_number: number };
  client_chatShareDialog_dismissed: { chat_id: string; turn_number: number };
  // share (공유 열람 페이지)
  // shareId는 곧 열람 토큰이라 이벤트에 싣지 않는다(6-analytics.md §6-4-2-14).
  client_chatShare_viewed: { story_id: string };
  client_chatShare_ctaButton_clicked: { story_id: string };
  // account (마이 페이지)
  client_account_viewed: void;
  client_account_loginButton_clicked: void;
  client_account_attendanceButton_clicked: void;
  client_account_logoutButton_clicked: void;
  // 연동 성공·실패는 서버 이벤트(server_link_socialLink_processed_*)가 잡으므로
  // 클라이언트는 시도 시점만 남긴다(스펙 §6-4).
  client_account_linkAccountButton_clicked: { provider: SocialLoginProvider };
  // feedback
  client_feedback_viewed: void;
  client_feedback_form_submitted: void;
  // invite (친구 초대 페이지)
  client_invite_viewed: void;
  client_invite_copyButton_clicked: void;
  client_invite_kakaoShareButton_clicked: void;
  client_invite_codeInput_submitted: { source: InviteCodeSource };
  client_invite_codeInput_succeeded: { source: InviteCodeSource };
  client_invite_codeInput_failed: {
    source: InviteCodeSource;
    error_type: InviteCodeErrorType;
  };
  client_inviteOnboarding_shown: void;
  client_inviteOnboarding_skipped: void;
  // legal
  client_terms_viewed: void;
  client_privacy_viewed: void;
  // service info (서비스 안내 페이지)
  client_serviceInfo_viewed: void;
};

/** 전송 가능한 분석 이벤트 이름. */
export type AnalyticsEventName = keyof AnalyticsEventProps;
