import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

const extractSizeVariants = (source) => {
  const [, sizeBlock] = source.match(
    /size:\s*\{([\s\S]*?)\n\s*\},\n\s*\},\n\s*defaultVariants:/,
  );

  return Object.fromEntries(
    [...sizeBlock.matchAll(/(?:'([^']+)'|(\w+)):\s*("[^"]+"|'[^']+')/g)].map(
      ([, quotedKey, bareKey, rawValue]) => [
        quotedKey ?? bareKey,
        rawValue.slice(1, -1),
      ],
    ),
  );
};

test('toggle chip replaces the old chips component name and file', () => {
  const source = read('src/components/ui/toggle-chip.tsx');

  assert.equal(existsSync('src/components/ui/chips.tsx'), false);
  assert.match(source, /const toggleChipVariants = cva/);
  assert.match(source, /function ToggleChip\(/);
  assert.match(source, /export \{ ToggleChip, toggleChipVariants \}/);
  assert.doesNotMatch(source, /chipsVariants/);
  assert.doesNotMatch(source, /function Chips\(/);
});

test('story keyword step uses toggle chip instead of chips', () => {
  const source = read(
    'src/features/stories/new/components/story-keyword-step-section.tsx',
  );

  assert.match(
    source,
    /import \{ ToggleChip \} from '@\/components\/ui\/toggle-chip';/,
  );
  assert.match(source, /<ToggleChip/);
  assert.match(source, /pressed=\{isSelected/);
  assert.doesNotMatch(source, /<ToggleChip[^>]*variant=/);
  assert.doesNotMatch(source, /@\/components\/ui\/chips/);
  assert.doesNotMatch(source, /<Chips/);
});

test('toggle chip applies its only outline style without variant props', () => {
  const source = read('src/components/ui/toggle-chip.tsx');

  assert.doesNotMatch(source, /variant:\s*\{/);
  assert.doesNotMatch(source, /variant =/);
  assert.doesNotMatch(source, /toggleChipVariants\(\{[^}]*variant/);
  assert.match(source, /border/);
  assert.match(source, /border-border/);
  assert.match(source, /bg-input/);
  assert.match(source, /hover:bg-muted/);
});

test('toggle chip size variants match button size variants', () => {
  const buttonSizes = extractSizeVariants(read('src/components/ui/button.tsx'));
  const toggleChipSizes = extractSizeVariants(
    read('src/components/ui/toggle-chip.tsx'),
  );

  assert.deepEqual(toggleChipSizes, buttonSizes);
});

test('toggle chip variants do not apply shadow utilities', () => {
  const source = read('src/components/ui/toggle-chip.tsx');

  assert.doesNotMatch(source, /(?:^|[\s'"])shadow(?:-[^\s'"]+)?(?:[\s'"]|$)/);
});

test('toggle chip uses foreground text when inactive and primary styles when active', () => {
  const source = read('src/components/ui/toggle-chip.tsx');

  assert.match(source, /text-foreground/);
  assert.match(source, /aria-pressed:bg-primary\/8/);
  assert.match(source, /aria-pressed:border-primary/);
  assert.match(source, /aria-pressed:text-primary/);
});
