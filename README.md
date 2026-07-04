# dlrkdxor0821.github.io

개발 일지 블로그. 소스는 `site/`(Next.js)에 있고, push하면 GitHub Actions가 빌드해서
GitHub Pages로 자동 배포한다.

## 구조

- `site/` — Next.js 사이트 소스 (개발/빌드는 여기서). 자세한 건 `site/README.md`.
- `oauth-worker/` — 관리자 편집용 인증 + GitHub 커밋 API (Cloudflare Worker).
- `.github/workflows/deploy.yml` — push 시 `site/` 빌드 → Pages 배포.
- `docs/` — 설계/계획 문서.

## 글 쓰기 (웹에서)

사이트 사이드바 하단 **로그인** → 비밀번호 입력 → **글쓰기 / 글 관리**로 작성·수정·삭제.
저장하면 GitHub에 자동 커밋되고, 1~2분 뒤 Actions 빌드가 끝나면 사이트에 반영된다.

## 로컬 개발

```bash
cd site
npm install
npm run dev   # http://localhost:3000
```

배포는 `main`에 push하면 자동(Actions). 별도 빌드/복사 스크립트 불필요.
