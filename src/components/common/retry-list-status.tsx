import { ListStatus } from '@/components/common/list-status';
import { Button } from '@/components/ui/button';

type RetryListStatusProps = {
  title: string;
  description?: string;
  onRetry: () => void;
};

export function RetryListStatus({
  title,
  description = '잠시 후 다시 시도해주세요',
  onRetry,
}: RetryListStatusProps) {
  return (
    <ListStatus title={title} description={description}>
      <Button variant="outline" size="lg" onClick={onRetry}>
        다시 시도
      </Button>
    </ListStatus>
  );
}
