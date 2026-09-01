import {
  differenceInCalendarDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  format,
  isToday,
  isYesterday,
} from 'date-fns';

const DATE_PART_LENGTH = 10;

/**
 * 표시 기준 시간대. 서버 시각 필드는 UTC라 문자열을 그대로 자르면 KST 자정~오전 9시에
 * 벌어진 일이 전날로 보인다. 서비스의 하루 경계(출석 보상·초대 월 한도)가 KST로 고정돼
 * 있으므로 표시도 기기 시간대가 아닌 KST로 통일한다.
 */
const DISPLAY_TIME_ZONE = 'Asia/Seoul';

const DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * ISO 날짜 문자열을 KST 기준 날짜(yyyy-MM-dd)로 반환한다.
 *
 * @param isoDate ISO 8601 날짜 문자열
 * @returns yyyy-MM-dd 형식의 날짜 문자열. 해석할 수 없으면 입력의 앞 10자
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return isoDate.slice(0, DATE_PART_LENGTH);
  }

  const parts = DISPLAY_DATE_FORMATTER.formatToParts(date);
  const partOf = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${partOf('year')}-${partOf('month')}-${partOf('day')}`;
}

const HOUR_THRESHOLD = 12;
const DAY_THRESHOLD = 7;

/**
 * ISO 날짜 문자열을 상대 시간 표현으로 변환한다.
 * "방금 전" → "n분 전" → "n시간 전" → "오늘/어제" → "n일 전" 순으로 표시하고,
 * 7일 이상 지난 날짜는 yyyy-MM-dd 형식으로 표시한다.
 *
 * @param isoDate ISO 8601 날짜 문자열
 * @returns 상대 시간 표현 문자열(7일 이상은 yyyy-MM-dd)
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
