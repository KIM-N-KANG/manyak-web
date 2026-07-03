import localFont from 'next/font/local';

export const pretendard = localFont({
  src: './pretendard/PretendardVariable.woff2',
  weight: '100 900',
  variable: '--font-pretendard',
  display: 'swap',
});

export const maruburi = localFont({
  src: [
    {
      path: './maruburi/MaruBuri-Regular.woff2',
      weight: '400',
    },
    {
      path: './maruburi/MaruBuri-SemiBold.woff2',
      weight: '600',
    },
    {
      path: './maruburi/MaruBuri-Bold.woff2',
      weight: '700',
    },
  ],
  variable: '--font-maruburi-family',
  display: 'swap',
});
