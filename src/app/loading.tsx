import { Spinner } from '@/components/ui/spinner';

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Spinner
        className="size-6 text-foreground-tertiary"
        aria-label="페이지를 불러오는 중"
      />
    </div>
  );
}
