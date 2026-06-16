# 기본 지침

작업을 시작하기 전에 다음 문서를 먼저 확인하세요.

- `../knk-harness/AGENTS.md`

## Next.js 프론트엔드 전용 지침

- React Compiler를 사용 중이기 때문에 `useMemo`, `useCallback`을 사용하지마세요.
- `<form onSubmit>` 핸들러를 작성할 때는 deprecated된 `FormEvent` 대신 `SubmitEvent<HTMLFormElement>`를 사용하세요.
