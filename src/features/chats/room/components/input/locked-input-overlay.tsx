type LockedInputOverlayProps = {
  locked: boolean;
  onTap: () => void;
};

/**
 * 잠긴(disabled) 입력창 위를 덮어 탭을 받는 투명 층.
 * disabled 요소는 브라우저가 클릭을 조상에도 전달하지 않으므로 별도 층이 필요하다.
 * 부모 `InputGroup`이 `relative`라 그 상자에 맞춰 깔린다.
 */
export function LockedInputOverlay({ locked, onTap }: LockedInputOverlayProps) {
  if (!locked) return null;

  return (
    <div aria-hidden="true" className="absolute inset-0 z-10" onClick={onTap} />
  );
}
