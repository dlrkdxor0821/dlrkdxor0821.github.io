# 커스텀 블로그 에디터 (사이트 통합 글 관리) Implementation Plan

> **For agentic workers:** 인라인 실행. 각 태스크 끝에 빌드/테스트/실제 API 검증.

**Goal:** 사이트 안에서(디자인 그대로) 비밀번호 로그인 후 글쓰기·수정·삭제를 하면 GitHub에 자동 커밋되고 GitHub Actions가 자동 배포하는 통합 편집 시스템.

**Architecture:** (1) Cloudflare Worker를 "인증 + GitHub 콘텐츠 CRUD" JSON API로 재작성(비밀번호는 Worker 시크릿 `ADMIN_PASSWORD`, 커밋은 Worker 시크릿 `GITHUB_PAT`로 수행 — 토큰은 브라우저에 절대 노출 안 됨). (2) Next.js 사이트에 `/manage` 편집 페이지 + 사이드바 로그인 UI 추가(사이트 디자인 그대로). (3) `.github/workflows/deploy.yml`로 push마다 `site/` 빌드→Pages 배포. Pages 소스를 legacy(branch)에서 workflow로 전환하고, repo 루트의 빌드 산출물은 제거(이제 CI가 빌드).

**Tech Stack:** Next.js 14 static export, Cloudflare Workers, GitHub Contents API, GitHub Actions Pages.

## Global Constraints

- 저장소: `dlrkdxor0821/dlrkdxor0821.github.io`, 브랜치 `main`, 콘텐츠 경로 `site/content/`.
- Worker 주소: `https://decap-cms-oauth-worker.leekt.workers.dev` (기존 배포 재사용).
- 비밀 값은 코드/깃에 절대 넣지 않음. `ADMIN_PASSWORD`, `GITHUB_PAT`는 Worker 시크릿(이미 등록됨). 안 쓰는 `GITHUB_CLIENT_SECRET`은 남겨둬도 무방.
- 파일명 규칙 `YYYY-MM-DD-<slug>.md`, frontmatter: `title`, `date`(YYYY-MM-DD), `project`, `tags`(블록 리스트).
- 정적 export 유지(`output: "export"` in production). `/manage`는 런타임 클라이언트 페이지(빌드 시점 데이터 불필요).

---

## File Structure

- `site/lib/markdown.ts` — 순수 함수: `parseMarkdown`, `buildMarkdown`, `slugify`, `makeSlug`. (테스트 대상)
- `site/lib/markdown.test.ts` — 단위 테스트.
- `site/lib/adminConfig.ts` — `API_BASE` 상수.
- `site/app/components/AdminContext.tsx` — 로그인 상태 컨텍스트(`useAdmin`), sessionStorage, `api()` 헬퍼.
- `site/app/components/Shell.tsx` — AdminProvider로 사이드바+children 감쌈. AdminButton 제거.
- `site/app/components/Sidebar.tsx` — 하단 인증 섹션(로그인 링크 / 로그인 시 글쓰기·글관리·로그아웃).
- `site/app/manage/page.tsx` — 로그인 게이트 + 목록/에디터 오케스트레이션(클라이언트).
- `site/app/components/PostEditor.tsx` — 글쓰기/수정 폼.
- `site/app/components/PostList.tsx` — 글 목록 + 삭제.
- `oauth-worker/src/index.js` — 인증 + CRUD JSON API로 재작성.
- `.github/workflows/deploy.yml` — 빌드+Pages 배포.
- 삭제: `site/public/admin/`(Decap), `site/app/components/AdminButton.tsx`, `site/scripts/publish.sh`, repo 루트 빌드 산출물.

---

### Task 1: markdown 순수 함수 + 테스트

**Files:** Create `site/lib/markdown.ts`, `site/lib/markdown.test.ts`

**Produces:**
- `parseMarkdown(raw: string): PostFields`
- `buildMarkdown(f: PostFields): string`
- `slugify(title: string): string`
- `makeSlug(date: string, title: string): string`
- `interface PostFields { title; date; project; tags: string[]; body }`

핵심: 블록 태그(`- item`)와 인라인(`[a,b]`) 둘 다 파싱, 한글 slug 보존, 특수문자 title은 빌드 시 안전 인용. `parseMarkdown(buildMarkdown(x))` 라운드트립 보존.

