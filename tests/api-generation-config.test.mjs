import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

const listFiles = (dir) => {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);

    if (statSync(path).isDirectory()) {
      return listFiles(path);
    }

    return path;
  });
};

test('package exposes API generation dependencies and script', () => {
  const packageJson = JSON.parse(read('package.json'));

  assert.equal(
    packageJson.scripts['api:generate'],
    'orval --config ./orval.config.ts && eslint --fix src/services/generated',
  );
  assert.ok(packageJson.dependencies.zod);
  assert.ok(packageJson.devDependencies.orval);
});

test('orval config reads backend OpenAPI and generates API plus Zod outputs', () => {
  const source = read('orval.config.ts');

  assert.match(source, /defineConfig/);
  assert.match(source, /http:\/\/localhost:8080\/v3\/api-docs/);
  assert.match(source, /manyakApi/);
  assert.match(source, /client:\s*'react-query'/);
  assert.match(source, /mode:\s*'tags-split'/);
  assert.match(source, /target:\s*'src\/services\/generated\/api\/index\.ts'/);
  assert.match(source, /schemas:\s*'src\/services\/generated\/api\/model'/);
  assert.match(source, /path:\s*'src\/services\/mutator\/custom-instance\.ts'/);
  assert.match(source, /name:\s*'customInstance'/);
  assert.match(source, /manyakApiZod/);
  assert.match(source, /client:\s*'zod'/);
  assert.match(source, /target:\s*'src\/services\/generated\/zod\/index\.ts'/);
  assert.match(source, /afterAllFilesWrite:\s*'prettier --write'/);
});

test('custom mutator preserves request behavior expected by generated clients', () => {
  const source = read('src/services/mutator/custom-instance.ts');

  assert.match(source, /export const customInstance/);
  assert.match(source, /BodyType/);
  assert.match(source, /ErrorType/);
  assert.match(source, /FetchError/);
  assert.match(source, /url:\s*string/);
  assert.match(source, /options:\s*RequestInit\s*=\s*\{\}/);
  assert.doesNotMatch(source, /process\.env/);
  assert.match(source, /resolveApiProxyUrl/);
  assert.match(source, /text\/event-stream/);
  assert.match(source, /response\.body/);
  assert.match(source, /signal/);
  assert.match(source, /data:/);
  assert.match(source, /status:\s*response\.status/);
  assert.match(source, /headers:\s*response\.headers/);
});

test('generated clients call the custom mutator with URL and request init', () => {
  const apiFiles = listFiles('src/services/generated/api').filter((path) =>
    path.endsWith('.ts'),
  );
  const apiSource = apiFiles.map(read).join('\n');

  assert.match(
    apiSource,
    /customInstance<createSimpleStoryResponse>\(\s*getCreateSimpleStoryUrl\(\),/,
  );
  assert.match(
    apiSource,
    /customInstance<getStoryDetailResponse>\(\s*getGetStoryDetailUrl\(storyId\),/,
  );
});

test('generated API and Zod outputs contain current OpenAPI operations', () => {
  const apiFiles = listFiles('src/services/generated/api').filter((path) =>
    path.endsWith('.ts'),
  );
  const zodFiles = listFiles('src/services/generated/zod').filter((path) =>
    path.endsWith('.ts'),
  );
  const apiSource = apiFiles.map(read).join('\n');
  const zodSource = zodFiles.map(read).join('\n');

  assert.ok(apiFiles.length > 0);
  assert.ok(zodFiles.length > 0);
  assert.match(apiSource, /@tanstack\/react-query/);
  assert.match(apiSource, /createSimpleStory/);
  assert.match(apiSource, /generateSimpleStorylines/);
  assert.match(apiSource, /getStoriesByIds/);
  assert.match(apiSource, /createChat/);
  assert.match(apiSource, /streamChatTurn/);
  assert.match(apiSource, /getChatsByIds/);
  assert.match(apiSource, /getStoryDetail/);
  assert.match(apiSource, /getSimpleStoryTags/);
  assert.match(apiSource, /getChatDetail/);
  assert.match(zodSource, /zod/);
  assert.match(zodSource, /CreateSimpleStoryBody/);
});
