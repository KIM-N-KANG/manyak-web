import { StoryReportRequestReason } from '@/api/generated/models';

/** 서버가 받는 자유 서술의 상한. 넘겨 보내면 400이라 입력 단계에서 막는다. */
export const STORY_REPORT_DETAIL_MAX_LENGTH = 500;

/** 신고 시트의 사용자 문구 정본. 앱(`core/ui/strings.xml`)과 같은 문구를 쓴다. */
export const STORY_REPORT_COPY = {
  action: '신고하기',
  title: '이 스토리를 신고할까요?',
  description: '부적절하거나 불쾌한 내용이 있으면 알려주세요',
  detailLabel: '자세한 내용 (선택)',
  detailPlaceholder: '어떤 점이 문제였는지 알려주세요',
  submit: '신고하기',
  submitting: '신고 접수 중',
  close: '닫기',
} as const;

/** 신고 사유 선택지. 표시 순서가 곧 배열 순서다. */
export const STORY_REPORT_REASONS: readonly {
  value: StoryReportRequestReason;
  label: string;
}[] = [
  { value: StoryReportRequestReason.SPAM, label: '도배·홍보' },
  { value: StoryReportRequestReason.INAPPROPRIATE, label: '부적절한 내용' },
  { value: StoryReportRequestReason.ETC, label: '기타' },
];
