import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const headerSource = () =>
  readFileSync(
    'src/features/stories/new/components/story-create-header.tsx',
    'utf8',
  );

test('story create header back button uses browser history', () => {
  const source = headerSource();

  assert.match(source, /^'use client';/);
  assert.match(source, /useRouter/);
  assert.match(source, /router\.back\(\)/);
  assert.doesNotMatch(source, /next\/link/);
  assert.doesNotMatch(source, /APP_PATH\.MAIN\.STORIES/);
  assert.match(source, /aria-label="이전 페이지로 돌아가기 버튼"/);
});

test('story create header asks for confirmation before leaving generated storyline steps', () => {
  const source = headerSource();

  assert.match(source, /requiresBackConfirmation/);
  assert.match(source, /useState\(false\)/);
  assert.match(source, /setConfirmBackDialogOpen\(true\)/);
  assert.match(source, /DialogDescription/);
  assert.match(source, /스토리 만들기를 그만할까요\?/);
  assert.match(source, /지금 나가면 만들고 있는 내용이 사라져요/);
  assert.match(source, /계속 만들기/);
  assert.match(source, /나가기/);
  assert.match(source, /onClick=\{handleConfirmBack\}/);
  assert.match(source, /router\.back\(\)/);
});
