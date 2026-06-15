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
 * @param url - 파라미터를 넣기 전 원본 URL (예: `/info/{id}` 또는 `/list?sort=desc`)
 * @param pathParams - path parameter (예: `{ id: 1 }`)
 * @param queryParams - query parameter (예: `{ bojUsername: 'alsdn1360' }`)
 */
export const buildUrlWithParams = <
  PathParams extends DefaultPathParams = DefaultPathParams,
  QueryParams extends DefaultQueryParams = DefaultQueryParams,
>({
  url,
  pathParams,
  queryParams,
}: Params<PathParams, QueryParams>) => {
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
};
