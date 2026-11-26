type DefaultPathParams = Record<string, string | number | boolean>;

type DefaultQueryParams = Record<
  string,
  string | number | boolean | undefined | null | (string | number | boolean)[]
>;

type Params<PathParams, QueryParams> = {
  url: string;
  pathParams?: PathParams;
  queryParams?: QueryParams;
};

/**
 * pathParams 혹은 queryParams 를 사용해 URL 을 완성하는 유틸 함수
 *
 * 경로 파라미터는 `encodeURIComponent`로 인코딩해 `{key}` 자리에 넣고, 남은 자리가 있으면 경고만 남긴다.
 * 쿼리 파라미터의 undefined와 null은 빼고, 배열은 같은 키로 여러 번 붙인다.
 *
 * @param params 원본 URL(`url`), 경로 파라미터(`pathParams`), 쿼리 파라미터(`queryParams`)
 * @returns 파라미터가 치환, 결합된 최종 URL 문자열
 * @example
 * ```ts
 * buildUrlWithParams({ url: '/info/{id}', pathParams: { id: 1 } }); // '/info/1'
 * buildUrlWithParams({
 *   url: '/list?sort=desc',
 *   queryParams: { page: 2, tag: ['a', 'b'], cursor: undefined },
 * }); // '/list?sort=desc&page=2&tag=a&tag=b'
 * ```
 */
export function buildUrlWithParams<
  PathParams extends DefaultPathParams = DefaultPathParams,
  QueryParams extends DefaultQueryParams = DefaultQueryParams,
>({ url, pathParams, queryParams }: Params<PathParams, QueryParams>) {
  let newUrl = url;

  if (pathParams) {
    for (const [key, value] of Object.entries(pathParams)) {
      newUrl = newUrl.replaceAll(`{${key}}`, encodeURIComponent(String(value)));
    }
  }

  // 아직 치환되지 않은 URL 파라미터 체크
  if (newUrl.match(/\{[a-zA-Z0-9_]+\}/)) {
    console.warn(
      `[buildUrlWithParams] 아직 치환되지 않은 파라미터가 있습니다: ${newUrl}`,
    );
  }

  if (queryParams) {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(queryParams)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }

    const queryString = searchParams.toString();

    if (queryString) {
      const separator = newUrl.includes('?') ? '&' : '?';

      newUrl += `${separator}${queryString}`;
    }
  }

  return newUrl;
}
