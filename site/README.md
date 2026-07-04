# site — 개발 일지 (Next.js)

마크다운으로 쓰는 개발 일지를 "일별 일지 / 프로젝트" 두 탭으로 보여주는 Next.js 사이트.
정적 export로 빌드되어 저장소 루트(`../`)에 배포되며, GitHub Pages(`dlrkdxor0821.github.io`)가 그걸 서빙한다.

## 일지 쓰기

`content/` 폴더에 `YYYY-MM-DD-제목.md` 형식으로 파일을 만들고 frontmatter를 채웁니다:

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

```bash
cd site
./scripts/publish.sh   # next build (static export) 후 결과물을 repo 루트로 복사
```

이후 루트에서 변경사항을 커밋·푸시하면 GitHub Pages에 반영됩니다.

## 보안

- `.env`는 절대 커밋하지 않습니다(.gitignore 등록됨).
- Prismic 토큰이 노출되면 즉시 폐기하고 재발급하세요.
