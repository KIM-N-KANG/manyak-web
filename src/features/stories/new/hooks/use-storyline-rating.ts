'use client';

import { useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

import {
  useCancelStorylineRating,
  useRateStoryline,
} from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { track } from '@/observability/analytics';

import { STORYLINE_RATING_SYNC_DEBOUNCE_MS } from '../constants';
import type { StorylineRating } from '../types';

export function useStorylineRating() {
  const [storylineRatings, setStorylineRatings] = useState<
    Record<number, StorylineRating>
  >({});
  const rateStoryline = useRateStoryline();
  const cancelStorylineRating = useCancelStorylineRating();
  const desiredRatingsRef = useRef<Record<number, StorylineRating | undefined>>(
    {},
  );
  const syncedRatingsRef = useRef<Record<number, StorylineRating | undefined>>(
    {},
  );
  const timersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const inFlightRef = useRef<Record<number, boolean>>({});

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const revertToSynced = (storylineId: number) => {
    const synced = syncedRatingsRef.current[storylineId];

    toast.error(TOAST_MESSAGE.STORYLINE_EVALUATE_FAILED);
    desiredRatingsRef.current[storylineId] = synced;
    setStorylineRatings((prev) => {
      const next = { ...prev };

      if (synced === undefined) {
        delete next[storylineId];
      } else {
        next[storylineId] = synced;
      }

      return next;
    });
  };

  const syncRating = (storylineId: number) => {
    if (inFlightRef.current[storylineId]) {
      return;
    }

    const desired = desiredRatingsRef.current[storylineId];
    const synced = syncedRatingsRef.current[storylineId];

    if (desired === synced) {
      return;
    }

    inFlightRef.current[storylineId] = true;

    const settle = () => {
      inFlightRef.current[storylineId] = false;

      if (
        desiredRatingsRef.current[storylineId] !==
        syncedRatingsRef.current[storylineId]
      ) {
        syncRating(storylineId);
      }
    };

    // 여러 스토리라인이 단일 mutation 훅을 공유하므로, per-call 콜백 대신
    // mutateAsync의 per-request 프로미스로 각 평가가 자신의 상태를 정리하도록 한다.
    const request =
      desired === undefined
        ? cancelStorylineRating.mutateAsync({ storylineId })
        : rateStoryline.mutateAsync({ storylineId, data: { rating: desired } });

    void request
      .then(() => {
        syncedRatingsRef.current[storylineId] = desired;

        // 응답 도착 전 다른 선택으로 바뀌었다면(stale) 토스트를 띄우지 않는다.
        if (desiredRatingsRef.current[storylineId] !== desired) {
          return;
        }

        if (desired === 'GOOD') {
          toast.success(TOAST_MESSAGE.STORYLINE_LIKED);
        } else if (desired === 'BAD') {
          toast.success(TOAST_MESSAGE.STORYLINE_DISLIKED);
        }
        // desired === undefined(평가 취소)는 토스트를 띄우지 않는다.
      })
      .catch(() => revertToSynced(storylineId))
      .finally(settle);
  };

  const toggleStorylineRating = (
    storylineId: number,
    rating: StorylineRating,
  ) => {
    const current = desiredRatingsRef.current[storylineId];
    const nextRating = current === rating ? undefined : rating;

    track('client_storyCreate_storylineRating_clicked', {
      storyline_id: String(storylineId),
      rating,
      active: nextRating !== undefined,
    });

    desiredRatingsRef.current[storylineId] = nextRating;
    setStorylineRatings((prev) => {
      const next = { ...prev };

      if (nextRating === undefined) {
        delete next[storylineId];
      } else {
        next[storylineId] = nextRating;
      }

      return next;
    });

    if (timersRef.current[storylineId]) {
      clearTimeout(timersRef.current[storylineId]);
    }

    timersRef.current[storylineId] = setTimeout(() => {
      delete timersRef.current[storylineId];
      syncRating(storylineId);
    }, STORYLINE_RATING_SYNC_DEBOUNCE_MS);
  };

  return {
    storylineRatings,
    toggleStorylineRating,
  };
}
