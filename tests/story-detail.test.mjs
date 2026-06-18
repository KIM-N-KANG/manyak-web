import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = () =>
  readFileSync(
    'src/features/stories/detail/components/story-detail.tsx',
    'utf8',
  );
const storyTextSource = () =>
  readFileSync('src/features/stories/components/story-text.tsx', 'utf8');

test('story detail uses the shared story text component with the default font', () => {
  const text = source();
  const storyText = storyTextSource();

  assert.match(
    text,
    /import \{ StoryText \} from '@\/features\/stories\/components\/story-text';/,
  );
  assert.match(text, /<StoryText>\{story\.detailedIntroduction\}<\/StoryText>/);
  assert.match(text, /<StoryText>\{story\.startSituationName\}<\/StoryText>/);
  assert.match(text, /<StoryText>\{story\.conversationPrologue\}<\/StoryText>/);
  assert.doesNotMatch(
    text,
    /@\/features\/stories\/new\/components\/storyline-text/,
  );
  assert.match(storyText, /font = 'default'/);
});
