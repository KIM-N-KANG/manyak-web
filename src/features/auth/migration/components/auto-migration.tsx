'use client';

import { useAutoMigration } from '../hooks/use-auto-migration';

/** 루트에 마운트되어 로그인 직후 게스트 서재 자동 이관을 수행한다. UI는 없다. */
export function AutoMigration() {
  useAutoMigration();

  return null;
}
