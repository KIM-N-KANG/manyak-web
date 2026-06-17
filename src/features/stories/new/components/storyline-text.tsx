type StorylineTextProps = {
  children?: string;
};

export function StorylineText({ children }: StorylineTextProps) {
  return <p className="font-maruburi text-base leading-loose">{children}</p>;
}
