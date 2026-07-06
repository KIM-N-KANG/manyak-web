import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** clsx로 클래스명을 조합하고 tailwind-merge로 중복 Tailwind 클래스를 병합한다. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
