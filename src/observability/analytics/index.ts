/**
 * @file 분석 API의 공개 진입점. 기능 코드는 `@amplitude/unified` 대신 여기서 `track`, `useImpression`,
 * `useTrackOnView`, `SCREEN`을 가져온다. 식별자 헤더와 설정처럼 인프라 코드만 쓰는 모듈은 경로로 직접 가져온다.
 */

export { track } from './client';
export { useImpression } from './use-impression';
export { useTrackOnView } from './use-track-on-view';
export { SCREEN } from './screens';
export { resetAnalyticsUser, setAnalyticsUser } from './user-context';
export type {
  AnalyticsEventName,
  AnalyticsEventProps,
  CreditShortageTrigger,
  ReportSource,
  StepName,
  StoryCardSection,
} from './events';
