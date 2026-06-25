import {
  differenceInCalendarDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  format,
  isToday,
  isYesterday,
} from 'date-fns';

export function formatDate(isoDate: string): string {
  return isoDate.slice(0, 10);
}

const HOUR_THRESHOLD = 12;
const DAY_THRESHOLD = 7;

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
