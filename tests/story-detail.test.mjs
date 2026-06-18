import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = () =>
  readFileSync(
    'src/features/stories/detail/components/story-detail.tsx',
    'utf8',
  );
const textContentSource = () =>
  readFileSync('src/components/common/text-content.tsx', 'utf8');
const headerSource = () =>
  readFileSync(
    'src/features/stories/detail/components/story-detail-header.tsx',
    'utf8',
  );

test('story detail uses the shared text content component with the default font', () => {
  const text = source();
  const textContent = textContentSource();

  assert.match(
    text,
    /import \{ TextContent \} from '@\/components\/common\/text-content';/,
  );
  assert.match(
    text,
    /<TextContent>\{story\.detailedIntroduction\}<\/TextContent>/,
  );
  assert.match(
    text,
    /<TextContent>\{story\.startSituationName\}<\/TextContent>/,
  );
  assert.match(
    text,
    /<TextContent>\{story\.conversationPrologue\}<\/TextContent>/,
  );
  assert.doesNotMatch(
    text,
    /@\/features\/stories\/new\/components\/storyline-text/,
  );
  assert.match(textContent, /font = 'default'/);
});

test('story detail header shows a bottom border after the page scrolls', () => {
  const text = headerSource();

  assert.match(text, /useEffect/);
  assert.match(text, /useState/);
  assert.match(text, /scrollY\s*>\s*0/);
  assert.match(text, /window\.addEventListener\('scroll'/);
  assert.match(text, /window\.removeEventListener\('scroll'/);
  assert.match(text, /border-b/);
  assert.match(text, /border-transparent/);
  assert.match(text, /border-border/);
  assert.match(text, /transition-colors/);
});
