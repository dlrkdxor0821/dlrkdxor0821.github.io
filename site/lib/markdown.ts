// content/*.md 의 frontmatter를 파싱·생성하는 순수 함수. 클라이언트 에디터에서 사용.
// lib/posts.ts(빌드 시 gray-matter)와 같은 파일 포맷을 다루되, 브라우저에서 동작하도록 의존성 없이 구현.

export type CategoryGroup = "project" | "study";

export interface PostFields {
  title: string;
  date: string; // YYYY-MM-DD
  project: string;
  group?: CategoryGroup; // Project / Study 대분류. 없으면 lib/posts의 이름 기반 폴백.
  tags: string[];
  body: string;
}

function unquote(s: string): string {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).replace(/\\"/g, '"');
  }
  return s;
}

// YAML plain scalar로 안전하지 않으면 큰따옴표로 감싼다.
function yamlScalar(v: string): string {
  if (
    v === "" ||
    /[:#[\]{}]/.test(v) ||
    /^[\s!&*>|@`"'%-]/.test(v) ||
    /\s$/.test(v)
  ) {
    return JSON.stringify(v);
  }
  return v;
}

export function parseMarkdown(raw: string): PostFields {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const fm = m ? m[1] : "";
  const body = (m ? m[2] : raw).replace(/^\r?\n+/, "").replace(/\s+$/, "");
  const fields: PostFields = { title: "", date: "", project: "", tags: [], body };

  const lines = fm.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([a-zA-Z]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const val = kv[2];

    if (key === "tags") {
      if (val.trim().startsWith("[")) {
        fields.tags = val
          .trim()
          .replace(/^\[|\]$/g, "")
          .split(",")
          .map((s) => unquote(s.trim()))
          .filter(Boolean);
      } else {
        const tags: string[] = [];
        for (let j = i + 1; j < lines.length; j++) {
          const t = lines[j].match(/^\s*-\s*(.*)$/);
          if (!t) break;
          tags.push(unquote(t[1].trim()));
        }
        fields.tags = tags.filter(Boolean);
      }
    } else if (key === "title") {
      fields.title = unquote(val);
    } else if (key === "date") {
      fields.date = unquote(val).slice(0, 10);
    } else if (key === "project") {
      fields.project = unquote(val);
    } else if (key === "group") {
      const g = unquote(val);
      if (g === "project" || g === "study") fields.group = g;
    }
  }
  return fields;
}

export function buildMarkdown(f: PostFields): string {
  const lines = [
    "---",
    `title: ${yamlScalar(f.title)}`,
    `date: ${f.date}`,
    `project: ${yamlScalar(f.project)}`,
  ];
  if (f.group === "project" || f.group === "study") lines.push(`group: ${f.group}`);
  if (f.tags.length === 0) {
    lines.push("tags: []");
  } else {
    lines.push("tags:");
    for (const t of f.tags) lines.push(`  - ${yamlScalar(t)}`);
  }
  lines.push("---", "", f.body.replace(/^\n+/, "").replace(/\s+$/, ""), "");
  return lines.join("\n");
}

export function slugify(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^0-9a-z가-힣]+/g, "-")
      .replace(/^-+|-+$/g, "") || "post"
  );
}

export function makeSlug(date: string, title: string): string {
  return `${date}-${slugify(title)}`;
}
