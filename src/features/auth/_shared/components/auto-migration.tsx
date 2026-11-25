'use client';

import { useAutoMigration } from '../hooks/use-auto-migration';

/** 아무것도 그리지 않고 게스트 서재 자동 이관(`useAutoMigration`)만 실행하는 마운트 전용 컴포넌트. */
export function AutoMigration() {
  useAutoMigration();

  return null;
}
