'use client';

import { useEffect, useRef, useState } from 'react';

import {
  useCancelStorylineRating,
  useRateStoryline,
} from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import { type StorylineRatingRequestRating } from '@/api/generated/models';

export type StorylineRating =
  (typeof StorylineRatingRequestRating)[keyof typeof StorylineRatingRequestRating];

const RATING_SYNC_DEBOUNCE_MS = 300;

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

    const onSettled = () => {
      inFlightRef.current[storylineId] = false;

      if (
        desiredRatingsRef.current[storylineId] !==
        syncedRatingsRef.current[storylineId]
      ) {
        syncRating(storylineId);
      }
    };

    if (desired === undefined) {
      cancelStorylineRating.mutate(
        { storylineId },
        {
          onSuccess: () => {
            syncedRatingsRef.current[storylineId] = undefined;
          },
          onError: () => revertToSynced(storylineId),
          onSettled,
        },
      );
    } else {
      rateStoryline.mutate(
        { storylineId, data: { rating: desired } },
        {
          onSuccess: () => {
            syncedRatingsRef.current[storylineId] = desired;
          },
          onError: () => revertToSynced(storylineId),
          onSettled,
        },
      );
    }
  };

  const toggleStorylineRating = (
    storylineId: number,
    rating: StorylineRating,
  ) => {
    const current = desiredRatingsRef.current[storylineId];
    const nextRating = current === rating ? undefined : rating;

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
    }, RATING_SYNC_DEBOUNCE_MS);
  };

  return {
    storylineRatings,
    toggleStorylineRating,
  };
}
