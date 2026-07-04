import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

export const CONTENT_DIR = path.join(process.cwd(), "content");

export type CategoryType = "project" | "study";

export interface PostMeta {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  project: string;
  group?: CategoryType; // frontmatter에 있으면 사용, 없으면 이름 기반 폴백
  tags: string[];
}

function formatDate(value: unknown, slug: string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value.trim())) {
    return value.trim().slice(0, 10);
  }
  const m = slug.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function titleFromSlug(slug: string): string {
  return slug.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ").trim();
}

function readPostMeta(dir: string, filename: string): PostMeta {
  const slug = filename.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(dir, filename), "utf8");
  const { data } = matter(raw);
  const group = data.group === "project" || data.group === "study" ? data.group : undefined;
  return {
    slug,
    title: typeof data.title === "string" && data.title.trim() ? data.title : titleFromSlug(slug),
    date: formatDate(data.date, slug),
    project: typeof data.project === "string" && data.project.trim() ? data.project : "기타",
    group,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
  };
}

export interface Post extends PostMeta {
  contentHtml: string;
}

export function getPostBySlug(slug: string, dir: string = CONTENT_DIR): Post | null {
  const filePath = path.join(dir, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const { content } = matter(raw);
  const meta = readPostMeta(dir, `${slug}.md`);
  return { ...meta, contentHtml: marked.parse(content, { async: false }) as string };
}

export interface RawPost extends PostMeta {
  body: string; // 원본 마크다운 본문 (HTML 변환 전 — 편집용)
}

export function getRawPost(slug: string, dir: string = CONTENT_DIR): RawPost | null {
  const filePath = path.join(dir, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const { content } = matter(raw);
  const meta = readPostMeta(dir, `${slug}.md`);
  return { ...meta, body: content.replace(/^\n+/, "") };
}

export function getAllPosts(dir: string = CONTENT_DIR): PostMeta[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => readPostMeta(dir, f))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export interface ProjectSummary {
  name: string;
  count: number;
  type: CategoryType;
}

// 글이 없어도 항상 목록에 표시되는 프로젝트 유형.
// 배열 순서가 곧 목록 맨 앞의 표시 순서다(선언되지 않은 프로젝트는 그 뒤에 알파벳순).
export const DECLARED_PROJECTS = ["Arte Project Team", "ROS2"];

// group이 명시되지 않은 (예전) 글의 이름 기반 폴백: 여기 없으면 "study".
export const PROJECT_CATEGORIES = ["Arte Project Team"];

export function categoryType(name: string): CategoryType {
  return PROJECT_CATEGORIES.includes(name) ? "project" : "study";
}

// 카테고리별 그룹(Project/Study): 해당 카테고리 글 중 group이 명시된 최신 글의 값을,
// 없으면 이름 기반 폴백을 쓴다. (getAllPosts는 최신순 정렬)
export function categoryGroups(dir: string = CONTENT_DIR): Map<string, CategoryType> {
  const map = new Map<string, CategoryType>();
  for (const post of getAllPosts(dir)) {
    if (!map.has(post.project) && post.group) map.set(post.project, post.group);
  }
  return map;
}

export function getProjects(dir: string = CONTENT_DIR): ProjectSummary[] {
  const counts = new Map<string, number>();
  for (const name of DECLARED_PROJECTS) counts.set(name, 0);
  for (const post of getAllPosts(dir)) {
    counts.set(post.project, (counts.get(post.project) ?? 0) + 1);
  }
  const groups = categoryGroups(dir);
  const groupOf = (name: string): CategoryType => groups.get(name) ?? categoryType(name);
  const declared = DECLARED_PROJECTS.map((name) => ({ name, count: counts.get(name) ?? 0, type: groupOf(name) }));
  const rest = [...counts.entries()]
    .filter(([name]) => !DECLARED_PROJECTS.includes(name))
    .map(([name, count]) => ({ name, count, type: groupOf(name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...declared, ...rest];
}

export function getPostsByProject(name: string, dir: string = CONTENT_DIR): PostMeta[] {
  return getAllPosts(dir).filter((post) => post.project === name);
}
