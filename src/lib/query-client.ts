import {
  type MutationObserverOptions,
  QueryClient,
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

export const makeQueryClient = () => {
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
};

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
