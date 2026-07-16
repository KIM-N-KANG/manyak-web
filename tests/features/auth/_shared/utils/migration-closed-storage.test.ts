import { describe, expect, it } from 'vitest';

import { parseMigrationClosedUserIds } from '@/features/auth/_shared/utils/migration-closed-storage';

describe('parseMigrationClosedUserIds', () => {
  it('저장된 userId 배열을 그대로 파싱한다', () => {
    expect(parseMigrationClosedUserIds('["user-1","user-2"]')).toEqual([
      'user-1',
      'user-2',
    ]);
  });

  it('없거나 빈 값이면 빈 배열을 반환한다', () => {
    expect(parseMigrationClosedUserIds(null)).toEqual([]);
    expect(parseMigrationClosedUserIds('')).toEqual([]);
  });

  it('배열이 아닌 JSON이면 빈 배열을 반환한다', () => {
    expect(parseMigrationClosedUserIds('{"user":"user-1"}')).toEqual([]);
    expect(parseMigrationClosedUserIds('"user-1"')).toEqual([]);
  });

  it('문자열이 아닌 항목은 버린다', () => {
    expect(parseMigrationClosedUserIds('["user-1",1,null,{"a":1}]')).toEqual([
      'user-1',
    ]);
  });

  it('JSON 파싱에 실패하면 빈 배열을 반환한다', () => {
    expect(parseMigrationClosedUserIds('not-json')).toEqual([]);
  });
});
