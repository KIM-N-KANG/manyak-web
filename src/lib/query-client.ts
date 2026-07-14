import {
  type MutationObserverOptions,
  QueryClient,
  type QueryFunction,
  type QueryObserverOptions,
  type UseInfiniteQueryOptions,
  type UseMutationOptions,
  type UseQueryOptions,
  type UseSuspenseQueryOptions,
} from '@tanstack/react-query';

type Options = {
  queryOptions?: Omit<QueryObserverOptions, 'queryKey'>;
  mutationOptions?: MutationObserverOptions<unknown, unknown, unknown, unknown>;
};

const DEFAULT_QUERY_GC_TIME = 1000 * 60 * 5;

const DEFAULT_STALE_TIME = 1000 * 60 * 1;

const DEFAULT_QUERY_OPTIONS: Options['queryOptions'] = {
  retry: false,
  gcTime: DEFAULT_QUERY_GC_TIME,
  staleTime: DEFAULT_STALE_TIME,
  refetchOnWindowFocus: false,
  throwOnError: false,
};

const DEFAULT_MUTATION_OPTIONS: Options['mutationOptions'] = {
  throwOnError: false,
};

/**
 * React Query의 abort signal을 전달하지 않는 queryFn을 만든다.
 *
 * React StrictMode(dev)는 마운트→언마운트→재마운트를 수행하는데, 생성된
 * queryFn처럼 abort signal을 fetch에 전달하면 전환 언마운트 시점에 첫 요청이
 * 취소되고 재마운트가 새 요청을 발생시켜 화면 진입 시 같은 조회가 두 번
 * 실행될 수 있다(레이아웃의 SessionProvider 초기 리렌더 등 타이밍 변화로 표면화).
 * 멱등한 GET 상세 조회처럼 취소 이득이 없는 쿼리는 이 헬퍼로 signal을 넘기지
 * 않아 in-flight 요청이 재사용(dedupe)되도록 한다.
 *
 * 적용처: 채팅 상세(use-chat-detail), 스토리 상세(story-detail). 마운트 직후
 * 단일 조회를 가정하는 화면(카운터 기반 E2E 목킹 포함)이 늘어나면 같은 방식으로
 * 감싸면 된다.
 *
 * @param fetcher abort signal 없이 실행할 데이터 페처
 * @returns signal을 전달하지 않는 React Query queryFn
 */
export function queryFnWithoutAbortSignal<T>(
  fetcher: () => Promise<T>,
): QueryFunction<T> {
  return () => fetcher();
}

/**
 * 앱 공통 기본 옵션(retry/gcTime/staleTime 등)이 적용된 QueryClient를 생성한다.
 *
 * @returns 기본 옵션이 적용된 QueryClient 인스턴스
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...DEFAULT_QUERY_OPTIONS,
      },
      mutations: {
        ...DEFAULT_MUTATION_OPTIONS,
      },
    },
  });
}

/**
 * API 쿼리 옵션을 간소화하기 위한 타입
 * @TQueryFnData API 성공 응답 타입
 * @TError 에러 타입
 * @TData 최종 변환 타입 (select 후)
 */
export type OmittedQueryOptions<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
> = Omit<UseQueryOptions<TQueryFnData, TError, TData>, 'queryKey' | 'queryFn'>;

/**
 * API 쿼리 옵션을 간소화하기 위한 타입
 * @TQueryFnData API 성공 응답 타입
 * @TError 에러 타입
 * @TData 최종 변환 타입 (select 후)
 */
export type OmittedSuspenseQueryOptions<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
> = Omit<
  UseSuspenseQueryOptions<TQueryFnData, TError, TData>,
  'queryKey' | 'queryFn'
>;

/**
 * API 뮤테이션 옵션을 간소화하기 위한 타입
 * @TData API 성공 응답 타입
 * @TError 에러 타입
 * @TVariables mutate 호출 시 넘기는 인자 타입 (Request Body 등)
 * @TContext onMutate에서 반환하는 컨텍스트 타입
 */
export type OmittedMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> = Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  'mutationKey' | 'mutationFn'
>;

/**
 * API 무한 쿼리 옵션을 간소화하기 위한 타입
 * @TQueryFnData API 성공 응답 타입
 * @TError 에러 타입
 * @TData 최종 변환 타입 (select 후)
 * @TPageParam 페이지 파라미터 타입
 */
export type OmittedInfiniteQueryOptions<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TPageParam = unknown,
> = Omit<
  UseInfiniteQueryOptions<TQueryFnData, TError, TData, unknown[], TPageParam>,
  'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'
>;
