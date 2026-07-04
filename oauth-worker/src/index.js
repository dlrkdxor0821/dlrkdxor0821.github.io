// 사이트 관리자 편집용 인증 + GitHub 콘텐츠 CRUD API.
// 비밀번호(ADMIN_PASSWORD)로 인증하고, GitHub 커밋은 GITHUB_PAT(Worker 시크릿)로 수행한다.
// 토큰은 브라우저에 절대 노출되지 않는다.

const REPO = "dlrkdxor0821/dlrkdxor0821.github.io";
const BRANCH = "main";
const DIR = "site/content";
const GROUPS_PATH = "site/data/groups.json";
const CATEGORIES_PATH = "site/data/categories.json";
const GH_API = "https://api.github.com";

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed =
    origin === "https://dlrkdxor0821.github.io" || /^http:\/\/localhost(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://dlrkdxor0821.github.io",
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-admin-password",
    "Access-Control-Max-Age": "86400",
  };
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json;charset=UTF-8", ...corsHeaders(request) },
  });
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToUtf8(b64) {
  const bin = atob(b64.replace(/\s/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function gh(env, path, opts = {}) {
  return fetch(`${GH_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${env.GITHUB_PAT}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "dlrkdxor0821-admin-worker",
      ...(opts.headers || {}),
    },
  });
}

function filePath(slug) {
  return `${DIR}/${slug}.md`;
}

async function getFile(env, slug) {
  const res = await gh(
    env,
    `/repos/${REPO}/contents/${encodeURI(filePath(slug))}?ref=${BRANCH}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { slug, sha: data.sha, raw: base64ToUtf8(data.content) };
}

async function listPosts(env) {
  const res = await gh(env, `/repos/${REPO}/contents/${encodeURI(DIR)}?ref=${BRANCH}`);
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  const items = await res.json();
  const mdFiles = items.filter((it) => it.type === "file" && it.name.endsWith(".md"));
  const posts = await Promise.all(
    mdFiles.map((it) => getFile(env, it.name.replace(/\.md$/, ""))),
  );
  return posts.filter(Boolean);
}

async function putFile(env, slug, content, sha) {
  const body = {
    message: `${sha ? "update" : "create"}: ${slug}`,
    content: utf8ToBase64(content),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;
  const res = await gh(env, `/repos/${REPO}/contents/${encodeURI(filePath(slug))}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content.sha;
}

async function deleteFile(env, slug, sha) {
  const res = await gh(env, `/repos/${REPO}/contents/${encodeURI(filePath(slug))}`, {
    method: "DELETE",
    body: JSON.stringify({ message: `delete: ${slug}`, sha, branch: BRANCH }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
}

async function getGroupsFile(env) {
  const res = await gh(env, `/repos/${REPO}/contents/${encodeURI(GROUPS_PATH)}?ref=${BRANCH}`);
  if (res.status === 404) return { groups: ["프로젝트", "스터디"], sha: null };
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  const data = await res.json();
  let groups = ["프로젝트", "스터디"];
  try {
    const parsed = JSON.parse(base64ToUtf8(data.content));
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) groups = parsed;
  } catch (e) {
    /* keep default */
  }
  return { groups, sha: data.sha };
}

async function putGroupsFile(env, groups, sha) {
  const body = {
    message: "update: groups",
    content: utf8ToBase64(JSON.stringify(groups, null, 2) + "\n"),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;
  const res = await gh(env, `/repos/${REPO}/contents/${encodeURI(GROUPS_PATH)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  return (await res.json()).content.sha;
}

async function getCategoriesFile(env) {
  const res = await gh(env, `/repos/${REPO}/contents/${encodeURI(CATEGORIES_PATH)}?ref=${BRANCH}`);
  if (res.status === 404) return { categories: [], sha: null };
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  const data = await res.json();
  let categories = [];
  try {
    const parsed = JSON.parse(base64ToUtf8(data.content));
    if (Array.isArray(parsed)) categories = parsed;
  } catch (e) {
    /* keep default */
  }
  return { categories, sha: data.sha };
}

async function putCategoriesFile(env, categories, sha) {
  const body = {
    message: "update: categories",
    content: utf8ToBase64(JSON.stringify(categories, null, 2) + "\n"),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;
  const res = await gh(env, `/repos/${REPO}/contents/${encodeURI(CATEGORIES_PATH)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  return (await res.json()).content.sha;
}

function authed(request, env) {
  return request.headers.get("x-admin-password") === env.ADMIN_PASSWORD;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    try {
      if (pathname === "/api/login" && request.method === "POST") {
        const { password } = await request.json().catch(() => ({}));
        if (password !== env.ADMIN_PASSWORD) return json(request, { error: "wrong password" }, 401);
        return json(request, { ok: true });
      }

      // 그룹 목록 (site/data/groups.json)
      if (pathname === "/api/groups") {
        if (!authed(request, env)) return json(request, { error: "unauthorized" }, 401);
        if (request.method === "GET") return json(request, await getGroupsFile(env));
        if (request.method === "PUT") {
          const { groups, sha } = await request.json();
          if (!Array.isArray(groups) || !groups.every((x) => typeof x === "string")) {
            return json(request, { error: "invalid groups" }, 400);
          }
          const newSha = await putGroupsFile(env, groups, sha);
          return json(request, { sha: newSha });
        }
      }

      // 카테고리 목록 (site/data/categories.json) — 선언된(빈 것 포함) 카테고리
      if (pathname === "/api/categories") {
        if (!authed(request, env)) return json(request, { error: "unauthorized" }, 401);
        if (request.method === "GET") return json(request, await getCategoriesFile(env));
        if (request.method === "PUT") {
          const { categories, sha } = await request.json();
          if (!Array.isArray(categories)) return json(request, { error: "invalid categories" }, 400);
          const newSha = await putCategoriesFile(env, categories, sha);
          return json(request, { sha: newSha });
        }
      }

      // 이하 모든 엔드포인트는 인증 필요
      if (pathname.startsWith("/api/posts")) {
        if (!authed(request, env)) return json(request, { error: "unauthorized" }, 401);

        // /api/posts
        if (pathname === "/api/posts") {
          if (request.method === "GET") return json(request, await listPosts(env));
        }

        // /api/posts/:slug
        const m = pathname.match(/^\/api\/posts\/(.+)$/);
        if (m) {
          const slug = decodeURIComponent(m[1]);
          if (request.method === "GET") {
            const post = await getFile(env, slug);
            return post ? json(request, post) : json(request, { error: "not found" }, 404);
          }
          if (request.method === "PUT") {
            const { content, sha } = await request.json();
            const newSha = await putFile(env, slug, content, sha);
            return json(request, { sha: newSha });
          }
          if (request.method === "DELETE") {
            const sha = url.searchParams.get("sha");
            await deleteFile(env, slug, sha);
            return json(request, { ok: true });
          }
        }
      }

      return json(request, { error: "not found" }, 404);
    } catch (error) {
      return json(request, { error: error.message }, 500);
    }
  },
};
