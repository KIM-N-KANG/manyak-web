---
name: create-commit
description: 로컬 변경사항을 팀 규칙에 맞춰 커밋해 달라는 요청에 사용합니다. 예를 들어 "커밋해줘", "이거 나눠서 커밋해줘"에 적용합니다. 하네스 공통 create-commit 스킬로 연결합니다. 커밋 메시지 제안이나 검토만 요청하면 Git 상태를 바꾸지 않습니다.
---

# 커밋 생성 (하네스 공통 스킬 연결)

하네스 공통 스킬 `../knk-harness/.agents/skills/create-commit/SKILL.md`를 읽고 그 절차를 그대로 따릅니다. 이 파일은 스킬 목록에 올리기 위한 연결이며 절차를 따로 정하지 않습니다. 원본 안의 상대 경로는 이 파일이 아니라 `../knk-harness/.agents/skills/create-commit/` 기준으로 해석합니다.

- 원본이 말하는 프로젝트 필수 검증은 AGENTS.md의 `pnpm typecheck && pnpm lint && pnpm test`입니다. 전체 E2E는 PR CI로 확인하므로 커밋 때 돌리지 않습니다. 다만 E2E 스펙을 새로 쓰거나 고친 커밋은 AGENTS.md대로 해당 스펙을 로컬에서 실행합니다.
- 하네스 경로가 없으면 하네스 위치를 확인하고, 찾지 못하면 사용자에게 알립니다.
