export const ACCOUNT_DELETION_TITLE_LINES = [
  '탈퇴하기 전에',
  '아래 내용을 모두 확인해주세요',
] as const;

export const ACCOUNT_DELETION_DESCRIPTION =
  '모든 항목을 확인해야 탈퇴할 수 있어요';

export const ACCOUNT_DELETION_CONFIRMATIONS = [
  {
    id: 'credit',
    title: '남은 크레딧을 더 이상 사용할 수 없음을 확인했어요.',
    description:
      '탈퇴 후 잔여 크레딧은 환불되거나 새 계정으로 이전되지 않아요.',
  },
  {
    id: 'library',
    title: '기존 스토리와 채팅을 다시 이용할 수 없음을 확인했어요.',
    description: '탈퇴한 계정의 서재는 복구하거나 새 계정으로 옮길 수 없어요.',
  },
  {
    id: 'published-content',
    title: '공개한 콘텐츠가 탈퇴 후에도 남을 수 있음을 확인했어요.',
    description:
      '공개 스토리는 작성자가 ‘탈퇴한 사용자’로 표시되며, 공유한 채팅은 기존 링크로 계속 볼 수 있어요.',
  },
  {
    id: 'social-login',
    title:
      '같은 소셜 계정으로 다시 로그인해도 기존 계정이 복구되지 않음을 확인했어요.',
    description:
      '다시 로그인하면 새 계정이 만들어지며 기존 콘텐츠와 크레딧은 복구되지 않아요.',
  },
] as const;

export const ACCOUNT_DELETION_CTA_LABEL = '회원 탈퇴하기';
export const ACCOUNT_DELETION_PENDING_LABEL = '회원 탈퇴 중';
