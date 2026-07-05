import {
  differenceInCalendarDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  format,
  isToday,
  isYesterday,
} from 'date-fns';

/** ISO 날짜 문자열에서 날짜 부분(yyyy-MM-dd)만 잘라 반환한다. */
export function formatDate(isoDate: string): string {
  return isoDate.slice(0, 10);
}

const HOUR_THRESHOLD = 12;
const DAY_THRESHOLD = 7;

/**
 * ISO 날짜 문자열을 상대 시간 표현으로 변환한다.
 * "방금 전" → "n분 전" → "n시간 전" → "오늘/어제" → "n일 전" 순으로 표시하고,
 * 7일 이상 지난 날짜는 yyyy-MM-dd 형식으로 표시한다.
 */
export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();

  const diffSec = differenceInSeconds(now, date);

  if (diffSec < 60) {
    return '방금 전';
  }

  const diffMin = differenceInMinutes(now, date);

  if (diffMin < 60) {
    return `${diffMin}분 전`;
  }

  const diffHour = differenceInHours(now, date);

  if (diffHour < HOUR_THRESHOLD) {
    return `${diffHour}시간 전`;
  }

  if (isToday(date)) {
    return '오늘';
  }

  if (isYesterday(date)) {
    return '어제';
  }

  const diffDay = differenceInCalendarDays(now, date);

  if (diffDay < DAY_THRESHOLD) {
    return `${diffDay}일 전`;
  }

  return format(date, 'yyyy-MM-dd');
}
