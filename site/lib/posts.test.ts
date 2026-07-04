import { describe, it, expect } from "vitest";
import path from "node:path";
import { getAllPosts, getPostBySlug, getProjects, getPostsByProject } from "./posts";

const FIXTURES = path.join(__dirname, "fixtures");

describe("getAllPosts", () => {
  it("날짜 내림차순으로 정렬한다", () => {
    const posts = getAllPosts(FIXTURES);
    expect(posts.map((p) => p.date)).toEqual(["2026-06-09", "2026-06-08", "2026-01-15"]);
  });

  it("frontmatter 메타를 읽는다", () => {
    const posts = getAllPosts(FIXTURES);
    const post = posts.find((p) => p.slug === "2026-06-09-login-bug-fix")!;
    expect(post.title).toBe("로그인 버그 수정");
    expect(post.project).toBe("auth앱");
    expect(post.tags).toEqual(["auth", "bugfix"]);
  });

  it("title 누락 시 파일명에서 제목을 유도한다", () => {
    const posts = getAllPosts(FIXTURES);
    const post = posts.find((p) => p.slug === "2026-06-08-no-meta")!;
    expect(post.title).toBe("no meta");
  });

  it("project 누락 시 '기타', tags 누락 시 빈 배열", () => {
    const posts = getAllPosts(FIXTURES);
    const post = posts.find((p) => p.slug === "2026-06-08-no-meta")!;
    expect(post.project).toBe("기타");
    expect(post.tags).toEqual([]);
  });

  it("date가 ISO(YYYY-MM-DD)가 아니면 파일명의 날짜로 폴백한다", () => {
    const posts = getAllPosts(FIXTURES);
    const post = posts.find((p) => p.slug === "2026-01-15-bad-date")!;
    expect(post.date).toBe("2026-01-15");
  });
});

describe("getPostBySlug", () => {
  it("본문을 HTML로 변환해 반환한다", () => {
    const post = getPostBySlug("2026-06-09-login-bug-fix", FIXTURES)!;
    expect(post).not.toBeNull();
    expect(post.contentHtml).toContain("리다이렉트");
    expect(post.contentHtml).toContain("<p");
  });

  it("존재하지 않는 slug는 null을 반환한다", () => {
    expect(getPostBySlug("nope", FIXTURES)).toBeNull();
  });
});

describe("projects", () => {
  it("프로젝트별 글 개수를 집계한다", () => {
    const projects = getProjects(FIXTURES);
    const auth = projects.find((p) => p.name === "auth앱")!;
    expect(auth.count).toBe(1);
    expect(projects.some((p) => p.name === "기타")).toBe(true);
  });

  it("특정 프로젝트의 글만 반환한다", () => {
    const posts = getPostsByProject("auth앱", FIXTURES);
    expect(posts).toHaveLength(1);
    expect(posts[0].slug).toBe("2026-06-09-login-bug-fix");
  });

  it("선언 프로젝트는 글이 없어도 목록 맨 앞에 선언 순서대로 나온다", () => {
    const projects = getProjects(FIXTURES);
    expect(projects.slice(0, 2).map((p) => p.name)).toEqual(["Arte Project Team", "ROS2"]);
    expect(projects[0].count).toBe(0);
  });

  it("선언되지 않은 프로젝트는 선언 프로젝트 뒤에 알파벳순으로 온다", () => {
    const projects = getProjects(FIXTURES);
    const rest = projects.slice(2).map((p) => p.name);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));
  });

  it("PROJECT_CATEGORIES에 있는 이름만 project로, 나머지는 study로 분류한다", () => {
    const projects = getProjects(FIXTURES);
    const arte = projects.find((p) => p.name === "Arte Project Team")!;
    const ros2 = projects.find((p) => p.name === "ROS2")!;
    expect(arte.type).toBe("project");
    expect(ros2.type).toBe("study");
  });
});
