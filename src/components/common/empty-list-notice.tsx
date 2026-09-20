type EmptyListNoticeProps = {
  children: string;
};

/** 빈 목록 안내. 앱과 같이 가운데 한 줄 보조 문구만 둔다. */
export function EmptyListNotice({ children }: EmptyListNoticeProps) {
  return (
    <p className="flex flex-1 items-center justify-center px-4 text-sm text-foreground-secondary">
      {children}
    </p>
  );
}
