import type {
  SimpleStoryTagListItemResponseCategory,
  StoryReportRequestReason,
} from '@/api/generated/models';
import {
  type InviteCodeErrorType,
  type InviteCodeSource,
} from '@/features/my/invite/utils/invite-code';
import { type CreateTutorialStage } from '@/features/stories/_shared/constants/create-tutorial';
import { type AppBannerVariant } from '@/lib/app-banner';
import type { SocialLoginProvider } from '@/lib/auth/social-provider';
import { type InAppBrowser } from '@/lib/in-app-browser';

/** 스토리 생성 플로우의 단계 이름. */
export type StepName =
  | 'keyword'
  | 'storylineSelect'
  | 'additionalInfo'
  | 'complete';

/** 회원 이프 부족(402·INSUFFICIENT_CREDIT) 토스트를 띄운 유료 동작 지점. */
export type CreditShortageTrigger = 'story_create' | 'chat_turn';

/** 스토리 카드가 속한 섹션. 오리지널 노출·클릭 기여를 내가 만든 스토리와 분리해 본다. */
export type StoryCardSection = 'original' | 'created';

/** 채팅을 시작할 주인공. 페르소나 이름과 소개는 사용자 입력 원문이라 싣지 않는다(스펙 §6-7). */
export type PersonaType = 'default' | 'persona';

/** 신고 시트를 연 화면. 네 화면이 시트 하나를 공유하므로 이벤트 대신 프로퍼티로 구분한다(스펙 §6-4-2). */
export type ReportSource = 'storyDetail' | 'studio' | 'chatList' | 'chat';

/** 앱 안내 배너 이벤트 프로퍼티. `destination`은 Android 변형만, `story_id`는 스토리 상세에서만 싣는다. */
export type AppBannerEventProps = {
  variant: AppBannerVariant;
  destination?: 'story' | 'home';
  story_id?: string;
};

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
  // app banner (앱 안내 배너, 스펙 §6-4-2-18)
  client_appBanner_shown: AppBannerEventProps;
  client_appBanner_actionButton_clicked: AppBannerEventProps;
  client_appBanner_closeButton_clicked: { variant: AppBannerVariant };
  client_appBanner_escapeGuide_shown: void;
  // credit shortage (회원 이프 부족 → 토스트 안내, 이벤트 이름은 하위 호환 유지)
  client_creditShortageDialog_shown: { trigger: CreditShortageTrigger };
  // report (스토리 신고 시트 — 채팅에서 열어도 대상은 참조 스토리라 target_type은 story 고정)
  client_report_sheet_opened: {
    target_type: 'story';
    target_id: string;
    source: ReportSource;
  };
  client_report_submitted: {
    target_type: 'story';
    target_id: string;
    reason: StoryReportRequestReason;
    has_detail: boolean;
  };
  client_report_failed: { target_type: 'story'; error_type: string };
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
  client_storyCreate_methodOption_selected: { method: 'simple' | 'general' };
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
    /** 장르는 제공 장르만 골라 직접 추가가 없다. */
    category: Exclude<SimpleStoryTagListItemResponseCategory, 'GENRE'>;
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
    step: 'keyword' | 'storyline-select' | 'additional-info';
  };
  client_storyCreate_continueBanner_shown: {
    stage:
      | 'KEYWORD_DRAFT'
      | 'STORYLINE_GENERATION'
      | 'STORY_COMPLETION'
      | 'STORY_DRAFT'
      | 'GENERAL_DRAFT';
  };
  client_storyCreate_continueBanner_clicked: {
    stage:
      | 'KEYWORD_DRAFT'
      | 'STORYLINE_GENERATION'
      | 'STORY_COMPLETION'
      | 'STORY_DRAFT'
      | 'GENERAL_DRAFT';
  };
  client_storyCreate_exitButton_clicked: {
    step_name: StepName;
    step_number: number;
  };
  client_storyCreate_completed: {
    story_id: string;
    genres?: string[];
  };
  client_storyCreate_tutorialStep_viewed: { stage: CreateTutorialStage };
  client_storyCreate_tutorialSkipButton_clicked: { stage: CreateTutorialStage };
  client_storyCreate_tutorial_completed: { action: 'originals' | 'close' };
  // generalCreate
  client_generalCreate_viewed: void;
  client_storyEdit_viewed: { story_id: string };
  client_storyEdit_completed: { story_id: string };
  client_generalCreate_completed: {
    submission_id: string;
    start_setting_count: number;
    ending_count: number;
    main_event_count: number;
    image_count: number;
  };
  /** 등록 요청 실패 안내를 띄울 때 보낸다. 응답이 없는 네트워크 오류는 0이다. */
  client_generalCreate_registerError_shown: { status: number };
  /** 제작 탭의 검수 제출본 카드에서 수정·등록 취소·삭제를 고를 때 보낸다. */
  client_storyList_submissionCard_clicked: {
    submission_id: string;
    status: 'pending' | 'rejected' | 'failed';
    action: 'edit' | 'cancel' | 'delete';
  };
  /** 등록 요청이 접수된 뒤 검수 결과(또는 기다림 상한 초과)를 안내할 때 보낸다. */
  client_generalCreate_reviewResult_shown: {
    submission_id: string;
    result: 'approved' | 'rejected' | 'failed' | 'timeout';
  };
  // storyDetail
  client_storyDetail_viewed: { story_id: string };
  client_storyDetail_chatStartButton_clicked: {
    story_id: string;
    persona_type: PersonaType;
  };
  client_storyDetail_persona_selected: {
    story_id: string;
    persona_type: PersonaType;
  };
  client_storyDetail_personaCreateButton_clicked: { story_id: string };
  client_storyDetail_thumbnail_clicked: { story_id: string };
  client_storyDetail_characterImage_clicked: { story_id: string };
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
  client_chat_characterImage_clicked: { chat_id: string };
  client_chat_retryButton_clicked: { chat_id: string };
  client_chat_tour_shown: { chat_id: string };
  client_chat_tourStep_viewed: {
    chat_id: string;
    step_number: number;
    step_id: string;
  };
  client_chat_tour_completed: { chat_id: string };
  client_chat_tourSkipButton_clicked: { chat_id: string; step_number: number };
  client_chat_shareButton_clicked: { chat_id: string; turn_number: number };
  // share (공유 열람 페이지)
  // shareId는 곧 열람 토큰이라 이벤트에 싣지 않는다(6-analytics.md §6-4-2-14).
  client_chatShare_viewed: { story_id: string };
  client_chatShare_ctaButton_clicked: { story_id: string };
  client_chatShare_characterImage_clicked: { story_id: string };
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
  // persona create (KNK-1469)
  client_personaCreate_viewed: void;
  client_personaCreate_form_submitted: void;
  client_personaCreate_completed: void;
  client_personaList_viewed: void;
  client_personaList_createButton_clicked: void;
  client_personaList_persona_deleted: void;
  client_personaEdit_viewed: void;
  client_personaEdit_form_submitted: void;
  client_personaEdit_completed: void;
  // profile edit (KNK-1148)
  client_profileEdit_viewed: void;
  client_profileEdit_completed: {
    nickname_changed: boolean;
    image_changed: boolean;
  };
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
