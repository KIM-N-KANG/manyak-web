import { Fragment } from 'react';

import { Separator } from '@/components/ui/separator';

import { MOCK_STORIES } from '../mock';
import { StoryCard } from './story-card';

export function StoryList() {
  return (
    <ul className="flex flex-col gap-4 p-4">
      {MOCK_STORIES.map((story, index) => (
        <Fragment key={story.id}>
          <li>
            <StoryCard story={story} />
          </li>
          {index < MOCK_STORIES.length - 1 && <Separator />}
        </Fragment>
      ))}
    </ul>
  );
}
