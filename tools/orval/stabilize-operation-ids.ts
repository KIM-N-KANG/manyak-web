import { defineTransformer } from 'orval';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

const pascal = (text: string) =>
  text
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

/**
 * HTTP 메서드와 경로로 operationId를 만든다.
 * 예: `GET /api/v1/stories/submissions/{id}`는 `getStoriesSubmissionsById`가 된다.
 */
export const routeOperationId = (method: string, route: string) =>
  method +
  route
    .replace(/^\/api\/v\d+/, '')
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      const param = /^\{(.+)\}$/.exec(segment)?.[1];

      return param ? `By${pascal(param)}` : pascal(segment);
    })
    .join('');

/**
 * 서로 겹치는 operationId를 경로 기반 이름으로 바꾸는 Orval 입력 변환기.
 * Springdoc은 Java 메서드 이름으로 operationId를 만들고 겹치면 스캔 순서대로 `get`, `get_1`처럼 순번을 붙인다.
 * 백엔드에 같은 이름의 메서드가 추가되면 순번이 밀려 같은 생성 이름이 다른 API를 가리키므로, 겹치는 이름은 전부 경로로 고정한다.
 * operationId가 자기 경로 매개변수 이름이나 Orval이 생성 코드 안에서 쓰는 인자 이름(`options`, `params` 등)과 같으면
 * 생성 훅 안에서 인자가 함수를 가려 타입 오류가 나므로 같은 방식으로 바꾼다.
 * 그 밖의 이름은 그대로 둔다.
 */
const GENERATED_ARGUMENT_NAMES = new Set([
  'options',
  'params',
  'request',
  'signal',
  'queryClient',
  'queryKey',
  'data',
]);

export const stabilizeOperationIds = defineTransformer((spec) => {
  const operations = Object.entries(spec.paths ?? {}).flatMap(
    ([route, pathItem]) =>
      HTTP_METHODS.flatMap((method) => {
        const operation = pathItem?.[method];

        return operation?.operationId
          ? [{ method, route, operation, operationId: operation.operationId }]
          : [];
      }),
  );
  const baseName = (operationId: string) => operationId.replace(/_\d+$/, '');
  const counts = new Map<string, number>();

  for (const { operationId } of operations) {
    const base = baseName(operationId);

    counts.set(base, (counts.get(base) ?? 0) + 1);
  }

  for (const { method, route, operation, operationId } of operations) {
    const shadowed =
      GENERATED_ARGUMENT_NAMES.has(operationId) ||
      operation.parameters?.some(
        (parameter) => 'name' in parameter && parameter.name === operationId,
      );

    if ((counts.get(baseName(operationId)) ?? 0) > 1 || shadowed) {
      operation.operationId = routeOperationId(method, route);
    }
  }

  return spec;
});
