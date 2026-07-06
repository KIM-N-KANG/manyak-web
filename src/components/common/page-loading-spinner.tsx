import { Spinner } from '@/components/ui/spinner';

type PageLoadingSpinnerProps = {
  'aria-label'?: string;
};

/** 페이지·콘텐츠 로딩 시 화면 중앙에 표시하는 공통 스피너 */
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
