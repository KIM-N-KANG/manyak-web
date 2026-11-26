import localFont from 'next/font/local';

export const pretendard = localFont({
  src: './pretendard/PretendardVariable.woff2',
  weight: '100 900',
  variable: '--font-pretendard',
  display: 'swap',
});

/**
 * 명조 계열 마루부리 폰트. `globals.css`가 `--font-maruburi-family`를 `--font-serif`, `--font-maruburi`로 연결한다.
 * 가변 폰트가 아니라 400, 600, 700 세 굵기만 싣는다.
 */
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
