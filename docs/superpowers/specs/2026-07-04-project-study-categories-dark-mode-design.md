# Project/Study 카테고리 분리 + 다크·라이트 모드

## 배경

`site/`(Next.js 개발 일지)는 지금 `project` frontmatter 한 필드로 모든 글을 평평하게 분류한다
(`Arte Project Team`, `ROS2`, `Nav2`, `Database`, `study`, `개발환경`, `기타`).
사이드바와 `/projects` 페이지도 이 단일 목록을 그대로 보여준다. 다크 모드만 있고 라이트 모드는 없다.

## 목표

1. 카테고리를 **Project**(실제로 만드는 것) / **Study**(배우는 주제) 2개 대분류로 나누고,
   그 아래 기존 세부 카테고리를 그대로 유지한다.
2. 사이드바와 `/projects` 페이지에서 이 2단 구조가 보이게 한다.
3. 다크/라이트 모드 토글을 추가한다. 첫 방문 시 시스템 설정(`prefers-color-scheme`)을 따르고,
   사용자가 토글하면 그 선택을 기억한다.

## 데이터 모델

기존 글의 frontmatter는 건드리지 않는다. 대신 `lib/posts.ts`에 분류 테이블을 하나 추가한다:

```ts
export const PROJECT_CATEGORIES = ["Arte Project Team"];
// 여기 포함된 이름만 "project", 나머지는 전부 "study"
```

`ProjectSummary`에 `type: "project" | "study"` 필드를 추가하고, `getProjects()`가 이 값을 채워서 반환한다.
기존 `DECLARED_PROJECTS`(항상 목록 맨 앞에 표시)는 그대로 유지 — "표시 우선순위"와 "project/study 분류"는
서로 다른 관심사라 겹치지 않는다.

새 프로젝트가 생기면 `PROJECT_CATEGORIES` 배열에 이름만 추가하면 된다.

## 네비게이션

- **Sidebar** (`app/components/Sidebar.tsx`): 지금의 단일 "프로젝트별" 트리를 "PROJECT" / "STUDY" 두 그룹
  헤더(11px 대문자, 넓은 자간, 그룹 사이 여백)로 나누고, 그 아래 기존 카테고리별 `<details>` 트리를 유지한다.
  카테고리가 없는 그룹은 표시하지 않는다.
- **`/projects` 페이지**: 동일하게 "프로젝트" / "스터디" 두 섹션으로 나눠 카테고리 목록(이름+글 수)을 보여준다.
  `/projects/[name]` 개별 페이지는 변경 없음.

## 다크/라이트 모드

- `app/globals.css`의 `:root` 색상 변수(`--bg`, `--panel`, `--text` 등)는 이미 토큰화돼 있어 그대로 재사용.
  `[data-theme="light"]` 블록을 추가해 같은 변수들을 라이트 값으로 오버라이드한다.
  하드코딩된 `rgba(255,255,255,0.04)` 같은 호버 오버레이 값은 `--hover-overlay` 변수로 뽑아서 다크/라이트 각각 정의한다.
- `<html>`에 `data-theme` 속성을 붙이는 방식으로 전환한다.
- `Shell.tsx`에 있는 `rail-collapsed` localStorage 패턴과 동일하게, 새 `ThemeToggle` 클라이언트 컴포넌트가:
  - 첫 렌더 시 저장된 값이 없으면 `window.matchMedia("(prefers-color-scheme: dark)")`를 따르고,
  - 토글 클릭 시 `data-theme`을 바꾸고 localStorage(`theme` 키)에 저장한다.
- 토글 버튼은 사이드바의 기존 `rail-toggle`과 같은 자리 스타일(아이콘 버튼)로 추가한다.

## 영향받는 파일 (구현 단계에서 상세화)

- `lib/posts.ts` — `PROJECT_CATEGORIES`, `ProjectSummary.type`
- `lib/posts.test.ts` — `type` 분류 테스트 추가 (기존 순서/카운트 테스트는 그대로 통과해야 함)
- `app/components/Sidebar.tsx` — 2그룹 트리
- `app/projects/page.tsx` — 2섹션 목록
- `app/globals.css` — 라이트 테마 변수, 호버 오버레이 변수화
- `app/components/Shell.tsx` 또는 신규 `ThemeToggle.tsx` — 토글 로직
- `site/scripts/publish.sh`로 재빌드 후 repo 루트에 반영 (기존 배포 플로우 그대로)

## 비목표

- 글 frontmatter 스키마 변경 없음 (`project` 필드 그대로 사용)
- `/project`, `/study` 같은 별도 라우트/탭 추가 없음 — 사이드바·`/projects` 페이지 내 2단 그룹으로 충분
- `manage`/`api` 편집 기능 복원 없음 (이전 결정 유지: 정적 배포와 비호환)

## 구현 후 변경 (2026-07-04 후속)

- 홈/검색 요구사항이 추가로 나오면서 `2026-07-04-home-index-search-design.md`로 별도 스펙 분리.
- 구현 중 `.rail__manage`, `.mtable`, `.editor`, `.btn*` 등 삭제된 manage 기능의 죽은 CSS를 정리했고,
  `.prose p` 등에 남아있던 하드코딩 색상(`#d8d2c4`)을 라이트 모드에서 안 보이는 버그로 발견해 변수로 교체.
