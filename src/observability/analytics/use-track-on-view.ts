'use client';

import { useEffect } from 'react';

import { track } from './client';
import type { AnalyticsEventName, AnalyticsEventProps } from './events';

type TrackOnViewArgs<K extends AnalyticsEventName> =
  AnalyticsEventProps[K] extends void ? [] : [props: AnalyticsEventProps[K]];

/** 마운트 시 view 이벤트를 전송하고, props(예: chat_id)가 바뀌면 다시 전송합니다. */
export function useTrackOnView<K extends AnalyticsEventName>(
  name: K,
  ...args: TrackOnViewArgs<K>
): void {
  const depKey = JSON.stringify(args);

  useEffect(() => {
    track(name, ...args);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, depKey]);
}
