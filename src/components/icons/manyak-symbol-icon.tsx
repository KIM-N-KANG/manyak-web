import type { SVGProps } from 'react';

export function ManyakSymbolIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <path
        d="M30 44H24A12 12 0 0 1 12 32V20A12 12 0 0 1 24 8H40A12 12 0 0 1 52 20V44C52 51 50 56 44 56H16"
        stroke="currentColor"
        strokeWidth="7.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="25" cy="24" r="4" fill="currentColor" />
      <circle cx="39" cy="24" r="4" fill="currentColor" />
    </svg>
  );
}
