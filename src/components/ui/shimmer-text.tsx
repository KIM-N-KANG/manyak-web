import { cn } from '@/lib/utils';

type ShimmerTextProps = {
  children: React.ReactNode;
  className?: string;
};

export function ShimmerText({ children, className }: ShimmerTextProps) {
  return <span className={cn('text-shimmer', className)}>{children}</span>;
}
