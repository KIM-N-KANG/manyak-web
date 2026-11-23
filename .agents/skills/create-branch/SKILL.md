---
name: create-branch
description: Jira 티켓의 작업 브랜치 생성, 기존 브랜치 체크아웃 또는 작업 시작을 요청할 때 사용합니다. 예를 들어 "브랜치 만들어줘", "KNK-123 작업 시작하자"에 적용합니다. 하네스 공통 create-branch 스킬로 연결합니다. 브랜치명 미리보기만 요청하면 브랜치와 Jira 상태를 바꾸지 않습니다.
---

# 브랜치 생성 (하네스 공통 스킬 연결)

하네스 공통 스킬 `../knk-harness/.agents/skills/create-branch/SKILL.md`를 읽고 그 절차를 그대로 따릅니다. 이 파일은 스킬 목록에 올리기 위한 연결이며 절차를 따로 정하지 않습니다. 원본 안의 상대 경로는 이 파일이 아니라 `../knk-harness/.agents/skills/create-branch/` 기준으로 해석합니다.

- 스크립트 경로는 저장소 루트 기준 `../knk-harness/.agents/skills/create-branch/scripts/create_branch.py`입니다.
- 이 저장소는 worktree를 만들지 않고 원래 체크아웃에서 브랜치를 바꿉니다(AGENTS.md 기본 지침).
- 하네스 경로가 없으면 하네스 위치를 확인하고, 찾지 못하면 브랜치를 임의로 만들지 말고 사용자에게 알립니다.
