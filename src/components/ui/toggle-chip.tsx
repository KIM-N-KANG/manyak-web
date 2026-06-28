'use client';

import { Toggle as ToggleChipPrimitive } from '@base-ui/react/toggle';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const toggleChipVariants = cva(
  "group/toggle-chip transition-color inline-flex items-center justify-center rounded-md border border-border bg-input text-sm font-medium whitespace-nowrap text-foreground outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-pressed:border-primary aria-pressed:bg-primary/20 aria-pressed:text-primary dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      size: {
        default:
          'h-10 gap-1.5 px-3.5 py-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-sm),10px)] px-3 py-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        lg: "h-12 gap-2 rounded-lg px-4 py-3 text-base has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-5",
        icon: 'size-10',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-sm),8px)] in-data-[slot=button-group]:rounded-sm [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          "size-8 rounded-[min(var(--radius-sm),10px)] in-data-[slot=button-group]:rounded-sm [&_svg:not([class*='size-'])]:size-3",
        'icon-lg': "size-12 rounded-lg [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

function ToggleChip({
  className,
  size = 'default',
  ...props
}: ToggleChipPrimitive.Props & VariantProps<typeof toggleChipVariants>) {
  return (
    <ToggleChipPrimitive
      data-slot="toggle-chip"
      className={cn(toggleChipVariants({ size, className }))}
      {...props}
    />
  );
}

export { ToggleChip, toggleChipVariants };
