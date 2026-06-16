export function StoryCreateTitle() {
  return (
    <div className="flex flex-col items-start gap-1 p-4">
      <div className="text-xl font-semibold">
        <p>만들고 싶은 스토리의</p>
        <p>키워드를 골라주세요 </p>
      </div>
      <p className="text-foreground-secondary">
        선택한 키워드로 AI가 스토리라인을 만들어드려요
      </p>
    </div>
  );
}
