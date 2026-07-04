// 관리자 편집 API(인증 + GitHub 커밋)를 처리하는 Cloudflare Worker 주소.
export const API_BASE = "https://decap-cms-oauth-worker.leekt.workers.dev";

// group이 명시되지 않은 (예전) 글의 카테고리 그룹 폴백(클라이언트용).
// lib/posts.ts의 PROJECT_CATEGORIES와 동일하게 유지.
export const PROJECT_CATEGORY_NAMES = ["Arte Project Team"];

