import { Spinner } from '@/components/ui/spinner';

type PageLoadingSpinnerProps = {
  'aria-label'?: string;
};

export function PageLoadingSpinner({
  'aria-label': ariaLabel,
}: PageLoadingSpinnerProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Spinner
        className="size-6 text-foreground-tertiary"
        aria-label={ariaLabel}
      />
    </div>
  );
}