검증: `npm test` (신규 테스트 통과 + 기존 14개 유지).

### Task 2: Worker를 인증 + CRUD API로 재작성 → 배포 → 실제 curl 검증

**Files:** Rewrite `oauth-worker/src/index.js`

**Endpoints:** CORS(OPTIONS 포함, origin=github.io/localhost 허용). 인증 헤더 `x-admin-password`.
- `POST /api/login` `{password}` → 200 `{ok:true}` / 401
- `GET /api/posts` → `[{slug, sha, raw}]` (디렉터리 목록 + 각 파일 content, 병렬)
- `GET /api/posts/:slug` → `{slug, sha, raw}`
- `PUT /api/posts/:slug` `{content, sha?}` → 커밋(create/update) → `{sha}`
- `DELETE /api/posts/:slug?sha=..` → 커밋(delete) → `{ok:true}`

UTF-8 base64 헬퍼(한글). GitHub Contents API 사용, `Bearer ${GITHUB_PAT}`.

검증: `wrangler deploy` 후 curl로 login(정답/오답), posts 목록(기존 글 수 확인), 임시 글 create→gh api로 커밋 확인→update→delete→gh api로 삭제 확인.

### Task 3: 사이트 인증 컨텍스트 + 사이드바 로그인 UI

**Files:** Create `site/lib/adminConfig.ts`, `site/app/components/AdminContext.tsx`; Modify `Shell.tsx`(Provider 래핑, AdminButton 제거), `Sidebar.tsx`(하단 인증 섹션).

평소: 사이드바 하단에 "로그인" 링크만. 로그인 후: "✍ 글쓰기"(→`/manage?new=1`), "🗂 글 관리"(→`/manage`), "로그아웃". 상단 우측 열쇠/글쓰기 아이콘 제거(검색·테마 토글은 유지).

검증: 빌드 성공, DOM에 로그인 링크 존재, 열쇠 버튼 없음.

### Task 4: /manage 편집 페이지 (로그인 게이트 + 목록 + 에디터)

**Files:** Create `site/app/manage/page.tsx`, `site/app/components/PostEditor.tsx`, `site/app/components/PostList.tsx`; globals.css에 에디터 스타일.

- 미로그인 → 비밀번호 폼(사이트 디자인). 로그인 → 목록. `?new=1` → 빈 에디터. `?slug=` → 해당 글 로드.
- 에디터: 제목·날짜·카테고리(datalist)·태그(쉼표)·본문(textarea + marked 미리보기). "저장" → 커밋. 신규는 slug 생성.
- 목록: 제목·날짜·카테고리, 수정/삭제.

검증: 빌드+정적 서버, `/manage` 200, 로그인 폼 렌더.

### Task 5: GitHub Actions 배포 워크플로

**Files:** Create `.github/workflows/deploy.yml`

push(main)/dispatch → setup-node 20 → `npm ci`+`npm run build`(working-dir site) → upload-pages-artifact(site/out) → deploy-pages. permissions: pages write, id-token write.

### Task 6: repo 정리 + Pages 소스 전환

- `git rm -r` 루트 빌드 산출물(404.html,index.html,index.txt,logs/,projects/,projects.*,search.*,_next/,.nojekyll,admin/).
- 삭제: `site/public/admin/`, `site/app/components/AdminButton.tsx`, `site/scripts/publish.sh`.
- README 갱신(배포=push, 로컬=npm run dev).
- `gh api --method PUT repos/.../pages -f build_type=workflow`.

### Task 7: 전체 커밋·푸시 → Actions 배포 검증 → 라이브 e2e

push → Actions run 성공 확인 → 라이브 홈/글/`/manage` 200 → curl로 실제 글 create→라이브 반영 확인→delete. 완벽할 때까지 반복.

---

## Self-Review

- 스펙 커버리지: 로그인 게이트(T3,T4)/글쓰기·수정·삭제(T2,T4)/자동 커밋(T2)/자동 배포(T5,T6)/사이트 디자인 통합(T3,T4)/평소 숨김(T3) — 모두 태스크 존재.
- 비밀값: 코드/깃 미포함(Worker 시크릿). ✓
- 타입 일관성: `PostFields`/`api()`/엔드포인트 경로 태스크 간 일치. ✓
