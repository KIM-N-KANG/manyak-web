'use client';

import { useProducts } from '@/api/generated/endpoints/credits/credits';
import { CreditMark } from '@/components/common/credit-mark';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

import {
  buildCreditBonusLabel,
  buildCreditProductLabel,
  CREDIT_PURCHASE_COPY,
  formatKrwPrice,
} from '../constants';
import { useCreateCreditOrder } from '../hooks/use-create-credit-order';

const PLACEHOLDER_ROW_COUNT = 6;

/** 상품 줄은 마이 메뉴 줄과 같은 높이·가로 여백을 쓰고, 줄 사이는 구분선 없이 16px 간격으로 띄운다. */
const ROW_CLASS = 'flex min-h-12 items-center gap-4 px-4';
const LIST_CLASS = 'flex flex-col gap-4';

/** 이프 충전 상품 목록. 웹 가격만 표시하고 상품을 고르면 주문을 만들어 결제창으로 보낸다. */
export function CreditPurchaseTab() {
  const { data, isPending, isError, isFetching, refetch } = useProducts();
  const { createOrder, orderingProductId } = useCreateCreditOrder();

  const products = data?.status === 200 ? (data.data.items ?? []) : [];

  return (
    <div className="flex h-full scroll-fade-b flex-col overflow-y-auto overscroll-contain pt-2 pb-4">
      {isPending ? (
        <div
          className={LIST_CLASS}
          role="status"
          aria-label={CREDIT_PURCHASE_COPY.loading}>
          {Array.from({ length: PLACEHOLDER_ROW_COUNT }, (_, index) => (
            <div key={index} className={ROW_CLASS}>
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-10 w-24" />
            </div>
          ))}
        </div>
      ) : null}

      {isError ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-foreground-secondary">
            {CREDIT_PURCHASE_COPY.loadFailed}
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isFetching}
            onClick={() => void refetch()}>
            {isFetching
              ? CREDIT_PURCHASE_COPY.retrying
              : CREDIT_PURCHASE_COPY.retry}
          </Button>
        </div>
      ) : null}

      {products.length > 0 ? (
        <>
          <ul className={LIST_CLASS}>
            {products.map(
              ({
                productId = '',
                baseCredits = 0,
                bonusCredits = 0,
                webPriceKrw = 0,
              }) => {
                const isOrdering = orderingProductId === productId;

                return (
                  <li key={productId} className={ROW_CLASS}>
                    <span className="flex flex-1 flex-col">
                      <span className="flex items-center gap-1">
                        <CreditMark />
                        {buildCreditProductLabel(baseCredits)}
                      </span>
                      {bonusCredits > 0 && (
                        // 마크(16px)+간격(4px)만큼 들여 기본 수치의 글자 시작선에 맞춘다.
                        <span className="pl-5 text-sm font-bold text-primary">
                          {buildCreditBonusLabel(bonusCredits)}
                        </span>
                      )}
                    </span>
                    <Button
                      type="button"
                      className="relative tabular-nums"
                      disabled={orderingProductId !== undefined}
                      onClick={() => createOrder(productId)}>
                      <span className={isOrdering ? 'invisible' : undefined}>
                        {formatKrwPrice(webPriceKrw)}
                      </span>
                      {isOrdering && (
                        <Spinner
                          className="absolute"
                          aria-label={CREDIT_PURCHASE_COPY.ordering}
                        />
                      )}
                    </Button>
                  </li>
                );
              },
            )}
          </ul>
          <p className="px-4 pt-6 text-right text-xs text-foreground-secondary">
            {CREDIT_PURCHASE_COPY.note}
          </p>
        </>
      ) : null}
    </div>
  );
}
