# 웹 관리자 편집 (Decap CMS + GitHub 백엔드)

## 배경

지금은 글을 쓰려면 로컬에서 `content/*.md` 파일을 직접 만들어야 한다. 웹에서 로그인해서 글을 쓰고 저장하면
바로 GitHub에 커밋되고 GitHub Pages가 재배포하는 흐름을 원한다. GitHub Pages는 정적 호스팅이라 서버 코드를
못 돌리므로, Decap CMS(오픈소스, 정적 admin UI + GitHub API로 직접 커밋)를 쓰고, GitHub OAuth 토큰 교환만
처리하는 작은 프록시를 Cloudflare Worker로 둔다. Worker는 상시 가동 서버가 아니라 요청 시에만 실행되는
서버리스라 개인 블로그 트래픽으로는 무료 범위 안에서 충분하다.

## 목표

1. `/admin`에서 GitHub 계정으로 로그인해 글을 새로 쓰거나 수정하면 `main`에 바로 커밋된다.
2. 커밋 시 기존 파일명 규칙(`YYYY-MM-DD-제목.md`)과 frontmatter 스키마(title/date/project/tags)를 그대로 따른다.
3. 별도 서버 운영 없이(서버리스 프록시 + 정적 admin UI만) 동작한다.

## 아키텍처

**Cloudflare Worker (`oauth-worker/`, 별도 리포/배포)**
- `GET /auth`: GitHub OAuth authorize URL로 302 리다이렉트. `redirect_uri`는 이 Worker 자신의 `/callback`.
- `GET /callback?code=...`: code를 `https://github.com/login/oauth/access_token`에 교환해 access token을 받고,
  아래 HTML을 응답한다 (Decap의 공식 postMessage 핸드셰이크 — `i40west/netlify-cms-cloudflare-pages` 구현 확인):
  1. 로드 즉시 `window.opener.postMessage("authorizing:github", "*")` 전송
  2. opener로부터 응답 메시지를 받으면, 그 메시지의 origin으로 `authorization:github:success:{"token":...,"provider":"github"}` 전송
- 환경변수: `GITHUB_CLIENT_ID`(평문 var), `GITHUB_CLIENT_SECRET`(`wrangler secret put`으로 암호화 등록)

**Decap CMS admin (`site/public/admin/`)**
- `index.html`: decap-cms 스크립트 로드하는 최소 HTML
- `config.yml`:
  ```yaml
  backend:
    name: github
    repo: dlrkdxor0821/dlrkdxor0821.github.io
    branch: main
    base_url: <worker 배포 주소>
    auth_endpoint: /auth
  media_folder: site/public/uploads
  public_folder: /uploads
  collections:
    - name: posts
      label: 개발 일지
      folder: site/content
      create: true
      slug: '{{fields.date}}-{{slug}}'
      fields:
        - { label: 제목, name: title, widget: string }
        - { label: 날짜, name: date, widget: datetime, format: 'YYYY-MM-DD', time_format: false, date_format: 'YYYY-MM-DD' }
        - { label: 프로젝트, name: project, widget: string, default: 기타 }
        - { label: 태그, name: tags, widget: list, default: [] }
        - { label: 본문, name: body, widget: markdown }
  ```
- `site/public/`은 Next.js가 그대로 export 결과물 루트로 복사하므로 `publish.sh` 변경 불필요.
- `folder: site/content`는 리포 루트 기준 경로 — Decap이 GitHub Contents API로 직접 읽고 쓰기 때문에
  빌드 결과물이 아니라 소스 트리 경로를 가리켜야 한다.
- `slug: '{{fields.date}}-{{slug}}'`는 관리자가 입력한 `date` 필드 값을 그대로 파일명에 써서, 글 작성일이 아니라
  선택한 날짜로 파일명이 만들어지게 한다 (기존 파일명 규칙과 일치).

## 사용자가 직접 해야 하는 단계 (대행 불가)

1. GitHub → Settings → Developer settings → OAuth Apps에서 새 앱 등록
   - Homepage URL: `https://dlrkdxor0821.github.io`
   - Authorization callback URL: `https://<worker-subdomain>.workers.dev/callback`
2. `cd oauth-worker && wrangler deploy`
3. `wrangler secret put GITHUB_CLIENT_SECRET` (값 입력), `GITHUB_CLIENT_ID`는 `wrangler.toml`의 `vars`에 평문으로 등록
4. 실제 배포된 Worker 주소를 `site/public/admin/config.yml`의 `base_url`에 반영

## 보안/권한

- Decap의 GitHub 백엔드는 발급된 토큰으로 GitHub API를 호출하므로, 이 저장소에 write 권한이 있는 GitHub 계정만
  실제로 커밋할 수 있다 — 별도 allowlist 불필요, GitHub 저장소 권한이 곧 접근 제어.
- `GITHUB_CLIENT_SECRET`은 Worker 시크릿에만 있고 클라이언트(브라우저)에는 절대 노출되지 않는다.

## 비목표

- 이미지 업로드 위젯을 통한 미디어 관리 없음 — 기존처럼 Prismic에 올린 뒤 CDN 링크를 본문에 직접 붙여넣는 방식 유지.
- PR 기반 초안/리뷰 워크플로 없음 — 저장 시 `main`에 바로 커밋.
- 글 삭제 UI는 Decap 기본 기능(엔트리 삭제 버튼)을 그대로 사용 — 별도 커스터마이징 없음.
