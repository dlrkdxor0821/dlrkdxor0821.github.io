#!/usr/bin/env node
// Prismic Media Library 업로더
// 사용: node scripts/prismic-upload.mjs <절대경로파일> [추가파일...]
// .env(PRISMIC_REPOSITORY_NAME, PRISMIC_ACCESS_TOKEN)에서 자격증명을 읽어
// 파일을 Prismic Asset API에 업로드하고 CDN URL을 출력한다.
// 토큰 값은 절대 출력하지 않는다.

import fs from "node:fs";
import path from "node:path";

const ASSET_API = "https://asset-api.prismic.io/assets";

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("ERROR: 업로드할 파일의 절대경로를 인자로 주세요.");
    process.exit(2);
  }

  // .env(현재 작업 디렉터리) → 없으면 process.env 로 폴백
  const env = { ...loadEnv(path.join(process.cwd(), ".env")), ...process.env };
  // Prismic 저장소 ID는 항상 소문자 — 입력이 대문자여도 맞춰준다
  const repo = (env.PRISMIC_REPOSITORY_NAME || "").trim().toLowerCase();
  const token = (env.PRISMIC_ACCESS_TOKEN || "").trim();

  if (!repo || !token) {
    console.error(
      "ERROR: Prismic 자격증명이 없습니다. .env 에 다음을 채워주세요:\n" +
        "  PRISMIC_REPOSITORY_NAME=<저장소이름>\n" +
        "  PRISMIC_ACCESS_TOKEN=<재발급한 토큰>\n" +
        "(토큰은 절대 커밋되지 않습니다 — .env 는 .gitignore 대상)"
    );
    process.exit(3);
  }

  let failed = 0;
  for (const f of files) {
    const abs = path.resolve(f);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      console.error(`SKIP  파일 없음: ${abs}`);
      failed++;
      continue;
    }
    const name = path.basename(abs);
    try {
      const fd = new FormData();
      fd.append("file", new Blob([fs.readFileSync(abs)]), name);

      const res = await fetch(ASSET_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          repository: repo,
          Accept: "application/json",
        },
        body: fd,
      });

      const body = await res.text();
      if (!res.ok) {
        console.error(`FAIL  ${name} → HTTP ${res.status} ${res.statusText}: ${body.slice(0, 300)}`);
        failed++;
        continue;
      }
      const json = JSON.parse(body);
      // 한 줄: "URL<TAB>파일명" — 호출부가 파싱하기 쉽게
      console.log(`${json.url}\t${name}`);
    } catch (e) {
      console.error(`FAIL  ${name} → ${e.message}`);
      failed++;
    }
  }
  process.exit(failed > 0 ? 1 : 0);
}

main();
