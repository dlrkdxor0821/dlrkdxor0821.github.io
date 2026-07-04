# site — 개발 일지 (Next.js)

마크다운으로 쓰는 개발 일지를 카테고리(Project/Study)별로 보여주는 Next.js 사이트.
정적 export(`next build`)로 빌드되며, `main` push 시 GitHub Actions가 빌드해 GitHub Pages로 배포한다.

## 일지 쓰기 (두 가지 방법)

1. **웹 에디터** — 사이트 사이드바 하단 로그인 후 글쓰기/글 관리. GitHub에 자동 커밋됨.
2. **직접 파일 작성** — `content/` 폴더에 `YYYY-MM-DD-제목.md` 형식으로 파일을 만들고 frontmatter를 채웁니다:

```markdown
---
title: 로그인 버그 수정
date: 2026-06-09
project: auth앱
tags: [auth, bugfix]
---
본문...
```

이미지·영상은 Prismic Media Library에 올린 뒤(`scripts/prismic-upload.mjs` 참고) CDN 주소를 마크다운에 붙입니다.

## 개발

```bash
cd site
npm install
cp .env.example .env   # Prismic 토큰 입력 (선택 — 업로드 스크립트용)
npm run dev            # http://localhost:3000
```

## 배포

`main`에 push하면 `.github/workflows/deploy.yml`이 자동으로 `npm run build` 후 Pages에 배포합니다.
별도 스크립트 불필요.

## 보안

- `.env`는 절대 커밋하지 않습니다(.gitignore 등록됨).
- Prismic 토큰이 노출되면 즉시 폐기하고 재발급하세요.
