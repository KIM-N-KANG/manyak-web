export const CREATED_STORY_IDS_STORAGE_KEY = 'manyak:created-story-ids';

const parseSavedStoryIds = (value: string | null) => {
  if (!value) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (savedStoryId): savedStoryId is number =>
        typeof savedStoryId === 'number' && Number.isInteger(savedStoryId),
    );
  } catch {
    return [];
  }
};

export const saveCreatedStoryId = (storyId: number) => {
  if (typeof window === 'undefined') {
    return;
  }

  const savedStoryIds = parseSavedStoryIds(
    localStorage.getItem(CREATED_STORY_IDS_STORAGE_KEY),
  );
  const nextStoryIds = [
    storyId,
    ...savedStoryIds.filter((savedStoryId) => savedStoryId !== storyId),
  ].slice(0, 100);

  localStorage.setItem(
    CREATED_STORY_IDS_STORAGE_KEY,
    JSON.stringify(nextStoryIds),
  );
};
