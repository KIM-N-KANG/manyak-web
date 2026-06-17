import { Spinner } from '@/components/ui/spinner';

type LoadingButtonContentProps = {
  isLoading: boolean;
  loadingLabel: string;
  children: string;
};

export function LoadingButtonContent({
  isLoading,
  loadingLabel,
  children,
}: LoadingButtonContentProps) {
  return (
    <>
      <span
        aria-hidden={isLoading}
        className={isLoading ? 'invisible' : undefined}>
        {children}
      </span>
      {isLoading && <Spinner className="absolute" aria-label={loadingLabel} />}
    </>
  );
}
