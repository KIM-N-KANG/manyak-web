import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'vitest';

import {
  routeOperationId,
  stabilizeOperationIds,
} from '../../../tools/orval/stabilize-operation-ids';

test('겹치는 operationId만 경로 기반 이름으로 바꾼다', async () => {
  const spec = {
    openapi: '3.1.0' as const,
    info: { title: 'test', version: '1' },
    paths: {
      '/api/v1/users/me/story-drafts/{draftId}': {
        get: { operationId: 'get' },
      },
      '/api/v1/stories/submissions/{id}': {
        get: { operationId: 'get_1' },
        put: { operationId: 'resubmit' },
      },
      '/api/v1/stories/art-styles': { get: { operationId: 'get_2' } },
    },
  };

  const result = await stabilizeOperationIds(spec);

  assert.equal(
    result.paths?.['/api/v1/users/me/story-drafts/{draftId}']?.get?.operationId,
    'getUsersMeStoryDraftsByDraftId',
  );
  assert.equal(
    result.paths?.['/api/v1/stories/submissions/{id}']?.get?.operationId,
    'getStoriesSubmissionsById',
  );
  assert.equal(
    result.paths?.['/api/v1/stories/submissions/{id}']?.put?.operationId,
    'resubmit',
  );
  assert.equal(
    result.paths?.['/api/v1/stories/art-styles']?.get?.operationId,
    'getStoriesArtStyles',
  );
});

test('경로 변수나 생성 인자 이름과 같은 operationId도 경로 기반 이름으로 바꾼다', async () => {
  const spec = {
    openapi: '3.1.0' as const,
    info: { title: 'test', version: '1' },
    paths: {
      '/api/v1/admin/conversion/funnels/{funnel}': {
        get: {
          operationId: 'funnel',
          parameters: [{ name: 'funnel', in: 'path' as const }],
        },
      },
      '/api/v1/admin/quality/chat-options': {
        get: { operationId: 'options' },
      },
    },
  };

  const result = await stabilizeOperationIds(spec);

  assert.equal(
    result.paths?.['/api/v1/admin/conversion/funnels/{funnel}']?.get
      ?.operationId,
    'getAdminConversionFunnelsByFunnel',
  );
  assert.equal(
    result.paths?.['/api/v1/admin/quality/chat-options']?.get?.operationId,
    'getAdminQualityChatOptions',
  );
});

test('경로 기반 이름은 경로 변수를 By 접두어로 붙인다', () => {
  assert.equal(
    routeOperationId('delete', '/api/v1/users/me/personas/{personaId}'),
    'deleteUsersMePersonasByPersonaId',
  );
});

test('API와 Zod 생성 설정 모두 operationId 변환기를 쓴다', () => {
  const source = readFileSync('orval.config.ts', 'utf8');

  assert.equal(
    source.match(/transformer:\s*stabilizeOperationIds/g)?.length,
    2,
  );
});
