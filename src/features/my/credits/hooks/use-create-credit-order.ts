'use client';

import { toast } from 'sonner';

import { useCreate } from '@/api/generated/endpoints/credits/credits';
import { TOAST_MESSAGE } from '@/constants/toast-message';

import { savePendingCreditOrder } from '../utils/pending-credit-order-storage';

/**
 * 웹 이프 충전 주문을 만들고 그로블 결제창으로 이동하는 훅.
 * 주문 생성만으로는 이프가 적립되지 않으며, 적립은 결제 완료 웹훅이 처리한다.
 *
 * @returns 주문 생성 함수와 진행 중인 상품 ID
 */
export function useCreateCreditOrder() {
  const mutation = useCreate({
    mutation: {
      onSuccess: (response) => {
        if (response.status !== 201 || !response.data.paymentUrl) {
          toast.error(TOAST_MESSAGE.CREDIT_ORDER_FAILED);

          return;
        }

        // 복귀 URL에 주문 ID가 실려 오지 않으므로 나가기 전에 기기에 남긴다.
        if (response.data.orderId) {
          savePendingCreditOrder(response.data.orderId);
        }

        // 결제창은 외부(그로블) 페이지라 앱 라우터 대신 전체 이동한다.
        window.location.assign(response.data.paymentUrl);
      },
      onError: () => {
        toast.error(TOAST_MESSAGE.CREDIT_ORDER_FAILED);
      },
    },
  });

  return {
    createOrder: (productId: string) =>
      mutation.mutate({ data: { productId } }),
    // 결제창 이동이 끝날 때까지 성공 후에도 잠근 채로 둔다 — 같은 상품을 두 번 눌러 주문이 겹치지 않게.
    orderingProductId:
      mutation.isPending || mutation.isSuccess
        ? mutation.variables?.data.productId
        : undefined,
  };
}
