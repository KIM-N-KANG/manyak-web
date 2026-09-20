/**
 * 줄바꿈이 든 화면 문구를 접근 가능한 이름과 같은 한 줄로 바꾼다.
 * `getByRole`의 name·`getByText`는 공백을 정규화한 텍스트와 대조하므로 `\n`을 공백으로 편다.
 */
export const oneLine = (text: string): string => text.replace(/\n/g, ' ');
